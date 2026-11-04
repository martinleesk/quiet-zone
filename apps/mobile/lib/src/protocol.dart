class PublicSeat {
  const PublicSeat({
    required this.id,
    required this.nickname,
    required this.isAi,
    required this.alive,
    required this.sealed,
  });

  final String id;
  final String nickname;
  final bool isAi;
  final bool alive;
  final bool sealed;

  factory PublicSeat.fromJson(Map<String, dynamic> json) {
    return PublicSeat(
      id: json["id"]?.toString() ?? "",
      nickname: json["nickname"]?.toString() ?? "",
      isAi: json["isAi"] == true,
      alive: json["alive"] != false,
      sealed: json["sealed"] == true,
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
    required this.disconnects,
    required this.disconnectsToWin,
    required this.winner,
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
  final int disconnects;
  final int disconnectsToWin;
  final Winner? winner;

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
      disconnects: _asInt(json["disconnects"]),
      disconnectsToWin: _asInt(json["disconnectsToWin"], fallback: 3),
      winner: rawWinner is Map ? Winner.fromJson(Map<String, dynamic>.from(rawWinner)) : null,
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
