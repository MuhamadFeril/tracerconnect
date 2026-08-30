import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:encrypt/encrypt.dart';

/// Dio interceptor that bypasses the InfinityFree / FreeHosting anti-bot
/// JavaScript challenge.
///
/// When the server returns the JS challenge page (instead of JSON), this
/// interceptor:
/// 1. Parses the AES-CTR ciphertext, key, and IV from the inline JS.
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
      _pendingChallenge!.then((_) => _retry(handler, response));
      return;
    }

    _pendingChallenge = _solve(response).then((_) {
      _pendingChallenge = null;
    });

    _pendingChallenge!.then((_) => _retry(handler, response));
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

    // AES-128-CTR decryption  (same as slowAES.decrypt(c, 2, a, b))
    final plainBytes = _aesCtrDecrypt(key, iv, ct);
    _cachedCookie = _bytesToHex(plainBytes);
  }

  void _retry(dynamic handler, Response originalResponse) async {
    final opts = originalResponse.requestOptions;
    opts.headers['Cookie'] = '$_cookieName=$_cachedCookie';
    try {
      // Clone options and retry without re-creating Dio.
      final dio = Dio(BaseOptions(
        baseUrl: opts.baseUrl,
        connectTimeout: opts.connectTimeout,
        receiveTimeout: opts.receiveTimeout,
        headers: Map<String, dynamic>.from(opts.headers),
      ));
      final res = await dio.fetch<void>(RequestOptions(
        path: opts.path,
        method: opts.method,
        data: opts.data,
        queryParameters: opts.queryParameters,
        headers: Map<String, dynamic>.from(opts.headers)
          ..['Cookie'] = '$_cookieName=$_cachedCookie',
      ));
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

  /// AES-128-CTR decryption.
  ///
  /// CTR mode: for each block we encrypt `counter` (big-endian) to get the
  /// keystream, then XOR with ciphertext.
  static List<int> _aesCtrDecrypt(
    List<int> key,
    List<int> iv,
    List<int> ciphertext,
  ) {
    final keyBytes = Uint8List.fromList(key);
    final ivBytes = Uint8List.fromList(iv);
    final ctBytes = Uint8List.fromList(ciphertext);
    final encrypter = Encrypter(AES(Key(keyBytes), mode: AESMode.ctr, padding: ''));
    final decrypted = encrypter.decryptBytes(Encrypted(ctBytes), iv: IV(ivBytes));
    return decrypted;
  }
}
