import 'dart:async';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/chat.dart';
import 'chat_providers.dart';
import 'chat_repository.dart';

/// State untuk satu layar percakapan. `messages` selalu dalam urutan
/// kronologis (lama → baru) sehingga ListView bisa dirender apa adanya.
class ChatMessagesState {
  final List<ChatMessage> messages;
  final bool hasMoreOlder;
  final bool loadingOlder;
  final bool loadingInitial;
  final bool initialError;
  final String? oldestCursor;
  final String? newestCursor;

  const ChatMessagesState({
    this.messages = const [],
    this.hasMoreOlder = true,
    this.loadingOlder = false,
    this.loadingInitial = true,
    this.initialError = false,
    this.oldestCursor,
    this.newestCursor,
  });

  ChatMessagesState copyWith({
    List<ChatMessage>? messages,
    bool? hasMoreOlder,
    bool? loadingOlder,
    bool? loadingInitial,
    bool? initialError,
    String? oldestCursor,
    bool clearOldestCursor = false,
    String? newestCursor,
    bool clearNewestCursor = false,
  }) {
    return ChatMessagesState(
      messages: messages ?? this.messages,
      hasMoreOlder: hasMoreOlder ?? this.hasMoreOlder,
      loadingOlder: loadingOlder ?? this.loadingOlder,
      loadingInitial: loadingInitial ?? this.loadingInitial,
      initialError: initialError ?? this.initialError,
      oldestCursor: clearOldestCursor ? null : (oldestCursor ?? this.oldestCursor),
      newestCursor: clearNewestCursor ? null : (newestCursor ?? this.newestCursor),
    );
  }
}

/// Mengelola pesan sebuah percakapan:
/// - tampilkan cache lokal instan, lalu perbarui dari server di background;
/// - polling delta (hanya pesan baru) tiap 3 detik sebagai pengganti WebSocket
///   yang tidak tersedia di shared hosting (InfinityFree);
/// - optimistic UI saat kirim + retry saat gagal;
/// - pagination ke atas (load older) dengan cursor stabil.
class ChatMessagesNotifier extends FamilyNotifier<ChatMessagesState, String> {
  Timer? _timer;
  bool _disposed = false;

  @override
  ChatMessagesState build(String conversationId) {
    ref.onDispose(() {
      _timer?.cancel();
      _disposed = true;
    });
    _init(conversationId);
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _pollNew(conversationId));
    return const ChatMessagesState();
  }

  ChatRepository get _repo => ref.read(chatRepositoryProvider);

  /// Hilangkan duplikat berdasarkan id, pertahankan urutan pertama.
  List<ChatMessage> _dedupe(List<ChatMessage> list) {
    final seen = <String>{};
    final out = <ChatMessage>[];
    for (final m in list) {
      if (m.id.isEmpty || seen.contains(m.id)) continue;
      seen.add(m.id);
      out.add(m);
    }
    return out;
  }

  Future<void> _init(String conversationId) async {
    // 1) Cache lokal → tampilan instan.
    final cached = await _repo.getCachedMessages(conversationId);
    if (!_disposed && cached != null && cached.isNotEmpty) {
      state = state.copyWith(
        messages: _dedupe(cached.reversed.toList()),
        loadingInitial: false,
        oldestCursor: cached.last.id,
        newestCursor: cached.first.id,
        hasMoreOlder: true,
      );
    }

    // 2) Ambil dari server di background.
    try {
      final page = await _repo.messages(conversationId);
      if (_disposed) return;
      final chrono = page.items.reversed.toList();
      state = state.copyWith(
        messages: _dedupe(chrono),
        hasMoreOlder: page.meta.hasMoreOlder,
        oldestCursor: page.meta.oldestCursor,
        newestCursor: page.meta.newestCursor,
        loadingInitial: false,
        initialError: false,
      );
      await _repo.markRead(conversationId);
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (!_disposed && state.messages.isEmpty) {
        state = state.copyWith(loadingInitial: false, initialError: true);
      }
    }
  }

  /// Muat ulang pesan awal (retry setelah error).
  Future<void> loadInitial(String conversationId) async {
    state = state.copyWith(loadingInitial: true, initialError: false);
    try {
      final page = await _repo.messages(conversationId);
      if (_disposed) return;
      final chrono = page.items.reversed.toList();
      state = state.copyWith(
        messages: _dedupe(chrono),
        hasMoreOlder: page.meta.hasMoreOlder,
        oldestCursor: page.meta.oldestCursor,
        newestCursor: page.meta.newestCursor,
        loadingInitial: false,
        initialError: false,
      );
      await _repo.markRead(conversationId);
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (!_disposed) {
        state = state.copyWith(loadingInitial: false, initialError: true);
      }
    }
  }

  /// Muat pesan lama (lebih lama) di bagian atas percakapan.
  Future<void> loadOlder(String conversationId) async {
    if (state.loadingOlder || !state.hasMoreOlder || state.oldestCursor == null) {
      return;
    }
    state = state.copyWith(loadingOlder: true);
    try {
      final page = await _repo.messages(conversationId, before: state.oldestCursor);
      if (_disposed) return;
      final chrono = page.items.reversed.toList();
      state = state.copyWith(
        messages: _dedupe([...chrono, ...state.messages]),
        hasMoreOlder: page.meta.hasMoreOlder,
        oldestCursor: page.meta.oldestCursor ?? state.oldestCursor,
        loadingOlder: false,
      );
    } catch (_) {
      if (!_disposed) state = state.copyWith(loadingOlder: false);
    }
  }

  /// Poll pesan baru sejak [state.newestCursor]. Hanya mengunduh delta.
  Future<void> _pollNew(String conversationId) async {
    if (_disposed || state.newestCursor == null) return;
    try {
      final page = await _repo.messages(conversationId, after: state.newestCursor);
      if (_disposed || page.items.isEmpty) return;

      final hasIncoming = page.items.any((m) => !m.isMine);
      state = state.copyWith(
        messages: _dedupe([...state.messages, ...page.items]),
        newestCursor: page.meta.newestCursor ?? state.newestCursor,
      );
      // Simpan cache (newest-first, sesuai format awal).
      await _repo.cacheMessages(conversationId, state.messages.reversed.toList());

      if (hasIncoming) {
        // Tandai sebagai dibaca (update unread count), tapi JANGAN invalidate
        // conversationsProvider di sini — list akan merefresh saat user kembali
        // ke halaman daftar (StreamProvider), sehingga kita tidak membebani
        // worker PHP shared hosting tiap kali ada pesan masuk.
        await _repo.markRead(conversationId);
      }
    } catch (_) {
      // Transient error — pertahankan data terakhir.
    }
  }

  /// Kirim pesan dengan optimistic UI. Bubble langsung tampil (status
  /// 'sending'), lalu diganti dengan pesan asli dari server saat berhasil,
  /// atau ditandai 'failed' bila gagal (bisa di-retry).
  Future<void> send(
    String conversationId, {
    required String type,
    String? body,
    File? attachment,
    String? attachmentName,
  }) async {
    final tempId =
        'opt_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
    final optimistic = ChatMessage(
      id: tempId,
      conversationId: conversationId,
      senderId: null,
      type: type,
      body: body,
      attachment: attachment != null
          ? ChatAttachment(name: attachmentName, mime: '', size: 0, url: '')
          : null,
      isDeleted: false,
      isMine: true,
      createdAt: DateTime.now().toIso8601String(),
      status: 'sending',
    );

    state = state.copyWith(messages: [...state.messages, optimistic]);

    try {
      final real = await _repo.sendMessage(
        conversationId,
        type: type,
        body: body,
        attachment: attachment,
      );
      if (_disposed) return;
      state = state.copyWith(
        messages: state.messages.map((m) => m.id == tempId ? real : m).toList(),
        newestCursor: real.id,
      );
      await _repo.cacheMessages(conversationId, state.messages.reversed.toList());
      ref.invalidate(conversationsProvider);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(
        messages: state.messages
            .map((m) => m.id == tempId ? m.copyWith(status: 'failed') : m)
            .toList(),
      );
    }
  }

  /// Ulangi pengiriman pesan yang gagal. Lampiran tidak bisa di-retry karena
  /// file asli tidak disimpan; untuk teks cukup kirim ulang dari body.
  Future<void> retry(String conversationId, String tempId) async {
    final msg = state.messages.where((m) => m.id == tempId).firstOrNull;
    if (msg == null) return;
    state = state.copyWith(
      messages: state.messages.where((m) => m.id != tempId).toList(),
    );
    if (msg.type == 'text') {
      await send(conversationId, type: 'text', body: msg.body);
    }
  }

  /// Tandai pesan sebagai dihapus secara lokal setelah soft-delete di server.
  void markDeleted(String id) {
    state = state.copyWith(
      messages: state.messages
          .map((m) => m.id == id
              ? m.copyWith(isDeleted: true, body: null, attachment: null)
              : m)
          .toList(),
    );
  }
}
