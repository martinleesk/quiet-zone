import "dart:math" as math;

import "package:flutter/material.dart";

import "ai_badge.dart";
import "art.dart";
import "coach.dart";
import "codex_page.dart";
import "frame.dart";
import "game_controller.dart";
import "protocol.dart";
import "role_catalog.dart";

const silenceTemplates = <String>[
  "今夜我建議失聯一個燈塔席。",
  "可能有掩護，換一個目標。",
  "我跟組內嘅選擇。",
  "今輪跳過，唔好暴露。",
  "小心灰頻，唔好亂送頭。",
];

class TablePage extends StatefulWidget {
  const TablePage({super.key, required this.controller});

  final GameController controller;

  @override
  State<TablePage> createState() => _TablePageState();
}

class _TablePageState extends State<TablePage> {
  String? _target;
  bool _anonymous = false;
  String? _talkVerb;
  String _skillMode = "";
  String _seenPhase = "";

  @override
  Widget build(BuildContext context) {
    final snapshot = widget.controller.snapshot;
    if (snapshot == null) return const SizedBox.shrink();
    final public = snapshot.public;
    final mine = snapshot.private;
    return LayoutBuilder(
      builder: (context, constraints) => _scaffold(context, public, mine, preferLandscape(constraints)),
    );
  }

  Widget _scaffold(BuildContext context, PublicView public, PrivateView mine, bool landscape) {
    _syncPhase(public.phase);
    final phaseTitle = public.phaseLabel.isEmpty ? public.phase : public.phaseLabel;
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: landscape ? 78 : 86,
        titleSpacing: 12,
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(phaseTitle, style: const TextStyle(fontSize: 12, height: 1, fontWeight: FontWeight.w700, color: Color(0xFF9AA7B5))),
            const SizedBox(height: 2),
            CoachLine(phase: public.phase, maxLines: 1),
          ],
        ),
        actions: [
          PhaseClock(
            seconds: widget.controller.secondsLeft ?? public.secondsLeft,
            total: widget.controller.phaseBudget ?? public.secondsLeft,
          ),
          TextButton(
            key: const Key("open-detail"),
            onPressed: () => _openDetail(context, public, mine),
            child: const Text("詳情"),
          ),
          IconButton(
            tooltip: "角色圖鑑",
            onPressed: () => openRoleCodex(context),
            icon: const Icon(Icons.menu_book_outlined),
          ),
          TextButton(onPressed: widget.controller.leave, child: const Text("離開")),
        ],
      ),
      body: SafeArea(
        top: false,
        child: landscape ? _landscapeBody(public, mine) : _portraitBody(public, mine),
      ),
    );
  }

  Widget _portraitBody(PublicView public, PrivateView mine) {
    return _phaseFrame(
      public.phase,
      Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              children: [
                ..._statusBlock(public, mine),
                if (mine.role != null) _RoleCard(mine: mine, showEssay: !hidesRoleEssay(public.phase)),
                ..._recordBlock(public),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final seat in public.seats)
                      _SeatChip(
                        seat: seat,
                        mine: mine.seatId == seat.id,
                        roleId: _knownRoleId(public, mine, seat),
                      ),
                  ],
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: _channelBlock(public, mine)),
              ],
            ),
          ),
          const Divider(height: 1),
          ColoredBox(
            color: const Color(0xFF0E141B),
            child: SafeArea(
              top: false,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 280),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                  child: _actions(public, mine),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Scene on the left, with a wide seat row over the art. Log and actions sit on the right.
  Widget _landscapeBody(PublicView public, PrivateView mine) {
    if (public.phase == "boot") return _bootReveal(public, mine);
    return Row(
      key: const Key("landscape-table"),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 5,
          child: _stagePane(public, mine),
        ),
        Expanded(
          flex: 6,
          child: ColoredBox(
            color: const Color(0xF20E141B),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final actionMax = math.max(0.0, constraints.maxHeight * 0.56);
                return Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                        children: [
                          ..._statusBlock(public, mine, compact: true),
                          ..._recordBlock(public),
                          Column(crossAxisAlignment: CrossAxisAlignment.start, children: _channelBlock(public, mine, compact: true)),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    ConstrainedBox(
                      constraints: BoxConstraints(maxHeight: actionMax),
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(12, 2, 12, 4),
                        child: Theme(
                          data: Theme.of(context).copyWith(
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: _actions(public, mine),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _stagePane(PublicView public, PrivateView mine) {
    final stage = LayoutBuilder(
      builder: (context, constraints) {
        final identityCap = math.max(0.0, constraints.maxHeight * 0.48);
        return Column(
          children: [
            Expanded(
              child: _WideTable(
                seats: public.seats,
                mineSeatId: mine.seatId,
                roleFor: (seat) => _knownRoleId(public, mine, seat),
              ),
            ),
            if (mine.role != null)
              ConstrainedBox(
                constraints: BoxConstraints(maxHeight: identityCap),
                child: SingleChildScrollView(child: _landscapeIdentity(public, mine)),
              ),
          ],
        );
      },
    );
    if (!ArtCatalog.showsBackdrop(public.phase)) {
      return ColoredBox(color: const Color(0xFF0E141B), child: stage);
    }
    return SceneBackdrop.stage(phase: public.phase, child: stage);
  }

  Widget _bootReveal(PublicView public, PrivateView mine) {
    final role = mine.role;
    return ColoredBox(
      key: const Key("boot-reveal"),
      color: const Color(0xFF0E141B),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
        child: Row(
          children: [
            Expanded(
              child: role == null
                  ? const Center(child: Text("等伺服器派身分。"))
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        var bustH = constraints.maxHeight.isFinite ? constraints.maxHeight * 0.9 : 180.0;
                        var bustW = bustH * 84 / 108;
                        if (constraints.maxWidth.isFinite && bustW > constraints.maxWidth) {
                          bustW = constraints.maxWidth;
                          bustH = bustW * 108 / 84;
                        }
                        bustH = math.max(0, bustH);
                        bustW = math.max(0, bustW);
                        return Center(
                          child: RolePortrait(
                            role: role,
                            seatId: mine.seatId,
                            width: bustW,
                            height: bustH,
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(public.banner, softWrap: true),
                    const SizedBox(height: 6),
                    Text(
                      "公開組成　燈塔網 ${public.composition.lighthouse} · 消音組 ${public.composition.silence} · 灰頻 ${public.composition.grey}",
                      softWrap: true,
                    ),
                    const SizedBox(height: 8),
                    if (role != null) _roleCopy(mine, titleSize: Theme.of(context).textTheme.titleMedium, showEssay: true),
                    const SizedBox(height: 10),
                    Theme(
                      data: Theme.of(context).copyWith(
                        visualDensity: VisualDensity.compact,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: _actions(public, mine),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _landscapeIdentity(PublicView public, PrivateView mine) {
    final role = mine.role!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xCC0E141B),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RolePortrait(role: role, seatId: mine.seatId, width: 52, height: 66),
              const SizedBox(width: 8),
              Expanded(
                child: _roleCopy(
                  mine,
                  titleSize: Theme.of(context).textTheme.titleMedium,
                  showEssay: !hidesRoleEssay(public.phase),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleCopy(PrivateView mine, {TextStyle? titleSize, required bool showEssay}) {
    final role = mine.role!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("你嘅身分", style: Theme.of(context).textTheme.labelLarge),
        Text("${role.name} · ${role.factionLabel}", style: titleSize ?? Theme.of(context).textTheme.titleLarge),
        if (showEssay && role.mnemonic.isNotEmpty)
          Text("記法：${role.mnemonic}", style: const TextStyle(color: Color(0xFFE7C27A))),
        if (showEssay) ...[
          const SizedBox(height: 4),
          Text(role.skill, softWrap: true),
        ],
        if (mine.teammates.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text("組員：${mine.teammates.map((mate) => "${mate.nickname}（${mate.roleName}）").join("、")}"),
          ),
        if (mine.marks.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text("你嘅標記：${mine.marks.join("、")}"),
          ),
      ],
    );
  }

  List<Widget> _statusBlock(PublicView public, PrivateView mine, {bool compact = false}) {
    final gap = compact ? 4.0 : 8.0;
    return [
      Text(public.banner, softWrap: true),
      SizedBox(height: gap),
      Text("第 ${public.round} 輪 · 第 ${public.night} 夜 · 失聯 ${public.disconnects}／${public.disconnectsToWin}", softWrap: true),
      SizedBox(height: compact ? 2 : 4),
      Text(
        "公開組成　燈塔網 ${public.composition.lighthouse} · 消音組 ${public.composition.silence} · 灰頻 ${public.composition.grey}",
        softWrap: true,
      ),
      Align(
        alignment: Alignment.centerLeft,
        child: TextButton(
          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 0), visualDensity: VisualDensity.compact),
          onPressed: () => openRoleCodex(context),
          child: const Text("角色圖鑑"),
        ),
      ),
      SizedBox(height: compact ? 4 : 12),
      if (public.winner != null) _WinnerCard(winner: public.winner!, reveal: public.reveal),
      if (mine.remnants.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text("回波殘片", style: Theme.of(context).textTheme.titleSmall),
        for (final remnant in mine.remnants)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text("${remnant.nickname} · ${remnant.factionLabel}"),
          ),
      ],
      if (mine.sealCard != null)
        Card(
          color: const Color(0xFF3A2A32),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(mine.sealCard!),
          ),
        ),
    ];
  }

  List<Widget> _recordBlock(PublicView public) {
    return [
      if (public.pins.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text("釘選時間線", style: Theme.of(context).textTheme.titleSmall),
        for (final pin in public.pins)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(pin.unverified ? "待核實｜${pin.text}" : pin.text),
          ),
      ],
    ];
  }

  List<Widget> _channelBlock(PublicView public, PrivateView mine, {bool compact = false}) {
    return [
      SizedBox(height: compact ? 8 : 16),
      Text("公開頻道", style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 6),
      for (final line in public.log)
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(line),
        ),
      if (mine.inbox.isNotEmpty) ...[
        const SizedBox(height: 12),
        Text("私人匣", style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        for (final line in mine.inbox)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(line),
          ),
      ],
      if (widget.controller.error != null)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(widget.controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
        ),
    ];
  }

  /// Own role, or a seat named in the public end-game reveal. Never a hidden seat.
  String? _knownRoleId(PublicView public, PrivateView mine, PublicSeat seat) {
    if (mine.seatId == seat.id) return mine.role?.id;
    for (final revealed in public.reveal) {
      if (revealed.seatId == seat.id) return roleIdForName(revealed.roleName);
    }
    return null;
  }

  Widget _phaseFrame(String phase, Widget child) {
    if (!ArtCatalog.showsBackdrop(phase)) {
      return child;
    }
    return SceneBackdrop.fill(phase: phase, child: child);
  }

  void _syncPhase(String phase) {
    if (_seenPhase == phase) return;
    _seenPhase = phase;
    _target = null;
    _anonymous = false;
    _talkVerb = null;
    _skillMode = "";
  }

  void _openDetail(BuildContext context, PublicView public, PrivateView mine) {
    final role = mine.role;
    final tips = mine.tips.where((tip) => !widget.controller.dismissedTips.contains(tip.id));
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("詳情"),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("而家做咩：${coachLine(public.phase)}", style: const TextStyle(color: Color(0xFFE7C27A), fontWeight: FontWeight.w800)),
              for (final line in coachDetail(public.phase))
                Padding(padding: const EdgeInsets.only(top: 4), child: Text(line)),
              if (role != null) ...[
                const SizedBox(height: 12),
                Text(role.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                if (role.mnemonic.isNotEmpty) Text("記法：${role.mnemonic}"),
                const SizedBox(height: 4),
                Text(role.skill),
                if (role.when.isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 4), child: Text("幾時用：${role.when}")),
              ],
              for (final tip in tips) ...[
                const SizedBox(height: 8),
                Text(tip.text),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("關閉")),
        ],
      ),
    );
  }

  Future<void> _askLine(String title, void Function(String text) onSubmit) async {
    final field = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: field,
          autofocus: true,
          maxLength: 80,
          decoration: InputDecoration(labelText: title),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("取消")),
          FilledButton(onPressed: () => Navigator.pop(context, field.text), child: const Text("送出")),
        ],
      ),
    );
    field.dispose();
    if (!mounted || text == null) return;
    final body = text.trim();
    if (body.isEmpty) return;
    onSubmit(body);
  }

  void _openSilence() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("夜訊"),
        content: Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final line in silenceTemplates)
              ActionChip(
                label: Text(line),
                onPressed: () {
                  widget.controller.silence(line);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("關閉")),
        ],
      ),
    );
  }

  List<PublicSeat> _others(PublicView public, PrivateView mine, {bool includeSelf = false}) {
    return public.seats.where((seat) => seat.alive && (includeSelf || seat.id != mine.seatId)).toList();
  }

  Widget _cue(String action, {String fallback = ""}) {
    return Text(
      skillMnemonic(action, fallback: fallback),
      key: Key("skill-cue:$action"),
      style: const TextStyle(color: Color(0xFFE7C27A), fontSize: 22, fontWeight: FontWeight.w800, height: 1.1),
    );
  }

  List<_ActMode> _modes(PublicView public, PrivateView mine) {
    final modes = <_ActMode>[];
    if (public.phase == "night") {
      for (final action in mine.nightActions) {
        if (action.action == "skip" || action.action == "mark") continue;
        modes.add(_ActMode(action.action, "night", action.needsTarget, false, action.label));
      }
    }
    for (final action in mine.skillActions) {
      if (modes.any((mode) => mode.action == action.action)) continue;
      final needsText = action.action == "pin" || action.action == "fake_plant";
      modes.add(_ActMode(action.action, "skill", action.needsTarget || action.action == "mark" || action.action == "fake_flag", needsText, action.label));
    }
    return modes;
  }

  Widget _skillPicker(PublicView public, PrivateView mine) {
    final modes = _modes(public, mine);
    if (modes.isEmpty) return const SizedBox.shrink();
    final active = modes.any((mode) => mode.action == _skillMode) ? _skillMode : modes.first.action;
    final mode = modes.firstWhere((item) => item.action == active);
    final seats = _others(public, mine, includeSelf: mode.action == "cover");
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (modes.length > 1)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final item in modes)
                ActionChip(
                  label: Text(skillMnemonic(item.action, fallback: item.label)),
                  onPressed: () => setState(() => _skillMode = item.action),
                ),
            ],
          ),
        _cue(mode.action, fallback: mode.label),
        const SizedBox(height: 6),
        if (mode.needsText)
          FilledButton(
            onPressed: () => _askLine(skillMnemonic(mode.action, fallback: mode.label), (text) {
              widget.controller.skill(mode.action, text: text);
            }),
            child: Text(mode.action == "pin" ? "釘" : "放"),
          )
        else if (mode.action == "fake_flag")
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final pin in public.pins.where((item) => !item.unverified))
                _TargetButton(
                  label: pin.text,
                  onPressed: () => widget.controller.skill("fake_flag", targetId: pin.id),
                ),
            ],
          )
        else if (mode.needsTarget)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final seat in seats)
                _TargetButton(
                  label: seat.nickname,
                  selected: mode.action == "mark" && mine.marks.contains(seat.id),
                  onPressed: () {
                    if (mode.source == "night") {
                      widget.controller.night(mode.action, targetSeatId: seat.id);
                    } else if (mode.action == "mark") {
                      widget.controller.mark(seat.id, marked: !mine.marks.contains(seat.id));
                    } else {
                      widget.controller.skill(mode.action, targetId: seat.id);
                    }
                  },
                ),
            ],
          ),
      ],
    );
  }

  Widget _actions(PublicView public, PrivateView mine) {
    if (!mine.alive) return const Text("你已離場，可以繼續睇公開頻道。");
    if (public.winner != null || public.phase == "ended") {
      return const Text("勝負已定。可以離開再開一房。");
    }
    if (public.phase == "resolve" || public.phase == "check") {
      return const Text("結算中，等伺服器進入下一階段。");
    }
    if (mine.ready && public.phase != "day_talk") {
      return const Text("已準備，等其他真人。");
    }
    if (mine.muted && (public.phase == "day_talk" || public.phase == "draft")) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("封口中：呢個階段只可以等投票，唔可以發言。"),
          const SizedBox(height: 8),
          FilledButton(onPressed: widget.controller.ready, child: const Text("準備好")),
        ],
      );
    }
    switch (public.phase) {
      case "boot":
        return FilledButton(
          onPressed: widget.controller.ready,
          child: const Text("我睇完身分", textAlign: TextAlign.center),
        );
      case "day_talk":
        if (!mine.canSpeak) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text("你被封口，呢回合只可以投票。"),
              const SizedBox(height: 8),
              FilledButton(onPressed: widget.controller.ready, child: const Text("準備好")),
            ],
          );
        }
        final seats = _others(public, mine);
        return Column(
          key: const Key("talk-chips"),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final chip in talkChips)
                  ActionChip(
                    key: Key("talk-chip:${chip.verb}"),
                    label: Text(chip.verb),
                    onPressed: () {
                      if (chip.needsSeat) {
                        setState(() => _talkVerb = _talkVerb == chip.verb ? null : chip.verb);
                      } else {
                        widget.controller.chat(chip.line);
                        setState(() => _talkVerb = null);
                      }
                    },
                  ),
                ActionChip(
                  key: const Key("talk-free"),
                  label: const Text("自己寫"),
                  onPressed: () => _askLine("自己寫", widget.controller.chat),
                ),
              ],
            ),
            if (_talkVerb != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final seat in seats)
                    _TargetButton(
                      label: seat.nickname,
                      onPressed: () {
                        widget.controller.chat("$_talkVerb ${seat.nickname}");
                        setState(() => _talkVerb = null);
                      },
                    ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            _skillPicker(public, mine),
            const SizedBox(height: 8),
            FilledButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      case "draft":
        if (!mine.canSpeak) return const Text("你被封口，草稿都交唔到。等投票。");
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _skillPicker(public, mine),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                widget.controller.draft("");
                widget.controller.ready();
              },
              child: const Text("跳過"),
            ),
            TextButton(
              onPressed: () => _askLine("寫", (text) {
                widget.controller.draft(text);
                widget.controller.ready();
              }),
              child: const Text("寫"),
            ),
          ],
        );
      case "vote":
        final choices = _others(public, mine);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (mine.muted) const Text("你被封口，而家只可以投票。"),
            if (mine.anonymousVote)
              FilterChip(
                label: const Text("匿名票（每局一次）"),
                selected: _anonymous,
                onSelected: (value) => setState(() => _anonymous = value),
              ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final seat in choices)
                  _TargetButton(
                    label: seat.nickname,
                    selected: _target == seat.id,
                    onPressed: () => setState(() => _target = seat.id),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _target == null ? null : () => widget.controller.vote(_target, anonymous: _anonymous),
              child: const Text("確認投票"),
            ),
            TextButton(
              onPressed: () => widget.controller.vote(null, anonymous: _anonymous),
              child: const Text("棄權"),
            ),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      case "night":
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _skillPicker(public, mine),
            if (mine.role?.faction == "silence")
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(onPressed: _openSilence, child: const Text("夜訊")),
              ),
            if (mine.silenceChannel.isNotEmpty)
              for (final note in mine.silenceChannel)
                Text("${note.nickname}：${note.text}"),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("跳過")),
          ],
        );
      default:
        return Text(public.phaseLabel);
    }
  }
}

class _ActMode {
  const _ActMode(this.action, this.source, this.needsTarget, this.needsText, this.label);

  final String action;
  final String source;
  final bool needsTarget;
  final bool needsText;
  final String label;
}

class _TargetButton extends StatelessWidget {
  const _TargetButton({required this.label, required this.onPressed, this.selected = false});

  final String label;
  final VoidCallback onPressed;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 128,
      height: 48,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: selected ? const Color(0xFFE7C27A) : const Color(0xFF243044),
          foregroundColor: selected ? const Color(0xFF0E141B) : const Color(0xFFE7C27A),
          side: const BorderSide(color: Color(0xFFE7C27A), width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 8),
        ),
        onPressed: onPressed,
        child: Text(label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class _WinnerCard extends StatelessWidget {
  const _WinnerCard({required this.winner, required this.reveal});

  final Winner winner;
  final List<SeatReveal> reveal;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF243044),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("終局"),
            const SizedBox(height: 4),
            Text(winner.factionLabel, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(winner.reason),
            if (reveal.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text("身分公開"),
              for (final seat in reveal)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text("${seat.seatId} ${seat.nickname} · ${seat.roleName} · ${seat.factionLabel}${seat.alive ? "" : " · 離場"}"),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.mine, required this.showEssay});

  final PrivateView mine;
  final bool showEssay;

  @override
  Widget build(BuildContext context) {
    final role = mine.role!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RolePortrait(role: role, seatId: mine.seatId),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("你嘅身分", style: Theme.of(context).textTheme.labelLarge),
                  Text("${role.name} · ${role.factionLabel}", style: Theme.of(context).textTheme.titleLarge),
                  if (showEssay) ...[
                    const SizedBox(height: 4),
                    Text(role.skill, softWrap: true),
                  ],
                  if (mine.teammates.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text("組員：${mine.teammates.map((mate) => "${mate.nickname}（${mate.roleName}）").join("、")}"),
                    ),
                  if (mine.marks.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text("你嘅標記：${mine.marks.join("、")}"),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SeatChip extends StatelessWidget {
  const _SeatChip({required this.seat, required this.mine, required this.roleId});

  final PublicSeat seat;
  final bool mine;
  final String? roleId;

  @override
  Widget build(BuildContext context) {
    final asset = roleId == null ? null : ArtCatalog.bustFor(roleId!, seatId: seat.id);
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 10, 6),
      decoration: BoxDecoration(
        color: mine ? const Color(0xFF243044) : const Color(0xFF17202A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: seat.alive ? const Color(0xFF3A4A5C) : const Color(0xFF5A3030)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SeatFace(seatId: seat.id, asset: asset),
          const SizedBox(width: 8),
          Text("${seat.id} ${seat.nickname}${seat.alive ? "" : " · 離場"}${seat.sealed ? " · 封口" : ""}"),
          if (seat.isAi) ...[
            const SizedBox(width: 6),
            const AiBadge(),
          ],
        ],
      ),
    );
  }
}

class _SeatFace extends StatelessWidget {
  const _SeatFace({
    required this.seatId,
    required this.asset,
    this.width = 28,
    this.height = 36,
  });

  final String seatId;
  final String? asset;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    if (asset == null) return _placeholder();
    return ClipRRect(
      key: Key("seat-bust:$asset"),
      borderRadius: BorderRadius.circular(8),
        child: Image(
        image: AssetImage(asset!),
        width: width,
        height: height,
        fit: BoxFit.cover,
        alignment: ArtCatalog.bustAlignment(asset!),
        errorBuilder: (_, __, ___) => _placeholder(),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      key: Key("seat-placeholder:$seatId"),
      width: width,
      height: width,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0xFF243044),
        border: Border.fromBorderSide(BorderSide(color: Color(0xFF8AA0B4))),
      ),
    );
  }
}

class _WideTable extends StatelessWidget {
  const _WideTable({
    required this.seats,
    required this.mineSeatId,
    required this.roleFor,
  });

  final List<PublicSeat> seats;
  final String? mineSeatId;
  final String? Function(PublicSeat seat) roleFor;

  @override
  Widget build(BuildContext context) {
    if (seats.isEmpty) return const SizedBox(key: Key("seat-ring"));
    final farCount = (seats.length / 2).ceil();
    final far = seats.sublist(0, farCount);
    final near = seats.sublist(farCount);
    return Padding(
      key: const Key("seat-ring"),
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
      child: Column(
        children: [
          Expanded(child: _line(far)),
          Container(
            height: 12,
            margin: const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0x66101820),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0x66E7C27A)),
            ),
          ),
          Expanded(child: near.isEmpty ? const SizedBox.shrink() : _line(near)),
        ],
      ),
    );
  }

  Widget _line(List<PublicSeat> row) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final seat in row)
          Expanded(
            child: _RingSeat(
              seat: seat,
              mine: seat.id == mineSeatId,
              roleId: roleFor(seat),
            ),
          ),
      ],
    );
  }
}

class _RingSeat extends StatelessWidget {
  const _RingSeat({required this.seat, required this.mine, required this.roleId});

  final PublicSeat seat;
  final bool mine;
  final String? roleId;

  @override
  Widget build(BuildContext context) {
    final asset = roleId == null ? null : ArtCatalog.bustFor(roleId!, seatId: seat.id);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: mine ? const Color(0xAA243044) : const Color(0x6617202A),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: mine ? const Color(0xFFE7C27A) : const Color(0x443A4A5C)),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final height = constraints.maxHeight.isFinite ? constraints.maxHeight : 120.0;
            final face = height >= 96 ? 34.0 : (height >= 74 ? 24.0 : 0.0);
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (face > 0) ...[
                    _SeatFace(seatId: seat.id, asset: asset, width: face, height: face * 1.2),
                    const SizedBox(height: 2),
                  ],
                  Text(
                    "${seat.id} ${seat.nickname}",
                    textAlign: TextAlign.center,
                    softWrap: true,
                    style: const TextStyle(fontSize: 11, height: 1.1),
                  ),
                  if (!seat.alive)
                    const Text("離場", textAlign: TextAlign.center, style: TextStyle(fontSize: 10, height: 1.1)),
                  if (seat.sealed)
                    const Text("封口", textAlign: TextAlign.center, style: TextStyle(fontSize: 10, height: 1.1)),
                  if (seat.isAi) const Padding(padding: EdgeInsets.only(top: 2), child: AiBadge()),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
