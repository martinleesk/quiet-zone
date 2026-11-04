import "dart:async";

import "package:flutter/material.dart";

import "../../main.dart" show lockQuietZoneLandscape, quietZoneTheme;
import "../frame.dart";
import "signal_controller.dart";
import "signal_link.dart";
import "signal_link_factory.dart";

/// Browser trial for 封鎖夜 · 訊號牌. The authoritative loop is the TS engine.
class SignalApp extends StatefulWidget {
  const SignalApp({super.key, this.link});

  final SignalLink? link;

  @override
  State<SignalApp> createState() => _SignalAppState();
}

class _SignalAppState extends State<SignalApp> {
  late final SignalController _controller = SignalController(link: widget.link ?? createSignalLink());

  @override
  void initState() {
    super.initState();
    unawaited(lockQuietZoneLandscape());
    unawaited(_controller.start(_options()));
  }

  Map<String, dynamic> _options() {
    final params = Uri.base.queryParameters;
    final seed = int.tryParse(params["seed"] ?? "");
    return {
      if (params.containsKey("fast")) "fast": true,
      if (params["at"] == "play" || params["at"] == "vote") "at": params["at"],
      if (seed != null) "seed": seed,
    };
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "消音區 · 訊號牌",
      debugShowCheckedModeBanner: false,
      theme: quietZoneTheme(),
      home: SignalPage(controller: _controller),
    );
  }
}

class SignalSnap {
  SignalSnap(this.raw);

  final Map<String, dynamic> raw;

  String get phase => "${raw["phase"] ?? ""}";
  String get phaseLabel => "${raw["phaseLabel"] ?? ""}";
  String get coach => "${raw["coach"] ?? ""}";
  String get banner => "${raw["banner"] ?? ""}";
  int? get secondsLeft => (raw["secondsLeft"] as num?)?.toInt();
  Map<String, dynamic> get you => Map<String, dynamic>.from(raw["you"] as Map? ?? {});
  List<Map<String, dynamic>> get seats => _maps(raw["seats"]);
  List<Map<String, dynamic>> get hand => _maps(you["hand"]);
  List<String> get events => [for (final line in (raw["events"] as List? ?? const [])) "$line"];
  List<String> get notes => [for (final line in (you["notes"] as List? ?? const [])) "$line"];

  bool get canGuard => you["canGuard"] == true;
  bool get canStrike => you["canStrike"] == true;
  bool get canArm => you["canArm"] == true;
  bool get canTool => you["canTool"] == true;
  bool get canFire => you["canFire"] == true;
  bool get skillReady => you["skillReady"] == true;
  bool get skillNeedsTarget => you["skillNeedsTarget"] == true;
  bool get acted => you["acted"] == true;
  bool get voted => you["voted"] == true;
  bool get connected => you["connected"] != false;

  static List<Map<String, dynamic>> _maps(Object? value) {
    if (value is! List) return const [];
    return [
      for (final item in value)
        if (item is Map) Map<String, dynamic>.from(item),
    ];
  }
}

class SignalPage extends StatefulWidget {
  const SignalPage({super.key, required this.controller});

  final SignalController controller;

  @override
  State<SignalPage> createState() => _SignalPageState();
}

class _SignalPageState extends State<SignalPage> {
  String? _selected;
  String? _pending;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final raw = widget.controller.view;
        if (raw == null) {
          return const Scaffold(body: Center(child: Text("載入訊號牌")));
        }
        final view = SignalSnap(raw);
        return Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                _bar(view),
                if (widget.controller.error != null)
                  Text(widget.controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final wide = preferLandscape(constraints);
                      final table = _table(view);
                      final dock = _dock(view);
                      if (!wide) {
                        return Column(children: [Expanded(child: table), SizedBox(height: 180, child: dock)]);
                      }
                      return Row(children: [Expanded(flex: 6, child: table), Expanded(flex: 5, child: dock)]);
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _bar(SignalSnap view) {
    final low = (view.secondsLeft ?? 99) <= 5;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${view.phaseLabel} · ${view.banner}", key: const Key("signal-phase"), style: const TextStyle(color: Color(0xFF9AA7B5))),
                Text(view.coach, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          Text(
            view.secondsLeft == null ? "—" : "${view.secondsLeft}",
            key: const Key("signal-clock"),
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w800,
              height: 1,
              color: low ? const Color(0xFFE07A7A) : const Color(0xFFE7C27A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _table(SignalSnap view) {
    final picking = _pending != null;
    return ListView(
      padding: const EdgeInsets.all(8),
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final seat in view.seats)
              ActionChip(
                label: Text(_seatLabel(seat)),
                onPressed: picking && seat["connected"] == true && seat["isYou"] != true
                    ? () => _sendTarget("${seat["id"]}")
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text((view.events.isEmpty ? ["未有晨報"] : view.events).join(" · "), style: const TextStyle(color: Color(0xFFE7C27A))),
      ],
    );
  }

  String _seatLabel(Map<String, dynamic> seat) {
    final bits = <String>[
      "${seat["name"]}",
      if (seat["ai"] == true) "AI",
      if (seat["connected"] != true) "已斷線",
      if ((seat["marks"] as num? ?? 0) > 0) "疑點 ${seat["marks"]}",
      if (seat["acted"] == true) "已行動",
      if (seat["guard"] != null) "防 ${seat["guard"]}",
      if (seat["vote"] != null) "票 ${seat["vote"]}",
    ];
    return bits.join(" ");
  }

  Widget _dock(SignalSnap view) {
    final you = view.you;
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      children: [
        Text("${you["factionLabel"]} · ${you["roleName"]}", style: const TextStyle(color: Color(0xFFE7C27A), fontWeight: FontWeight.w800)),
        Text("${you["goal"] ?? ""} · ${you["skillName"] ?? ""}${you["skillUsed"] == true ? " 已用" : ""}"),
        const SizedBox(height: 8),
        if (!view.connected && view.phase != "ended") const Text("你已斷線", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        if (view.phase == "ended")
          Text("${view.raw["winner"] is Map ? (view.raw["winner"] as Map)["factionLabel"] : "終局"}", style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFFE7C27A))),
        if (view.phase == "morning" || view.phase == "resolve") _button("繼續", const Key("signal-ready"), () => _act({"type": "ready"})),
        if (view.phase == "day")
          Wrap(
            spacing: 6,
            children: [
              for (final chip in const ["可疑", "留低", "冇聲", "對頻", "我過"])
                ActionChip(label: Text(chip), onPressed: () => _act({"type": "talk", "chip": chip})),
            ],
          ),
        if (view.phase == "night" || view.phase == "play" || view.phase == "discard") _hand(view),
        if (view.phase == "night") ..._nightActions(view),
        if (view.phase == "play") ..._playActions(view),
        if (view.phase == "vote") ..._voteActions(view),
        if (view.phase == "discard") const Text("揀一張棄掉"),
        for (final note in view.notes) Text(note, style: const TextStyle(color: Color(0xFF9AA7B5))),
        if (_pending != null) const Text("揀一個人"),
      ],
    );
  }

  Widget _hand(SignalSnap view) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final card in view.hand)
          ChoiceChip(
            key: Key("signal-card-${card["uid"]}"),
            label: Text("${card["kindLabel"]} ${card["name"]}"),
            selected: _selected == card["uid"],
            onSelected: (_) {
              if (view.phase == "discard") {
                _act({"type": "discard", "cardUid": card["uid"]});
                return;
              }
              setState(() {
                _selected = "${card["uid"]}";
                _pending = null;
              });
            },
          ),
      ],
    );
  }

  List<Widget> _nightActions(SignalSnap view) {
    final card = _card(view);
    return [
      if (view.skillReady) _button("${view.you["skillName"]}", const Key("signal-skill"), () => _private(view, night: true)),
      if (card?["kind"] == "strike") _button("裝上武槽", const Key("signal-arm"), () => _act({"type": "night", "action": "arm", "cardUid": card!["uid"]})),
      if (!view.acted) _button("跳過", const Key("signal-finish"), () => _act({"type": "night", "action": "pass"}), ghost: true),
    ];
  }

  List<Widget> _playActions(SignalSnap view) {
    final card = _card(view);
    return [
      if (card?["kind"] == "strike" && view.canStrike)
        _button("打出", const Key("signal-play"), () {
          setState(() => _pending = "strike");
        }),
      if (card?["kind"] == "strike" && view.canArm)
        _button("裝上", const Key("signal-arm"), () => _act({"type": "play", "action": "arm", "cardUid": card!["uid"]}), ghost: true),
      if (card?["kind"] == "guard" && view.canGuard)
        _button("裝上", const Key("signal-equip"), () => _act({"type": "play", "action": "guard", "cardUid": card!["uid"]})),
      if (card?["kind"] == "tool" && view.canTool)
        _button("打出", const Key("signal-tool"), () {
          if (card?["needsTarget"] == true) {
            setState(() => _pending = "tool");
          } else {
            _act({"type": "play", "action": "tool", "cardUid": card!["uid"]});
          }
        }),
      if (card?["kind"] == "skill") _button("發動", const Key("signal-skill-card"), () => _act({"type": "play", "action": "skill", "cardUid": card!["uid"]})),
      if (view.canFire)
        _button("發動武槽", const Key("signal-fire"), () {
          setState(() => _pending = "fire");
        }, ghost: true),
      if (view.skillReady) _button("${view.you["skillName"]}", const Key("signal-skill"), () => _private(view), ghost: true),
      if (!view.acted) _button("完成", const Key("signal-finish"), () => _act({"type": "play", "action": "finish"}), ghost: true),
    ];
  }

  List<Widget> _voteActions(SignalSnap view) {
    final targets = view.seats.where((seat) => seat["connected"] == true && seat["isYou"] != true);
    return [
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final seat in targets)
            FilledButton(
              key: Key("signal-vote-${seat["id"]}"),
              onPressed: () => _act({"type": "vote", "targetSeatId": seat["id"]}),
              child: Text("${seat["name"]}"),
            ),
        ],
      ),
      if (view.skillReady) _button("${view.you["skillName"]}", const Key("signal-skill"), () => _act({"type": "play", "action": "private"})),
      _button("棄權", const Key("signal-abstain"), () => _act({"type": "vote", "targetSeatId": "abstain"}), ghost: true),
      if (view.voted && !view.acted) _button("完成", const Key("signal-finish"), () => _act({"type": "ready"})),
    ];
  }

  Map<String, dynamic>? _card(SignalSnap view) {
    for (final card in view.hand) {
      if (card["uid"] == _selected) return card;
    }
    return null;
  }

  void _private(SignalSnap view, {bool night = false}) {
    if (view.skillNeedsTarget) {
      setState(() => _pending = night ? "night-skill" : "private");
      return;
    }
    if (night) {
      _act({"type": "night", "action": "skill"});
    } else {
      _act({"type": "play", "action": "private"});
    }
  }

  void _sendTarget(String seatId) {
    final pending = _pending;
    final card = _selected;
    _pending = null;
    if (pending == "strike" || pending == "tool") {
      _act({"type": "play", "action": pending, "cardUid": card, "targetSeatId": seatId});
    } else if (pending == "fire") {
      _act({"type": "play", "action": "fire", "targetSeatId": seatId});
    } else if (pending == "private") {
      _act({"type": "play", "action": "private", "targetSeatId": seatId});
    } else if (pending == "night-skill") {
      _act({"type": "night", "action": "skill", "targetSeatId": seatId});
    }
  }

  void _act(Map<String, dynamic> command) {
    setState(() => _pending = null);
    widget.controller.act(command);
  }

  Widget _button(String label, Key key, VoidCallback onPressed, {bool ghost = false}) {
    final child = Text(label);
    if (ghost) {
      return OutlinedButton(key: key, onPressed: onPressed, child: child);
    }
    return FilledButton(key: key, onPressed: onPressed, child: child);
  }
}
