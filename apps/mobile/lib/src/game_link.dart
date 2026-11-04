/// Transport for room messages. The live app uses a WebSocket.
/// The phone trial uses an in-browser session that speaks the same JSON.
abstract class GameLink {
  Future<void> open(void Function(Map<String, dynamic> message) onMessage);
  void send(Map<String, dynamic> message);
  Future<void> close();
}
