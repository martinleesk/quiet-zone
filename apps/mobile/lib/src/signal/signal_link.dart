/// Transport for the signal-card trial. Web loads the bundled engine.
abstract class SignalLink {
  Future<void> open(
    void Function(Map<String, dynamic> message) onMessage,
    Map<String, dynamic> options,
  );
  void send(Map<String, dynamic> message);
  Future<void> close();
}
