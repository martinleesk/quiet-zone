export type Faction = "lighthouse" | "silence" | "grey";

export type RoleId =
  | "tip"
  | "sweep"
  | "cover"
  | "echo"
  | "link"
  | "civilian"
  | "silencer"
  | "decoy"
  | "plant"
  | "warrant";

export type Phase =
  | "lobby"
  | "boot"
  | "day_talk"
  | "draft"
  | "vote"
  | "resolve"
  | "night"
  | "check"
  | "ended";

export type NightActionName =
  | "disconnect"
  | "cover"
  | "sweep"
  | "mark"
  | "seal"
  | "skip";

export interface NightCommand {
  action: NightActionName;
  targetSeatId?: string;
}

export interface PublicSeat {
  id: string;
  nickname: string;
  isAi: boolean;
  alive: boolean;
  sealed: boolean;
}

export interface PublicPin {
  id: string;
  text: string;
  unverified: boolean;
}

export interface PublicSnapshot {
  mode: "standard";
  phase: Phase;
  phaseLabel: string;
  round: number;
  night: number;
  banner: string;
  composition: { lighthouse: number; silence: number; grey: number };
  seats: PublicSeat[];
  log: Array<{ text: string }>;
  pins: PublicPin[];
  disconnects: number;
  disconnectsToWin: number;
  winner: null | { faction: Faction; factionLabel: string; reason: string };
  hostSeatId: string | null;
}

export interface PrivateRole {
  id: RoleId;
  name: string;
  faction: Faction;
  factionLabel: string;
  skill: string;
}

export type SkillActionName = "pin" | "link" | "fake_flag" | "fake_plant";

export interface SkillChoice {
  action: SkillActionName;
  label: string;
  needsTarget: boolean;
  needsText: boolean;
}

export interface PrivateSnapshot {
  playerId: string;
  seatId: string | null;
  isHost: boolean;
  alive: boolean;
  canSpeak: boolean;
  canVote: boolean;
  ready: boolean;
  role: PrivateRole | null;
  teammates: Array<{ seatId: string; nickname: string; roleName: string }>;
  inbox: string[];
  nightActions: Array<{ action: NightActionName; label: string; needsTarget: boolean }>;
  skillActions: SkillChoice[];
  /** 影內應仲有一次匿名票可以用。 */
  anonymousVote: boolean;
  fakeCharges: number;
  votedSeatId: string | null;
  draft: string | null;
  marks: string[];
}

export interface StepResult {
  ok: true;
}

export interface StepError {
  ok: false;
  code: string;
  message: string;
}

export type Step = StepResult | StepError;
