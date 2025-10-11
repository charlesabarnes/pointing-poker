/**
 * Extended WebSocket interface used by the backend
 */
export interface ExtWebSocket {
  isAlive: boolean;
  session?: string;
  name?: string;
  content?: string | number;
}

/**
 * User activity status
 */
export type UserStatus = 'online' | 'away' | 'offline';

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
