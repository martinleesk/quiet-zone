import "package:flutter/material.dart";

import "protocol.dart";

/// Plain “what do I do now” lines. Mirror of PHASE_COACH in roles.ts.
const phaseCoach = <String, String>{
  "home": "11 人隱藏身份。你要估邊三個係消音組。",
  "lobby": "記住你係邊個，再開始燈亮",
  "boot": "記住身份，再去燈亮",
  "day_talk": "講一句你懷疑邊個",
  "draft": "寫低你想點投票",
  "vote": "揀一個人票走",
  "resolve": "等幾秒就熄燈",
  "night": "熄燈先撳發動",
  "check": "睇下有冇人贏",
  "ended": "局完，身份公開",
};

String coachLine(String phase) => phaseCoach[phase] ?? "跟住畫面下面嘅掣。";

class CoachLine extends StatelessWidget {
  const CoachLine({super.key, required this.phase});

  final String phase;

  @override
  Widget build(BuildContext context) {
    return Text(
      "而家做咩：${coachLine(phase)}",
      key: const Key("coach-line"),
      softWrap: true,
      style: const TextStyle(color: Color(0xFFE7C27A), fontWeight: FontWeight.w700, height: 1.25),
    );
  }
}

class PhaseClock extends StatelessWidget {
  const PhaseClock({super.key, required this.seconds, required this.total});

  final int? seconds;
  final int? total;

  @override
  Widget build(BuildContext context) {
    if (seconds == null) return const SizedBox.shrink();
    final low = seconds! <= 5;
    final color = low ? const Color(0xFFE07A7A) : const Color(0xFFE7C27A);
    final span = total == null || total! <= 0 ? 1.0 : (seconds! / total!).clamp(0.0, 1.0);
    return SizedBox(
      key: const Key("phase-clock"),
      width: 72,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            "$seconds",
            style: TextStyle(fontSize: 28, height: 1, fontWeight: FontWeight.w800, color: color),
          ),
          Text("秒", style: TextStyle(fontSize: 11, height: 1.1, color: color)),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              minHeight: 4,
              value: span,
              backgroundColor: const Color(0xFF243044),
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class SkillCue extends StatelessWidget {
  const SkillCue({super.key, required this.public, required this.mine});

  final PublicView public;
  final PrivateView mine;

  bool get _hasSkill {
    if (mine.skillActions.isNotEmpty) return true;
    if (public.phase != "night") return false;
    return mine.nightActions.any((action) => action.action != "skip" && action.action != "mark");
  }

  @override
  Widget build(BuildContext context) {
    if (public.phase == "resolve" || public.phase == "check" || public.phase == "ended" || public.phase == "boot") {
      return const SizedBox.shrink();
    }
    if (!_hasSkill) {
      return const Padding(
        key: Key("no-skill"),
        padding: EdgeInsets.only(bottom: 2),
        child: Text("呢段冇得用技能", style: TextStyle(fontSize: 12, height: 1)),
      );
    }
    final role = mine.role;
    return Container(
      key: const Key("skill-card"),
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 4),
      decoration: BoxDecoration(
        color: const Color(0xFF243044),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE7C27A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("發動技能", style: TextStyle(color: Color(0xFFE7C27A), fontWeight: FontWeight.w800)),
          if (role != null) Text("${role.name} · ${role.skill}", softWrap: true),
          if (role != null && role.when.isNotEmpty)
            Text("幾時用：${role.when}", style: const TextStyle(color: Color(0xFF9AA7B5), fontSize: 12)),
        ],
      ),
    );
  }
}

class RoleRevealCard extends StatelessWidget {
  const RoleRevealCard({super.key, required this.mine, required this.onStart, required this.onLater});

  final PrivateView mine;
  final VoidCallback onStart;
  final VoidCallback onLater;

  @override
  Widget build(BuildContext context) {
    final role = mine.role;
    if (role == null) return const SizedBox.shrink();
    return Material(
      color: const Color(0xE60E141B),
      child: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(16),
              children: [
                Text("你係", style: Theme.of(context).textTheme.labelLarge),
                Text(role.name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: const Color(0xFFE7C27A))),
                Text("${role.factionLabel}${role.mnemonic.isEmpty ? "" : " · 記法 ${role.mnemonic}"}"),
                const SizedBox(height: 8),
                Text(role.skill),
                const SizedBox(height: 12),
                FilledButton(onPressed: onStart, child: const Text("開始燈亮")),
                TextButton(onPressed: onLater, child: const Text("先睇下席")),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
