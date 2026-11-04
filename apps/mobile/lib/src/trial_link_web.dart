import "dart:async";
import "dart:convert";
import "dart:js_interop";
import "dart:js_interop_unsafe";

import "game_link.dart";

GameLink createTrialLink() => JsTrialLink();

class JsTrialLink implements GameLink {
  static Future<void>? _script;

  @override
  Future<void> open(void Function(Map<String, dynamic> message) onMessage) async {
    await _ensureEngine();
    final trial = _trial();
    trial.callMethod(
      "open".toJS,
      ((JSString json) {
        final decoded = jsonDecode(json.toDart);
        if (decoded is Map) onMessage(Map<String, dynamic>.from(decoded));
      }).toJS,
    );
  }

  @override
  void send(Map<String, dynamic> message) {
    _trial().callMethod("send".toJS, jsonEncode(message).toJS);
  }

  @override
  Future<void> close() async {
    final trial = _trialOrNull();
    trial?.callMethod("close".toJS);
  }

  JSObject _trial() {
    final trial = _trialOrNull();
    if (trial == null) throw StateError("試玩引擎未載入。");
    return trial;
  }

  JSObject? _trialOrNull() {
    final trial = globalContext["QuietZoneTrial"];
    if (trial.isUndefinedOrNull || !trial.isA<JSObject>()) return null;
    return trial as JSObject;
  }

  Future<void> _ensureEngine() {
    return _script ??= _inject();
  }

  Future<void> _inject() {
    final document = globalContext["document"] as JSObject;
    final existing = document.callMethod<JSAny?>("querySelector".toJS, "#qz-engine".toJS);
    if (existing != null) return Future<void>.value();
    final script = document.callMethod<JSObject>("createElement".toJS, "script".toJS);
    script["id"] = "qz-engine".toJS;
    script["src"] = _engineSrc().toJS;
    final head = document["head"] as JSObject;
    final done = Completer<void>();
    script["onload"] = (() => done.complete()).toJS;
    script["onerror"] = (() => done.completeError(StateError("試玩引擎未載入。"))).toJS;
    head.callMethod("appendChild".toJS, script);
    return done.future;
  }

  String _engineSrc() {
    final document = globalContext["document"] as JSObject;
    final base = (document["baseURI"] as JSString?)?.toDart ?? "";
    if (base.isEmpty) return "engine.js";
    return Uri.parse(base).resolve("engine.js").toString();
  }
}
