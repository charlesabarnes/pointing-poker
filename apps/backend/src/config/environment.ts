/**
 * Environment configuration for the backend server
 * Centralizes all configuration values with sensible defaults
 */

export interface ServerConfig {
  // Server settings
  port: number;
  nodeEnv: string;

  // WebSocket settings
  connectionCheckInterval: number;
  inactivityTimeout: number;

  // Session management
  sessionCleanupInterval: number;
  sessionInactivityThreshold: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableAccessLog: boolean;
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): ServerConfig {
  return {
    // Server settings
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // WebSocket settings (in milliseconds)
    connectionCheckInterval: parseInt(
      process.env.WS_CONNECTION_CHECK_INTERVAL || '30000',
      10
    ), // 30 seconds
    inactivityTimeout: parseInt(
      process.env.WS_INACTIVITY_TIMEOUT || '3600000',
      10
    ), // 1 hour

    // Session management (in milliseconds)
    sessionCleanupInterval: parseInt(
      process.env.SESSION_CLEANUP_INTERVAL || '3600000',
      10
    ), // 1 hour
    sessionInactivityThreshold: parseInt(
      process.env.SESSION_INACTIVITY_THRESHOLD || '86400000',
      10
    ), // 24 hours

    // Logging
    logLevel: (process.env.LOG_LEVEL as ServerConfig['logLevel']) || 'info',
    enableAccessLog: process.env.ENABLE_ACCESS_LOG === 'true' || process.env.NODE_ENV === 'production',
  };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: ServerConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.connectionCheckInterval < 1000) {
    console.warn('Connection check interval is very low (<1s). This may impact performance.');
  }

  if (config.sessionInactivityThreshold < config.sessionCleanupInterval) {
    console.warn('Session inactivity threshold is less than cleanup interval. Sessions may not be cleaned up properly.');
  }
}
