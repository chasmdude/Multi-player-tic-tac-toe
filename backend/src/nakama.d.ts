// Minimal Nakama Server Runtime Type Declarations
// Based on: https://github.com/heroiclabs/nakama-common

declare namespace nkruntime {
  export interface Context {
    env: { [key: string]: string };
    executionMode: ExecutionMode;
    node: string;
    version: string;
    headers: { [key: string]: string[] };
    queryParams: { [key: string]: string[] };
    userId: string;
    username: string;
    vars: { [key: string]: string };
    userSessionExp: number;
    sessionId: string;
    clientIp: string;
    clientPort: string;
    matchId: string;
    matchNode: string;
    matchLabel: string;
    matchTickRate: number;
  }

  export enum ExecutionMode {
    Event = 'event',
    Match = 'match',
    MatchHandler = 'match_handler',
    Matchmaker = 'matchmaker',
    RPC = 'rpc',
    Before = 'before',
    After = 'after',
  }

  export interface Logger {
    debug(format: string, ...params: any[]): void;
    info(format: string, ...params: any[]): void;
    warn(format: string, ...params: any[]): void;
    error(format: string, ...params: any[]): void;
  }

  export interface Nakama {
    leaderboardCreate(
      id: string, authoritative: boolean, sortOrder: SortOrder,
      operator: Operator, resetSchedule: null | string, metadata: null | { [key: string]: any }
    ): void;
    leaderboardRecordWrite(
      ctx: Context, logger: Logger, id: string, owner: string,
      username: string, score: number, subscore: number, metadata: { [key: string]: any }
    ): LeaderboardRecord;
    leaderboardRecordsList(
      ctx: Context, logger: Logger, id: string, ownerIds: string[],
      limit: number, cursor: string, expiry: number
    ): LeaderboardRecordList;
  }

  export interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    metadata: { [key: string]: any };
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
  }

  export interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  export enum SortOrder {
    Ascending = 'asc',
    Descending = 'desc',
  }

  export enum Operator {
    Best = 'best',
    Set = 'set',
    Incr = 'incr',
    Decr = 'decr',
  }

  export interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status: string;
  }

  export interface MatchMessage {
    sender: Presence;
    persistence: boolean;
    status: string;
    opCode: number;
    data: string;
    reliable: boolean;
    receiveTime: number;
  }

  export interface MatchDispatcher {
    broadcastMessage(opCode: number, data: string | null, presences: Presence[] | null, sender: Presence | null, reliable?: boolean): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  export interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
    tickRate: number;
    handlerName: string;
  }

  export interface MatchState {}
}

// Nakama global runtime object
declare var nakama: nkruntime.Nakama;

// Function signatures expected by Nakama module system
type InitModule = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: Initializer
) => void;

interface Initializer {
  registerRpc(id: string, func: RpcFunction): void;
  registerMatch<T extends nkruntime.MatchState>(name: string, handlers: MatchHandler<T>): void;
  registerMatchmakerMatched(func: MatchmakerMatchedFunction): void;
}

type RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
) => string | void;

type MatchmakerMatchedFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: MatchmakerResult[]
) => string | void;

interface MatchmakerResult {
  presence: nkruntime.Presence;
  properties: { [key: string]: string | number | boolean };
}

interface MatchHandler<T extends nkruntime.MatchState> {
  matchInit: MatchInitFunction<T>;
  matchJoinAttempt: MatchJoinAttemptFunction<T>;
  matchJoin: MatchJoinFunction<T>;
  matchLeave: MatchLeaveFunction<T>;
  matchLoop: MatchLoopFunction<T>;
  matchSignal: MatchSignalFunction<T>;
  matchTerminate: MatchTerminateFunction<T>;
}

type MatchInitFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: string }
) => { state: T; tickRate: number; label: string };

type MatchJoinAttemptFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  presence: nkruntime.Presence, metadata: { [key: string]: any }
) => { state: T; accept: boolean; rejectMessage?: string } | null;

type MatchJoinFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  presences: nkruntime.Presence[]
) => { state: T } | null;

type MatchLeaveFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  presences: nkruntime.Presence[]
) => { state: T } | null;

type MatchLoopFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  messages: nkruntime.MatchMessage[]
) => { state: T } | null;

type MatchSignalFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  data: string
) => { state: T; data: string } | null;

type MatchTerminateFunction<T> = (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number, state: T,
  graceSeconds: number
) => { state: T } | null;
