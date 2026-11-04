import "signal_link.dart";

SignalLink createSignalLink() => _UnsupportedSignalLink();

class _UnsupportedSignalLink implements SignalLink {
  @override
  Future<void> open(
    void Function(Map<String, dynamic> message) onMessage,
    Map<String, dynamic> options,
  ) async {
    throw UnsupportedError("訊號牌試玩要喺瀏覽器開。");
  }

  @override
  void send(Map<String, dynamic> message) {}

  @override
  Future<void> close() async {}
}
