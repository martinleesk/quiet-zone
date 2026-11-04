class PublicSeat {
  const PublicSeat({
    required this.id,
    required this.nickname,
    required this.isAi,
    required this.alive,
    required this.sealed,
    this.lobbyReady = false,
  });

  final String id;
  final String nickname;
  final bool isAi;
  final bool alive;
  final bool sealed;
  final bool lobbyReady;

  factory PublicSeat.fromJson(Map<String, dynamic> json) {
    return PublicSeat(
      id: json["id"]?.toString() ?? "",
      nickname: json["nickname"]?.toString() ?? "",
      isAi: json["isAi"] == true,
      alive: json["alive"] != false,
      sealed: json["sealed"] == true,
      lobbyReady: json["lobbyReady"] == true,
    );
  }
}

class Composition {
  const Composition({required this.lighthouse, required this.silence, required this.grey});

  final int lighthouse;
  final int silence;
  final int grey;

  factory Composition.fromJson(Object? raw) {
    final json = raw is Map ? raw : const <String, dynamic>{};
    return Composition(
      lighthouse: _asInt(json["lighthouse"]),
      silence: _asInt(json["silence"]),
      grey: _asInt(json["grey"]),
    );
  }
}

class Winner {
  const Winner({required this.faction, required this.factionLabel, required this.reason});

  final String faction;
  final String factionLabel;
  final String reason;

  factory Winner.fromJson(Map<String, dynamic> json) {
    return Winner(
      faction: json["faction"]?.toString() ?? "",
      factionLabel: json["factionLabel"]?.toString() ?? "",
      reason: json["reason"]?.toString() ?? "",
    );
  }
}

class PinItem {
  const PinItem({required this.id, required this.text, required this.unverified});

  final String id;
  final String text;
  final bool unverified;

  factory PinItem.fromJson(Map<String, dynamic> json) {
    return PinItem(
      id: json["id"]?.toString() ?? "",
      text: json["text"]?.toString() ?? "",
      unverified: json["unverified"] == true,
    );
  }
}

class PublicView {
  const PublicView({
    required this.code,
    required this.phase,
    required this.phaseLabel,
    required this.round,
    required this.night,
    required this.banner,
    required this.composition,
    required this.seats,
    required this.log,
    this.pins = const [],
    required this.disconnects,
    required this.disconnectsToWin,
    required this.winner,
    this.locked = false,
  });

  final String code;
  final String phase;
  final String phaseLabel;
  final int round;
  final int night;
  final String banner;
  final Composition composition;
  final List<PublicSeat> seats;
  final List<String> log;
  final List<PinItem> pins;
  final int disconnects;
  final int disconnectsToWin;
  final Winner? winner;
  final bool locked;

  factory PublicView.fromJson(Map<String, dynamic> json) {
    final seats = <PublicSeat>[];
    final rawSeats = json["seats"];
    if (rawSeats is List) {
      for (final seat in rawSeats) {
        if (seat is Map) seats.add(PublicSeat.fromJson(Map<String, dynamic>.from(seat)));
      }
    }
    final log = <String>[];
    final rawLog = json["log"];
    if (rawLog is List) {
      for (final line in rawLog) {
        if (line is Map && line["text"] != null) log.add(line["text"].toString());
      }
    }
    final rawWinner = json["winner"];
    final pins = <PinItem>[];
    final rawPins = json["pins"];
    if (rawPins is List) {
      for (final pin in rawPins) {
        if (pin is Map) pins.add(PinItem.fromJson(Map<String, dynamic>.from(pin)));
      }
    }
    return PublicView(
      code: json["code"]?.toString() ?? "",
      phase: json["phase"]?.toString() ?? "",
      phaseLabel: json["phaseLabel"]?.toString() ?? "",
      round: _asInt(json["round"]),
      night: _asInt(json["night"]),
      banner: json["banner"]?.toString() ?? "",
      composition: Composition.fromJson(json["composition"]),
      seats: seats,
      log: log,
      pins: pins,
      disconnects: _asInt(json["disconnects"]),
      disconnectsToWin: _asInt(json["disconnectsToWin"], fallback: 3),
      winner: rawWinner is Map ? Winner.fromJson(Map<String, dynamic>.from(rawWinner)) : null,
      locked: json["locked"] == true,
    );
  }
}

class PrivateRole {
  const PrivateRole({
    required this.id,
    required this.name,
    required this.faction,
    required this.factionLabel,
    required this.skill,
  });

  final String id;
  final String name;
  final String faction;
  final String factionLabel;
  final String skill;

  factory PrivateRole.fromJson(Map<String, dynamic> json) {
    return PrivateRole(
      id: json["id"]?.toString() ?? "",
      name: json["name"]?.toString() ?? "",
      faction: json["faction"]?.toString() ?? "",
      factionLabel: json["factionLabel"]?.toString() ?? "",
      skill: json["skill"]?.toString() ?? "",
    );
  }
}

class Teammate {
  const Teammate({required this.seatId, required this.nickname, required this.roleName});

  final String seatId;
  final String nickname;
  final String roleName;

  factory Teammate.fromJson(Map<String, dynamic> json) {
    return Teammate(
      seatId: json["seatId"]?.toString() ?? "",
      nickname: json["nickname"]?.toString() ?? "",
      roleName: json["roleName"]?.toString() ?? "",
    );
  }
}

class NightChoice {
  const NightChoice({required this.action, required this.label, required this.needsTarget});

  final String action;
  final String label;
  final bool needsTarget;

  factory NightChoice.fromJson(Map<String, dynamic> json) {
    return NightChoice(
      action: json["action"]?.toString() ?? "",
      label: json["label"]?.toString() ?? "",
      needsTarget: json["needsTarget"] == true,
    );
  }
}

class SilenceNote {
  const SilenceNote({required this.seatId, required this.nickname, required this.text});

  final String seatId;
  final String nickname;
  final String text;

  factory SilenceNote.fromJson(Map<String, dynamic> json) {
    return SilenceNote(
      seatId: json["seatId"]?.toString() ?? "",
      nickname: json["nickname"]?.toString() ?? "",
      text: json["text"]?.toString() ?? "",
    );
  }
}

class PhaseTip {
  const PhaseTip({required this.id, required this.text});

  final String id;
  final String text;

  factory PhaseTip.fromJson(Map<String, dynamic> json) {
    return PhaseTip(
      id: json["id"]?.toString() ?? "",
      text: json["text"]?.toString() ?? "",
    );
  }
}

class PrivateView {
  const PrivateView({
    required this.playerId,
    required this.seatId,
    required this.isHost,
    required this.alive,
    required this.canSpeak,
    required this.canVote,
    required this.ready,
    required this.role,
    required this.teammates,
    required this.inbox,
    required this.nightActions,
    this.skillActions = const [],
    this.anonymousVote = false,
    this.fakeCharges = 0,
    this.muted = false,
    this.sealCard,
    this.reclaimToken,
    this.silenceChannel = const [],
    this.tips = const [],
    required this.marks,
  });

  final String playerId;
  final String? seatId;
  final bool isHost;
  final bool alive;
  final bool canSpeak;
  final bool canVote;
  final bool ready;
  final PrivateRole? role;
  final List<Teammate> teammates;
  final List<String> inbox;
  final List<NightChoice> nightActions;
  final List<NightChoice> skillActions;
  final bool anonymousVote;
  final int fakeCharges;
  final bool muted;
  final String? sealCard;
  final String? reclaimToken;
  final List<SilenceNote> silenceChannel;
  final List<PhaseTip> tips;
  final List<String> marks;

  factory PrivateView.fromJson(Map<String, dynamic> json) {
    final rawRole = json["role"];
    return PrivateView(
      playerId: json["playerId"]?.toString() ?? "",
      seatId: json["seatId"]?.toString(),
      isHost: json["isHost"] == true,
      alive: json["alive"] != false,
      canSpeak: json["canSpeak"] == true,
      canVote: json["canVote"] == true,
      ready: json["ready"] == true,
      role: rawRole is Map ? PrivateRole.fromJson(Map<String, dynamic>.from(rawRole)) : null,
      teammates: _maps(json["teammates"]).map(Teammate.fromJson).toList(),
      inbox: _strings(json["inbox"]),
      nightActions: _maps(json["nightActions"]).map(NightChoice.fromJson).toList(),
      skillActions: _maps(json["skillActions"]).map(NightChoice.fromJson).toList(),
      anonymousVote: json["anonymousVote"] == true,
      fakeCharges: _asInt(json["fakeCharges"]),
      muted: json["muted"] == true,
      sealCard: json["sealCard"]?.toString(),
      reclaimToken: json["reclaimToken"]?.toString(),
      silenceChannel: _maps(json["silenceChannel"]).map(SilenceNote.fromJson).toList(),
      tips: _maps(json["tips"]).map(PhaseTip.fromJson).toList(),
      marks: _strings(json["marks"]),
    );
  }
}

class GameSnapshot {
  const GameSnapshot({required this.public, required this.private});

  final PublicView public;
  final PrivateView private;

  factory GameSnapshot.fromJson(Map<String, dynamic> json) {
    final rawPublic = json["public"];
    final rawPrivate = json["private"];
    return GameSnapshot(
      public: PublicView.fromJson(rawPublic is Map ? Map<String, dynamic>.from(rawPublic) : const {}),
      private: PrivateView.fromJson(rawPrivate is Map ? Map<String, dynamic>.from(rawPrivate) : const {}),
    );
  }
}

class GameError {
  const GameError({required this.code, required this.message});

  final String code;
  final String message;
}

sealed class ServerMessage {}

class SnapshotMessage extends ServerMessage {
  SnapshotMessage(this.snapshot);
  final GameSnapshot snapshot;
}

class ErrorMessage extends ServerMessage {
  ErrorMessage(this.error);
  final GameError error;
}

ServerMessage? parseServerMessage(Map<String, dynamic> json) {
  final type = json["type"]?.toString();
  if (type == "state") return SnapshotMessage(GameSnapshot.fromJson(json));
  if (type == "error") {
    return ErrorMessage(GameError(
      code: json["code"]?.toString() ?? "",
      message: json["message"]?.toString() ?? "發生錯誤。",
    ));
  }
  return null;
}

int _asInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return fallback;
}

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return [
    for (final item in raw)
      if (item is Map) Map<String, dynamic>.from(item),
  ];
}

List<String> _strings(Object? raw) {
  if (raw is! List) return const [];
  return [for (final item in raw) item.toString()];
}
