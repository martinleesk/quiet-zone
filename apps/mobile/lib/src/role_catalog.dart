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
  });

  final String id;
  final String name;
  final String faction;
  final String skill;

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
    name: "線報員",
    faction: "lighthouse",
    skill: "釘選殘訊：每個燈亮可釘一條公開資訊上時間線，唔佔發言格。",
  ),
  CodexRole(
    id: "sweep",
    name: "掃頻員",
    faction: "lighthouse",
    skill: "熄燈掃頻：私下得知目標係「消音痕跡」定「訊號乾淨」。",
  ),
  CodexRole(
    id: "cover",
    name: "掩護員",
    faction: "lighthouse",
    skill: "臨時掩護：免疫該夜失聯。成功後下一夜唔可以再成功。",
  ),
  CodexRole(
    id: "echo",
    name: "回波師",
    faction: "lighthouse",
    skill: "失聯回波：有人被投票隔離後，你私下收到陣營殘片。",
  ),
  CodexRole(
    id: "link",
    name: "通聯官",
    faction: "lighthouse",
    skill: "核對通聯：每個燈亮可查一人上回合用過主動技能未，唔會話你知係邊種。",
  ),
  CodexRole(
    id: "civilian",
    name: "燈塔閒職",
    faction: "lighthouse",
    skill: "無主動技能。你可以發言、草稿、投票。",
  ),
];

const List<CodexRole> kSilenceRoles = [
  CodexRole(
    id: "silencer",
    name: "消音手",
    faction: "silence",
    skill: "執行失聯：熄燈令一名未受掩護嘅玩家失聯移出。",
  ),
  CodexRole(
    id: "decoy",
    name: "假訊員",
    faction: "silence",
    skill: "投放假訊：每局兩次。可以將釘選標做待核實，或者放一句來源未核。",
  ),
  CodexRole(
    id: "plant",
    name: "影內應",
    faction: "silence",
    skill: "訊號霧：第一次被掃頻固定回「訊號乾淨」。每局一次匿名票。",
  ),
];

const List<CodexRole> kGreyRoles = [
  CodexRole(
    id: "warrant",
    name: "孤證客",
    faction: "grey",
    skill: "私密標記消音組。仍在場且正確標記達 2 即灰頻獨贏。每局可封口一人。",
  ),
];

/// Unique Standard Mode roles, civilian once, grouped in faction order.
const List<CodexFactionGroup> kCodexFactions = [
  CodexFactionGroup(
    id: "lighthouse",
    label: "燈塔網",
    blurb: "消音組全部離場就解封。",
    roles: kLighthouseRoles,
  ),
  CodexFactionGroup(
    id: "silence",
    label: "消音組",
    blurb: "成功失聯 3 次，或者燈塔網已無法投票。",
    roles: kSilenceRoles,
  ),
  CodexFactionGroup(
    id: "grey",
    label: "灰頻",
    blurb: "孤證客仍在場，正確標記消音組達 2 即獨贏。",
    roles: kGreyRoles,
  ),
];

List<CodexRole> get kStandardRoles => [
      for (final group in kCodexFactions) ...group.roles,
    ];
