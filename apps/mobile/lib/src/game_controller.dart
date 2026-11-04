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
  String? _serverUrl;
  String? _reclaimToken;
  bool _leaving = false;
  bool _reclaiming = false;
  final Set<String> dismissedTips = {};
  int? secondsLeft;
  Timer? _countdown;

  Future<void> createRoom(String url, String nickname) {
    _serverUrl = url.trim();
    _reclaimToken = null;
    _leaving = false;
    return _connect(_serverUrl!, {"type": "create_room", "nickname": nickname});
  }

  Future<void> joinRoom(String url, String code, String nickname) {
    _serverUrl = url.trim();
    _reclaimToken = null;
    _leaving = false;
    return _connect(_serverUrl!, {
      "type": "join_room",
      "code": code.trim(),
      "nickname": nickname,
    });
  }

  void startGame() => _send({"type": "start_game"});

  void chat(String text) => _send({"type": "chat", "text": text});

  void draft(String text) => _send({"type": "draft", "text": text});

  void vote(String? targetSeatId, {bool anonymous = false}) {
    _send({"type": "vote", "targetSeatId": targetSeatId, "anonymous": anonymous});
  }

  void skill(String action, {String? text, String? targetId}) {
    _send({
      "type": "skill",
      "action": action,
      if (text != null) "text": text,
      if (targetId != null) "targetId": targetId,
    });
  }

  void mark(String seatId, {required bool marked}) {
    skill(marked ? "mark" : "unmark", targetId: seatId);
  }

  void night(String action, {String? targetSeatId}) {
    _send({
      "type": "night_action",
      "action": action,
      if (targetSeatId != null) "targetSeatId": targetSeatId,
    });
  }

  void ready({bool ready = true}) => _send({"type": "ready", "ready": ready});

  void silence(String text) => _send({"type": "silence", "text": text});

  void dismissTip(String id) {
    dismissedTips.add(id);
    notifyListeners();
  }

  Future<void> leave() async {
    _leaving = true;
    _reclaimToken = null;
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
        _maybeReclaim();
      }, onDone: () {
        _maybeReclaim();
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

  void _syncCountdown(int? next) {
    _countdown?.cancel();
    secondsLeft = next;
    if (next == null) return;
    _countdown = Timer.periodic(const Duration(seconds: 1), (_) {
      if (secondsLeft == null || secondsLeft! <= 0) {
        _countdown?.cancel();
        return;
      }
      secondsLeft = secondsLeft! - 1;
      notifyListeners();
    });
  }

  void _maybeReclaim() {
    final token = _reclaimToken;
    final url = _serverUrl;
    if (_leaving || _reclaiming || token == null || url == null) {
      if (!_leaving && snapshot != null && error == null) {
        error = "連線已關閉。";
        notifyListeners();
      }
      return;
    }
    _reclaiming = true;
    error = "斷線，正在收回席位…";
    notifyListeners();
    _connect(url, {"type": "reclaim", "token": token});
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
      final token = message.snapshot.private.reclaimToken;
      if (token != null && token.isNotEmpty) _reclaimToken = token;
      _syncCountdown(message.snapshot.public.secondsLeft);
      _reclaiming = false;
    } else if (message is ErrorMessage) {
      error = message.error.message;
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _countdown?.cancel();
    _sub?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
