import "package:flutter/material.dart";

import "../main.dart";
import "codex_page.dart";
import "game_controller.dart";
import "home_page.dart";
import "lobby_page.dart";
import "protocol.dart";
import "table_page.dart";

/// Offline screens of the landscape UI, using the same widgets and ArtCatalog art.
class UiDemoApp extends StatelessWidget {
  const UiDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "消音區畫面示範",
      debugShowCheckedModeBanner: false,
      theme: quietZoneTheme(),
      home: const UiDemoShell(),
    );
  }
}

class UiDemoShell extends StatefulWidget {
  const UiDemoShell({super.key});

  @override
  State<UiDemoShell> createState() => _UiDemoShellState();
}

class _UiDemoShellState extends State<UiDemoShell> {
  static const _screens = ["home", "lobby", "codex", "day", "night"];
  static const _labels = {
    "home": "主頁",
    "lobby": "組席",
    "codex": "圖鑑",
    "day": "燈亮",
    "night": "熄燈",
  };

  String _screen = "home";
  late final GameController _home = GameController();
  late final GameController _lobby = GameController(preview: _lobbySnapshot());
  late final GameController _day = GameController(preview: _tableSnapshot(night: false));
  late final GameController _night = GameController(preview: _tableSnapshot(night: true));

  @override
  void dispose() {
    _home.dispose();
    _lobby.dispose();
    _day.dispose();
    _night.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key("ui-demo"),
      children: [
        Material(
          color: const Color(0xFF121A22),
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              height: 36,
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 12, right: 8),
                    child: Text("畫面示範", style: TextStyle(color: Color(0xFFE7C27A), fontSize: 13)),
                  ),
                  for (final id in _screens)
                    TextButton(
                      key: Key("demo-screen:$id"),
                      style: TextButton.styleFrom(
                        foregroundColor: _screen == id ? const Color(0xFF0E141B) : const Color(0xFFE8EEF4),
                        backgroundColor: _screen == id ? const Color(0xFFE7C27A) : Colors.transparent,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: const Size(0, 32),
                      ),
                      onPressed: () => setState(() => _screen = id),
                      child: Text(_labels[id]!),
                    ),
                ],
              ),
            ),
          ),
        ),
        Expanded(child: _page()),
      ],
    );
  }

  Widget _page() {
    switch (_screen) {
      case "lobby":
        return LobbyPage(controller: _lobby);
      case "codex":
        return const RoleCodexPage();
      case "day":
        return TablePage(controller: _day);
      case "night":
        return TablePage(controller: _night);
      default:
        return HomePage(controller: _home);
    }
  }
}

const _coverSkill = "臨時掩護：免疫該夜失聯。成功後下一夜唔可以再成功。";

const _tableSeats = <PublicSeat>[
  PublicSeat(id: "s1", nickname: "夜歸人", isAi: false, alive: true, sealed: false),
  PublicSeat(id: "s2", nickname: "霧港燈", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s3", nickname: "潮聲", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s4", nickname: "北角", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s5", nickname: "深水", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s6", nickname: "啟德", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s7", nickname: "西環", isAi: true, alive: false, sealed: false),
  PublicSeat(id: "s8", nickname: "銅鑼", isAi: true, alive: true, sealed: true),
  PublicSeat(id: "s9", nickname: "紅磡", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s10", nickname: "荃灣", isAi: true, alive: true, sealed: false),
  PublicSeat(id: "s11", nickname: "沙田", isAi: true, alive: true, sealed: false),
];

GameSnapshot _lobbySnapshot() {
  return GameSnapshot(
    public: const PublicView(
      code: "ABCD",
      phase: "lobby",
      phaseLabel: "組席",
      round: 0,
      night: 0,
      banner: "",
      composition: Composition(lighthouse: 7, silence: 3, grey: 1),
      seats: [
        PublicSeat(id: "s1", nickname: "夜歸人", isAi: false, alive: true, sealed: false),
        PublicSeat(id: "s2", nickname: "霧港燈", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s3", nickname: "潮聲", isAi: false, alive: true, sealed: false, lobbyReady: true),
      ],
      log: [],
      disconnects: 0,
      disconnectsToWin: 3,
      winner: null,
    ),
    private: const PrivateView(
      playerId: "p1",
      seatId: "s1",
      isHost: true,
      alive: true,
      canSpeak: false,
      canVote: false,
      ready: false,
      role: null,
      teammates: [],
      inbox: [],
      nightActions: [],
      marks: [],
    ),
  );
}

GameSnapshot _tableSnapshot({required bool night}) {
  return GameSnapshot(
    public: PublicView(
      code: "ABCD",
      phase: night ? "night" : "day_talk",
      phaseLabel: night ? "熄燈行動" : "燈亮討論",
      round: 1,
      night: night ? 1 : 0,
      banner: night ? "熄燈。掩護、掃頻、失聯，或者跳過。" : "燈亮。可以發言、釘選，或者準備。",
      composition: const Composition(lighthouse: 7, silence: 3, grey: 1),
      seats: _tableSeats,
      log: const ["公開組成已廣播。"],
      disconnects: 0,
      disconnectsToWin: 3,
      winner: null,
      secondsLeft: night ? 25 : 40,
    ),
    private: PrivateView(
      playerId: "p1",
      seatId: "s1",
      isHost: true,
      alive: true,
      canSpeak: true,
      canVote: false,
      ready: false,
      role: const PrivateRole(
        id: "cover",
        name: "掩護員",
        faction: "lighthouse",
        factionLabel: "燈塔網",
        skill: _coverSkill,
      ),
      teammates: const [],
      inbox: const [],
      nightActions: night
          ? const [
              NightChoice(action: "cover", label: "臨時掩護", needsTarget: true),
              NightChoice(action: "skip", label: "跳過今夜", needsTarget: false),
            ]
          : const [],
      marks: const [],
    ),
  );
}
