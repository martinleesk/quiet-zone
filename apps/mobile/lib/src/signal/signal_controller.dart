import "package:flutter/foundation.dart";

import "signal_link.dart";

/// View of one signal-card match. Rules stay in the TypeScript engine.
class SignalController extends ChangeNotifier {
  SignalController({Map<String, dynamic>? preview, SignalLink? link})
      : view = preview,
        _link = link;

  Map<String, dynamic>? view;
  String? error;
  final List<Map<String, dynamic>> sent = [];
  final SignalLink? _link;

  Future<void> start([Map<String, dynamic>? options]) async {
    final link = _link;
    if (link == null) {
      notifyListeners();
      return;
    }
    await link.open((message) {
      if (message["type"] == "state" && message["view"] is Map) {
        view = Map<String, dynamic>.from(message["view"] as Map);
        error = null;
      } else if (message["type"] == "error") {
        error = message["text"] as String?;
      }
      notifyListeners();
    }, options ?? const {});
  }

  void act(Map<String, dynamic> command) {
    sent.add(Map<String, dynamic>.from(command));
    _link?.send(command);
    notifyListeners();
  }

  @override
  void dispose() {
    _link?.close();
    super.dispose();
  }
}
