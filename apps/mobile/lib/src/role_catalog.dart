import "art.dart";

// Client mirror of Standard Mode roles.
// Source of truth: apps/server/src/domain/roles.ts (ROLES, FACTION_LABEL).
// Keep every skill string identical to that file. Public rules only:
// never a seat's private role, marks, inbox, or remnants.
//
// Bust paths live in ArtCatalog. Civilian's map entry is the woman;
// the man is ArtCatalog.civilianM and is chosen per seat, not in this codex list.

class CodexRole {
  const CodexRole({
    required this.id,
    required this.name,
    required this.faction,
    required this.skill,
    required this.mnemonic,
    required this.when,
  });

  final String id;
  final String name;
  final String faction;
  final String skill;
  final String mnemonic;
  final String when;

  String? get bustAsset => kRoleBustAssets[id];
}

class CodexFactionGroup {
  const CodexFactionGroup({
    required this.id,
    required this.label,
    required this.blurb,
    required this.roles,
  });

  final String id;
  final String label;
  final String blurb;
  final List<CodexRole> roles;
}

/// RoleId → default 3D bust. Same map the table uses.
const Map<String, String> kRoleBustAssets = ArtCatalog.roleBusts;

String? roleBustAsset(String roleId) => kRoleBustAssets[roleId];

String? roleIdForName(String name) {
  for (final role in kStandardRoles) {
    if (role.name == name) return role.id;
  }
  return null;
}

String factionLabelOf(String faction) {
  for (final group in kCodexFactions) {
    if (group.id == faction) return group.label;
  }
  return faction;
}

const List<CodexRole> kLighthouseRoles = [
  CodexRole(
    id: "tip",
    name: "線報",
    faction: "lighthouse",
    mnemonic: "燈亮釘一句",
    when: "燈亮",
    skill: "燈亮可以釘一句公開線報，唔佔你嘅發言。",
  ),
  CodexRole(
    id: "sweep",
    name: "掃頻",
    faction: "lighthouse",
    mnemonic: "熄燈查人",
    when: "熄燈",
    skill: "熄燈揀一個人，私下知道佢係消音定乾淨。",
  ),
  CodexRole(
    id: "cover",
    name: "掩護",
    faction: "lighthouse",
    mnemonic: "擋一夜",
    when: "熄燈",
    skill: "熄燈保一個人唔會被帶走。成功後下一夜唔可以再用。",
  ),
  CodexRole(
    id: "echo",
    name: "回波",
    faction: "lighthouse",
    mnemonic: "票走先有料",
    when: "有人被票走之後",
    skill: "有人被票走之後，你私下收到佢係邊個陣營。",
  ),
  CodexRole(
    id: "link",
    name: "通聯",
    faction: "lighthouse",
    mnemonic: "查上輪",
    when: "燈亮",
    skill: "燈亮揀一個人，知道佢上一輪用過技能未。",
  ),
  CodexRole(
    id: "civilian",
    name: "守燈",
    faction: "lighthouse",
    mnemonic: "冇技能",
    when: "冇",
    skill: "冇技能。你靠講一句、寫草稿同投票。",
  ),
];

const List<CodexRole> kSilenceRoles = [
  CodexRole(
    id: "silencer",
    name: "消音手",
    faction: "silence",
    mnemonic: "熄燈帶走",
    when: "熄燈",
    skill: "熄燈揀一個冇掩護嘅人，令佢離場。",
  ),
  CodexRole(
    id: "decoy",
    name: "假訊",
    faction: "silence",
    mnemonic: "整亂線報",
    when: "燈亮或熄燈",
    skill: "每局兩次。可以放一句假料，或者標一條線報未核實。",
  ),
  CodexRole(
    id: "plant",
    name: "影燈",
    faction: "silence",
    mnemonic: "第一次裝乾淨",
    when: "被查或者投票",
    skill: "第一次被掃頻會顯示乾淨。投票可以匿名一次。",
  ),
];

const List<CodexRole> kGreyRoles = [
  CodexRole(
    id: "warrant",
    name: "孤證",
    faction: "grey",
    mnemonic: "暗標兩個就贏",
    when: "隨時標，熄燈封口",
    skill: "暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。",
  ),
];

/// Unique Standard Mode roles, civilian once, grouped in faction order.
const List<CodexFactionGroup> kCodexFactions = [
  CodexFactionGroup(
    id: "lighthouse",
    label: "燈塔網",
    blurb: "消音組全部離場就贏。",
    roles: kLighthouseRoles,
  ),
  CodexFactionGroup(
    id: "silence",
    label: "消音組",
    blurb: "成功帶走 3 個人，或者燈塔網票唔到，就贏。",
    roles: kSilenceRoles,
  ),
  CodexFactionGroup(
    id: "grey",
    label: "灰頻",
    blurb: "孤證仍然在場，暗標中兩個消音就獨贏。",
    roles: kGreyRoles,
  ),
];

List<CodexRole> get kStandardRoles => [
      for (final group in kCodexFactions) ...group.roles,
    ];
