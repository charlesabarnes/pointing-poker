/**
 * Special content values used in WebSocket messages
 */
export const SPECIAL_CONTENT = {
  SPECTATE: 'spectate',
  DISCONNECT: 'disconnect',
  TIMEOUT: 'timeout',
  CLEAR_VOTES: 'ClearVotes', // Backwards compatibility - to be deprecated
} as const;

export type SpecialContent = typeof SPECIAL_CONTENT[keyof typeof SPECIAL_CONTENT];

/**
 * Extended WebSocket interface used by the backend
 */
export interface ExtWebSocket {
  isAlive: boolean;
  session?: string;
  name?: string;
  content?: string | number;
  fingerprint?: string;
  lastActivity?: number;
  missedHeartbeats: number;
  lastHeartbeat: number;
  offlineSince?: number;
}

/**
 * User activity status
 */
export type UserStatus = 'online' | 'afk' | 'offline';

/**
 * User activity tracking
 */
export interface UserActivity {
  lastActive: number;
  status: UserStatus;
}

/**
 * Point values mapping for users
 */
export interface PointValues {
  [username: string]: string | number | undefined;
}

/**
 * Point option configuration
 */
export interface PointOption {
  label: string;
  value: number;
  disabled?: boolean;
}

/**
 * Timer status
 */
export type TimerStatus = 'idle' | 'running' | 'paused';

/**
 * Timer state for synchronized countdown
 */
export interface TimerState {
  duration: number; // Total duration in seconds
  remainingTime: number; // Remaining time in seconds
  status: TimerStatus;
  startedAt?: number; // Timestamp when timer started
  pausedAt?: number; // Timestamp when timer was paused
}

/**
 * Session state snapshot for synchronization
 * Used in STATE_SYNC messages to send complete session state to clients
 */
export interface SessionState {
  votes: Record<string, string | number | undefined>; // fingerprint -> vote
  votesRevealed: boolean;
  description: string;
  participants: {
    fingerprint: string;
    name: string;
  }[];
  timerState?: TimerState;
}
