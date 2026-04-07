import { Client, Session } from '@heroiclabs/nakama-js';

// Initialize Nakama client
const client = new Client('defaultkey', 'localhost', 7350);
client.ssl = false;

export interface NakamaConfig {
  host: string;
  port: number;
  useSSL: boolean;
}

/**
 * Authenticate user anonymously with Nakama
 */
export async function authenticateAnonymously(): Promise<Session> {
  try {
    const session = await client.authenticateCustom(
      `anonymous_${Date.now()}_${Math.random()}`
    );
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
    await socket.connect(session);
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
export async function findOrCreateMatch(
  session: Session,
  rpcId: string = 'find_or_create_match'
): Promise<string> {
  try {
    const response = await client.rpc(session, rpcId, {});
    const matchId = response.payload?.match_id || response.payload?.matchId;
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
  socket: any,
  matchId: string
): Promise<{ matchId: string; presences: any[] }> {
  try {
    const result = await socket.joinMatch(matchId);
    console.log('Joined match:', matchId);
    return result;
  } catch (error) {
    console.error('Failed to join match:', error);
    throw new Error(`Failed to join match ${matchId}`);
  }
}

/**
 * Send a move to the server
 */
export async function sendMove(socket: any, matchId: string, position: number) {
  try {
    const opCode = 3; // MAKE_MOVE opcode
    const data = JSON.stringify({ position });
    await socket.sendMatchData(matchId, opCode, data);
  } catch (error) {
    console.error('Failed to send move:', error);
    throw new Error('Failed to send move to server');
  }
}

/**
 * Leave a match
 */
export async function leaveMatch(socket: any, matchId: string) {
  try {
    await socket.leaveMatch(matchId);
    console.log('Left match:', matchId);
  } catch (error) {
    console.error('Failed to leave match:', error);
  }
}

export { client };
