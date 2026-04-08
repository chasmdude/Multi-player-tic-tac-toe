import { Client, Session, type Socket } from '@heroiclabs/nakama-js';

// Nakama configuration using environment variables with sensible defaults
const NAKAMA_SERVER_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY || 'default-server-key';
const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || 'localhost';
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || '7350';
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === 'true' || window.location.protocol === 'https:';

// Initialize Nakama client
const client = new Client(NAKAMA_SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);

export interface NakamaConfig {
  host: string;
  port: number;
  useSSL: boolean;
}

/**
 * Authenticate user anonymously with Nakama
 */
export async function authenticateAnonymously(userId?: string): Promise<Session> {
  try {
    // Use provided userId or generate a unique device ID
    const deviceId = userId || `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${crypto.randomUUID()}`;
    const session = await client.authenticateDevice(deviceId, true);
    console.log('Nakama authentication successful:', session.user_id);
    return session;
  } catch (error) {
    console.error('Nakama authentication failed:', error);
    throw new Error('Failed to authenticate with Nakama');
  }
}

/**
 * Create a WebSocket socket for real-time communication
 */
export async function createSocket(session: Session) {
  try {
    const socket = client.createSocket();
    await socket.connect(session, true);
    console.log('WebSocket connected');
    return socket;
  } catch (error) {
    console.error('WebSocket connection failed:', error);
    throw new Error('Failed to connect to Nakama WebSocket');
  }
}

/**
 * Find or create a match via RPC
 */
interface RpcResponse {
  payload: Record<string, unknown>;
}

export async function findOrCreateMatch(
  session: Session,
  rpcId: string = 'find_or_create_match'
): Promise<string> {
  try {
    const response = await client.rpc(session, rpcId, {}) as RpcResponse;
    const payload = response.payload;
    const matchId = (payload?.match_id || payload?.matchId) as string | undefined;
    if (!matchId) {
      throw new Error('No match ID in RPC response');
    }
    console.log('Match found/created:', matchId);
    return matchId;
  } catch (error) {
    console.error('RPC find_or_create_match failed:', error);
    throw new Error('Failed to find or create match');
  }
}

/**
 * Join a match via WebSocket
 */
export async function joinMatch(
  socket: Socket,
  matchId: string
) {
  try {
    const result = await socket.joinMatch(matchId);
    return result;
  } catch (error) {
    console.error('Failed to join match:', error);
    throw new Error(`Failed to join match ${matchId}`);
  }
}

/**
 * Send a move to the server
 */
export async function sendMove(socket: Socket, matchId: string, position: number) {
  try {
    if (!socket) {
      throw new Error('Socket is not connected');
    }
    if (!matchId) {
      throw new Error('Match ID is not set');
    }
    const opCode = 3;
    const data = JSON.stringify({ position });
    console.log('sendMatchState called:', { matchId, opCode, data });
    await socket.sendMatchState(matchId, opCode, data);
    console.log('sendMatchState completed');
  } catch (error) {
    console.error('sendMove failed:', error);
    throw new Error('Failed to send move to server');
  }
}

/**
 * Leave a match
 */
export async function leaveMatch(socket: Socket, matchId: string) {
  try {
    await socket.leaveMatch(matchId);
    console.log('Left match:', matchId);
  } catch (error) {
    console.error('Failed to leave match:', error);
  }
}

export { client };
