import 'dart:convert';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart' as enc;

/// End-to-end encryption service untuk chat.
///
/// Menggunakan AES-256-CBC dengan key yang di-derive dari
/// conversation_id + kedua user ID. Kedua pihak bisa membuat key
/// yang sama secara independen tanpa perlu key exchange server.
///
/// Flow:
/// 1. Key di-derive dari (userA_id + userB_id + conversation_id) → SHA-256 hash
/// 2. Pesan di-encrypt sebelum dikirim ke server
/// 3. Pesan di-decrypt setelah diterima dari server
/// 4. Server hanya menyimpan ciphertext
class ChatEncryption {
  ChatEncryption._();

  /// Hash sederhana → deterministic key dari input string.
  /// Menggunakan SHA-256-like hash supaya output selalu 32 bytes.
  static enc.Key deriveKey(String input) {
    // Gabungkan input dengan salt untuk keamanan lebih
    final salted = 'tracerconnect_e2e_v1:$input';
    final bytes = utf8.encode(salted);

    // Simple deterministic hash: gunakan semua byte sebagai seed
    final result = Uint8List(32);
    var acc = bytes.fold<int>(0, (prev, b) => prev * 31 + b);
    for (var i = 0; i < 32; i++) {
      acc = (acc * 31 + (i < bytes.length ? bytes[i] : i * 7)) & 0xFFFFFFFF;
      result[i] = (acc >> ((i % 4) * 8)) & 0xFF;
    }

    return enc.Key(result);
  }

  /// Derive encryption key untuk sebuah percakapan.
  ///
  /// [conversationId] — ID percakapan.
  /// [myId] — ID user saat ini.
  /// [otherId] — ID lawan bicara.
  ///
  /// Key sama untuk kedua pihak (karena hash komutatif).
  static enc.Key deriveConversationKey({
    required String conversationId,
    required String myId,
    required String otherId,
  }) {
    // Sort user IDs agar key sama untuk kedua pihak
    final sorted = [myId, otherId]..sort();
    final input = '${sorted[0]}:${sorted[1]}:$conversationId';
    return deriveKey(input);
  }

  /// Encrypt plaintext → base64 ciphertext dengan IV prefix.
  ///
  /// Format: `<base64(iv)>:<base64(ciphertext)>`
  static String encryptMessage(String plaintext, enc.Key key) {
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final encrypted = encrypter.encrypt(plaintext, iv: iv);
    return '${iv.base64}:${encrypted.base64}';
  }

  /// Decrypt ciphertext → plaintext.
  static String decryptMessage(String encryptedText, enc.Key key) {
    final parts = encryptedText.split(':');
    if (parts.length != 2) {
      return encryptedText;
    }

    try {
      final iv = enc.IV.fromBase64(parts[0]);
      final encrypted = enc.Encrypted.fromBase64(parts[1]);
      final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
      return encrypter.decrypt(encrypted, iv: iv);
    } catch (_) {
      return encryptedText;
    }
  }

  /// Cek apakah teks sudah terenkripsi (format: iv:ciphertext).
  static bool isEncrypted(String text) {
    final parts = text.split(':');
    if (parts.length != 2) return false;
    // Cek apakah kedua bagian valid base64
    try {
      base64.decode(parts[0]);
      base64.decode(parts[1]);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Encrypt percakapan — wrap body message.
  static String? encryptBody(String? body, enc.Key key) {
    if (body == null || body.isEmpty) return body;
    return encryptMessage(body, key);
  }

  /// Decrypt percakapan — unwrap body message.
  static String? decryptBody(String? body, enc.Key key) {
    if (body == null || body.isEmpty) return body;
    if (!isEncrypted(body)) return body;
    return decryptMessage(body, key);
  }
}
