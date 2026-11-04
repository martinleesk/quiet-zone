import "game_link.dart";

GameLink createTrialLink() => UnsupportedTrialLink();

class UnsupportedTrialLink implements GameLink {
  @override
  Future<void> open(void Function(Map<String, dynamic> message) onMessage) async {
    throw UnsupportedError("試玩網頁先用到內置引擎。");
  }

  @override
  void send(Map<String, dynamic> message) {}

  @override
  Future<void> close() async {}
}
