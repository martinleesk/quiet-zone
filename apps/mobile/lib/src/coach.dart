import "package:flutter/material.dart";

import "protocol.dart";

/// Plain “what do I do now” lines. Mirror of PHASE_COACH in roles.ts.
/// Action phases keep a single verb. Longer notes live in「詳情」.
const phaseCoach = <String, String>{
  "home": "11 人隱藏身份。你要估邊三個係消音組。",
  "lobby": "記住你係邊個，再開始燈亮",
  "boot": "記住身份，再去燈亮",
  "day_talk": "講／釘",
  "draft": "寫（可跳）",
  "vote": "揀",
  "resolve": "等幾秒就熄燈",
  "night": "發動",
  "check": "睇下有冇人贏",
  "ended": "局完，身份公開",
};

/// Shown only inside「詳情」, never stacked on the action screen.
const phaseDetail = <String, List<String>>{
  "home": ["燈亮講一句", "投票隔離", "熄燈先用技能"],
  "lobby": ["你坐一席", "其餘係 AI", "徽章會一直在"],
  "boot": ["睇你嘅名", "睇技能一句", "撳開始"],
  "day_talk": ["撳短動詞就講", "疑、保要再揀人", "自己寫收埋"],
  "draft": ["可以留空", "寫完先交", "跳過都得"],
  "vote": ["平票就冇人走", "可以棄權", "撳準備先結算"],
  "night": ["撳席位就發動", "冇就跳過", "全文喺呢度同圖鑑"],
};

String coachLine(String phase) => phaseCoach[phase] ?? "跟住畫面下面嘅掣。";

List<String> coachDetail(String phase) => phaseDetail[phase] ?? const [];

/// Shared with the trial page and the AI phrase bank. Seat verbs send「疑 暱稱」.
class TalkChip {
  const TalkChip({required this.verb, required this.line, this.needsSeat = false});

  final String verb;
  final String line;
  final bool needsSeat;
}

const talkChips = <TalkChip>[
  TalkChip(verb: "疑", line: "疑", needsSeat: true),
  TalkChip(verb: "保", line: "保", needsSeat: true),
  TalkChip(verb: "跟票", line: "跟票"),
  TalkChip(verb: "睇線報", line: "睇線報"),
  TalkChip(verb: "未實錘", line: "未實錘"),
  TalkChip(verb: "觀望", line: "觀望"),
  TalkChip(verb: "小心", line: "小心錯票"),
  TalkChip(verb: "再聽", line: "再聽一輪"),
];

/// At most four characters on the action screen. Full skill text stays in the codex.
String skillMnemonic(String action, {String fallback = ""}) {
  const cues = <String, String>{
    "disconnect": "帶走",
    "cover": "保邊個",
    "sweep": "掃邊個",
    "mark": "標邊個",
    "seal": "封邊個",
    "pin": "釘一句",
    "link": "查邊個",
    "fake_plant": "放假料",
    "fake_flag": "標未核",
    "skip": "跳過",
  };
  final known = cues[action];
  if (known != null) return known;
  final raw = fallback.trim();
  if (raw.isEmpty) return "發動";
  final units = raw.runes.toList();
  if (units.length <= 4) return raw;
  return String.fromCharCodes(units.take(4));
}

bool hidesRoleEssay(String phase) {
  return phase == "day_talk" || phase == "draft" || phase == "vote" || phase == "night";
}

class CoachLine extends StatelessWidget {
  const CoachLine({super.key, required this.phase, this.maxLines});

  final String phase;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    return Text(
      "而家做咩：${coachLine(phase)}",
      key: const Key("coach-line"),
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
      softWrap: maxLines == null,
      style: const TextStyle(color: Color(0xFFE7C27A), fontWeight: FontWeight.w800, fontSize: 20, height: 1.05),
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
      width: 68,
      height: 60,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "$seconds",
              style: TextStyle(fontSize: 44, height: 1, fontWeight: FontWeight.w800, color: color),
            ),
            Text("秒", style: TextStyle(fontSize: 12, height: 1, color: color)),
            const SizedBox(height: 2),
            SizedBox(
              width: 52,
              height: 3,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: ColoredBox(
                  color: const Color(0xFF243044),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: span,
                      heightFactor: 1,
                      child: ColoredBox(color: color),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
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
