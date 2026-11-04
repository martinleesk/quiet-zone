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
  lobbyReady: boolean;
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
  winner: null | {
    faction: Faction;
    factionLabel: string;
    reason: string;
    kind: "grey_marks" | "silence_disconnects" | "lighthouse_clear";
  };
  hostSeatId: string | null;
  /** True once Boot has started. No more joins. */
  locked: boolean;
  /** Whole seconds left in this phase. Null when the phase has no deadline. */
  secondsLeft: number | null;
  /** Seat identities. Null until the match has ended. */
  reveal: null | Array<{
    seatId: string;
    nickname: string;
    alive: boolean;
    roleId: RoleId;
    roleName: string;
    faction: Faction;
    factionLabel: string;
  }>;
}

export interface PrivateRole {
  id: RoleId;
  name: string;
  faction: Faction;
  factionLabel: string;
  skill: string;
  /** Short memory hook. Empty only for older packets. */
  mnemonic: string;
  /** When this skill is used, in plain language. */
  when: string;
}

export type SkillActionName = "pin" | "link" | "fake_flag" | "fake_plant" | "mark";

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
  /** True while this round's 封口 is in effect. Speech and day skills are off. */
  muted: boolean;
  /** One-round private card for the muted player. Null for everyone else. */
  sealCard: string | null;
  /** Secret that lets this human reclaim the seat after AI takeover. */
  reclaimToken: string | null;
  votedSeatId: string | null;
  draft: string | null;
  marks: string[];
  /** 消音組夜訊。其他陣營永遠係空陣列。 */
  silenceChannel: Array<{ seatId: string; nickname: string; text: string }>;
  tips: Array<{ id: string; text: string }>;
  secondsLeft: number | null;
  /** 回波師殘片，按時間順序。其他身分係空陣列。 */
  remnants: Array<{ nickname: string; factionLabel: string; text: string }>;
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
