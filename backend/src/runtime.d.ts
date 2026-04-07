declare namespace nkruntime {
  enum SortOrder {
    Ascending = 0,
    Descending = 1,
  }

  enum Operator {
    NoOp = 0,
    Incr = 1,
    Decr = 2,
    Set = 3,
    Min = 4,
    Max = 5,
    Mul = 6,
  }

  interface Context {
    userId: string;
    username: string;
    sessionExpiry: number;
    userProperties: Record<string, string>;
  }

  interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    hidden: boolean;
    persistence: boolean;
    reason: number;
  }

  interface MatchData {
    matchId: string;
    presence: Presence;
    opCode: number;
    data: Uint8Array | string;
    reliable: boolean;
    receiveTime: number;
  }

  interface MatchPresenceEvent {
    joins?: Presence[];
    leaves?: Presence[];
  }

  interface Match {
    match_id: string;
    authoritative: boolean;
    label: string;
    size: number;
    tick_rate: number;
    handler_name: string;
    creation_time: number;
  }

  interface Nakama {
    matchList(limit: number, authoritative: boolean, label: string | null, filters: Record<string, unknown>, cursor: string | null): Match[];
    matchCreate(module: string, params?: Record<string, unknown>): string;
    leaderboardCreate(id: string, authoritative: boolean, sortOrder: SortOrder, operator: Operator, resetSchedule: string | null, metadata: Record<string, unknown> | null): void;
  }

  interface MatchState {
    [key: string]: any;
  }
}

declare interface Initializer {
  registerMatch<T>(name: string, handlers: any): void;
  registerRpc(id: string, handler: (ctx: any, logger: any, nk: any, payload: string) => string): void;
}