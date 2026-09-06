import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:pointycastle/export.dart';

/// Dio interceptor that bypasses the InfinityFree / FreeHosting anti-bot
/// JavaScript challenge.
///
/// When the server returns the JS challenge page (instead of JSON), this
/// interceptor:
/// 1. Parses the AES-CBC ciphertext, key, and IV from the inline JS.
/// 2. Decrypts to obtain the `__test` cookie value.
/// 3. Stores the cookie and retries the original request.
class AntiBotInterceptor extends Interceptor {
  /// Cookie name used by the anti-bot protection.
  static const String _cookieName = '__test';

  /// Memoised cookie value so we only solve the challenge once per session.
  String? _cachedCookie;

  /// Simple in-flight dedup: when multiple requests hit the challenge at
  /// the same time, only the first one computes the cookie; the rest wait.
  Future<void>? _pendingChallenge;

  /// Pattern: var a=toNumbers("..."),b=toNumbers("..."),c=toNumbers("...")
  static final RegExp _paramsRe = RegExp(
    r'''var\s+a\s*=\s*toNumbers\s*\(\s*["']([0-9a-f]+)["']\s*\)'''
    r''',\s*b\s*=\s*toNumbers\s*\(\s*["']([0-9a-f]+)["']\s*\)'''
    r''',\s*c\s*=\s*toNumbers\s*\(\s*["']([0-9a-f]+)["']\s*\)''',
    caseSensitive: false,
  );

  // ---- Interceptor hooks ---------------------------------------------------

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Attach the cached cookie if we already solved the challenge.
    if (_cachedCookie != null && _cachedCookie!.isNotEmpty) {
      options.headers['Cookie'] = '$_cookieName=$_cachedCookie';
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (_isChallenge(response)) {
      _handleChallenge(response, handler);
    } else {
      handler.next(response);
    }
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Some Dio versions surface the challenge as an error (non-JSON parse).
    if (err.response != null && _isChallenge(err.response!)) {
      _handleChallenge(err.response!, handler);
    } else {
      handler.next(err);
    }
  }

  // ---- Challenge detection & solving ----------------------------------------

  bool _isChallenge(Response response) {
    final body = response.data;
    if (body is! String) return false;
    return body.contains('toNumbers') && body.contains('slowAES');
  }

  void _handleChallenge(
    Response response,
    dynamic handler,
  ) {
    // Must be on the pending-future path.
    if (_pendingChallenge != null) {
      _pendingChallenge!.then(
        (_) => _retry(handler, response),
        onError: (_) => handler.reject(DioException(
          requestOptions: response.requestOptions,
          error: 'Gagal menyelesaikan tantangan anti-bot.',
        )),
      );
      return;
    }

    _pendingChallenge = _solve(response).then((_) {
      _pendingChallenge = null;
    }).catchError((_) {
      _pendingChallenge = null;
    });

    _pendingChallenge!.then(
      (_) => _retry(handler, response),
      onError: (_) => handler.reject(DioException(
        requestOptions: response.requestOptions,
        error: 'Gagal menyelesaikan tantangan anti-bot.',
      )),
    );
  }

  Future<void> _solve(Response response) async {
    final html = response.data as String;
    final match = _paramsRe.firstMatch(html);
    if (match == null) return;

    final keyHex = match.group(1)!; // a
    final ivHex = match.group(2)!; // b
    final ctHex = match.group(3)!; // c

    final key = _hexToBytes(keyHex);
    final iv = _hexToBytes(ivHex);
    final ct = _hexToBytes(ctHex);

    // AES-128-CBC decryption  (same as slowAES.decrypt(c, 2, a, b))
    // mode constant 2 = CBC in slowAES
    final plainBytes = _aesCbcDecrypt(key, iv, ct);
    _cachedCookie = _bytesToHex(plainBytes);
  }

  void _retry(dynamic handler, Response originalResponse) async {
    final opts = originalResponse.requestOptions;
    try {
      // Mark this request so we don't recurse into solving the challenge
      // again if the retry also returns HTML (shouldn't happen with valid
      // cookie, but guard against infinite loops).
      final retriedOpts = RequestOptions(
        path: opts.path,
        method: opts.method,
        baseUrl: opts.baseUrl,
        data: opts.data,
        queryParameters: Map<String, dynamic>.from(opts.queryParameters),
        headers: Map<String, dynamic>.from(opts.headers)
          ..['Cookie'] = '$_cookieName=$_cachedCookie',
        connectTimeout: opts.connectTimeout,
        receiveTimeout: opts.receiveTimeout,
        extra: {'_antiBotRetried': true},
      );

      // Use a fresh Dio that does NOT include AntiBotInterceptor to
      // avoid infinite recursion. This Dio only carries the auth
      // interceptor (via the headers we copied).
      final freshDio = Dio(BaseOptions(
        baseUrl: opts.baseUrl,
        connectTimeout: opts.connectTimeout,
        receiveTimeout: opts.receiveTimeout,
      ));
      final res = await freshDio.fetch<void>(retriedOpts);
      handler.resolve(res);
    } on DioException catch (e) {
      handler.reject(e);
    } catch (e) {
      handler.reject(DioException(
        requestOptions: opts,
        error: e,
        message: e.toString(),
      ));
    }
  }

  // ---- Helpers -------------------------------------------------------------

  static List<int> _hexToBytes(String hex) {
    final result = <int>[];
    for (var i = 0; i < hex.length; i += 2) {
      result.add(int.parse(hex.substring(i, i + 2), radix: 16));
    }
    return result;
  }

  static String _bytesToHex(List<int> bytes) {
    final sb = StringBuffer();
    for (final b in bytes) {
      sb.write(b.toRadixString(16).padLeft(2, '0'));
    }
    return sb.toString();
  }

  /// Raw AES-128-CBC decryption without PKCS7 unpadding.
  ///
  /// slowAES.decrypt(c, 2, a, b) uses CBC mode (mode constant 2).
  /// CBC: decrypt each block with AES, then XOR with previous ciphertext
  /// block (or IV for the first block).
  ///
  /// Note: slowAES only unpadBytesOut when output > 16 bytes, so for the
  /// single-block challenges used by FreeHosting, no PKCS7 unpadding is
  /// applied. We use raw pointycastle AES-ECB + manual CBC XOR to avoid
  /// the `encrypt` package always trying to unpad.
  static List<int> _aesCbcDecrypt(
    List<int> key,
    List<int> iv,
    List<int> ciphertext,
  ) {
    const blockSize = 16;
    final numBlocks = ciphertext.length ~/ blockSize;
    final plaintext = <int>[];

    var prevBlock = Uint8List.fromList(iv);

    for (var i = 0; i < numBlocks; i++) {
      final start = i * blockSize;
      final ctBlock = ciphertext.sublist(start, start + blockSize);

      // AES-ECB decrypt the ciphertext block
      final cipher = AESEngine();
      cipher.init(false, KeyParameter(Uint8List.fromList(key)));
      final decrypted = Uint8List(blockSize);
      cipher.processBlock(Uint8List.fromList(ctBlock), 0, decrypted, 0);

      // XOR with previous ciphertext block (or IV for first block)
      for (var j = 0; j < blockSize; j++) {
        plaintext.add(prevBlock[j] ^ decrypted[j]);
      }

      prevBlock = Uint8List.fromList(ctBlock);
    }

    return plaintext;
  }
}
