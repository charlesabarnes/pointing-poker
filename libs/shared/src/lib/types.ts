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
