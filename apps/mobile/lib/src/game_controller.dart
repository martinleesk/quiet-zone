import "dart:async";
import "dart:convert";

import "package:flutter/foundation.dart";
import "package:web_socket_channel/web_socket_channel.dart";

import "protocol.dart";

class GameController extends ChangeNotifier {
  GameController({GameSnapshot? preview}) : snapshot = preview;

  GameSnapshot? snapshot;
  String? error;
  bool busy = false;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _sub;

  Future<void> createRoom(String url, String nickname) {
    return _connect(url, {"type": "create_room", "nickname": nickname});
  }

  Future<void> joinRoom(String url, String code, String nickname) {
    return _connect(url, {
      "type": "join_room",
      "code": code.trim(),
      "nickname": nickname,
    });
  }

  void startGame() => _send({"type": "start_game"});

  void chat(String text) => _send({"type": "chat", "text": text});

  void draft(String text) => _send({"type": "draft", "text": text});

  void vote(String? targetSeatId) => _send({"type": "vote", "targetSeatId": targetSeatId});

  void night(String action, {String? targetSeatId}) {
    _send({
      "type": "night_action",
      "action": action,
      if (targetSeatId != null) "targetSeatId": targetSeatId,
    });
  }

  void ready() => _send({"type": "ready"});

  Future<void> leave() async {
    await _sub?.cancel();
    _sub = null;
    await _channel?.sink.close();
    _channel = null;
    snapshot = null;
    error = null;
    busy = false;
    notifyListeners();
  }

  Future<void> _connect(String url, Map<String, dynamic> hello) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await _sub?.cancel();
      await _channel?.sink.close();
      final channel = WebSocketChannel.connect(Uri.parse(url.trim()));
      _channel = channel;
      _sub = channel.stream.listen(_onData, onError: (Object err) {
        error = "連線中斷。";
        notifyListeners();
      }, onDone: () {
        if (snapshot != null && error == null) {
          error = "連線已關閉。";
          notifyListeners();
        }
      });
      await channel.ready;
      _send(hello);
    } catch (err) {
      error = "連唔到伺服器。請確認位址同伺服器已開。";
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void _send(Map<String, dynamic> message) {
    final channel = _channel;
    if (channel == null) {
      error = "未連線。";
      notifyListeners();
      return;
    }
    channel.sink.add(jsonEncode(message));
  }

  void _onData(dynamic raw) {
    if (raw is! String) return;
    final decoded = jsonDecode(raw);
    if (decoded is! Map) return;
    final message = parseServerMessage(Map<String, dynamic>.from(decoded));
    if (message is SnapshotMessage) {
      snapshot = message.snapshot;
      error = null;
    } else if (message is ErrorMessage) {
      error = message.error.message;
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
