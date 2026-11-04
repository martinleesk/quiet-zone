import "dart:async";
import "dart:convert";
import "dart:js_interop";
import "dart:js_interop_unsafe";

import "signal_link.dart";

SignalLink createSignalLink() => JsSignalLink();

class JsSignalLink implements SignalLink {
  static Future<void>? _script;

  @override
  Future<void> open(
    void Function(Map<String, dynamic> message) onMessage,
    Map<String, dynamic> options,
  ) async {
    await _ensureEngine();
    _engine().callMethod(
      "open".toJS,
      ((JSString json) {
        final decoded = jsonDecode(json.toDart);
        if (decoded is Map) onMessage(Map<String, dynamic>.from(decoded));
      }).toJS,
      jsonEncode(options).toJS,
    );
  }

  @override
  void send(Map<String, dynamic> message) {
    _engine().callMethod("send".toJS, jsonEncode(message).toJS);
  }

  @override
  Future<void> close() async {
    _engineOrNull()?.callMethod("close".toJS);
  }

  JSObject _engine() {
    final engine = _engineOrNull();
    if (engine == null) throw StateError("訊號牌引擎未載入。");
    return engine;
  }

  JSObject? _engineOrNull() {
    final engine = globalContext["QuietZoneSignal"];
    if (engine.isUndefinedOrNull || !engine.isA<JSObject>()) return null;
    return engine as JSObject;
  }

  Future<void> _ensureEngine() {
    return _script ??= _inject();
  }

  Future<void> _inject() {
    final document = globalContext["document"] as JSObject;
    final existing = document.callMethod<JSAny?>("querySelector".toJS, "#qz-signal-engine".toJS);
    if (existing != null) return Future<void>.value();
    final script = document.callMethod<JSObject>("createElement".toJS, "script".toJS);
    script["id"] = "qz-signal-engine".toJS;
    script["src"] = _src().toJS;
    final head = document["head"] as JSObject;
    final done = Completer<void>();
    script["onload"] = (() => done.complete()).toJS;
    script["onerror"] = (() => done.completeError(StateError("訊號牌引擎未載入。"))).toJS;
    head.callMethod("appendChild".toJS, script);
    return done.future;
  }

  String _src() {
    final document = globalContext["document"] as JSObject;
    final base = (document["baseURI"] as JSString?)?.toDart ?? "";
    if (base.isEmpty) return "signal_engine.js";
    return Uri.parse(base).resolve("signal_engine.js").toString();
  }
}
