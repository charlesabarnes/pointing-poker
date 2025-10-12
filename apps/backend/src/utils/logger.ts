/**
 * Simple structured logger
 * In a production app, consider using Winston or Pino for advanced features
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

class Logger {
  private level: LogLevel = 'info';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error ? { error: error.message, stack: error.stack, ...context } : context;
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Connection lifecycle logging
  logConnection(sessionId: string, name?: string, fingerprint?: string): void {
    this.info('Client connected', { sessionId, name, fingerprint });
  }

  logDisconnect(sessionId: string, name?: string, reason?: string): void {
    this.info('Client disconnected', { sessionId, name, reason });
  }

  logMessage(type: string, sessionId: string, sender?: string): void {
    this.debug('Message received', { type, sessionId, sender });
  }

  // Session management logging
  logSessionCleanup(count: number, activeSessions: number): void {
    this.info('Session cleanup completed', { cleanedCount: count, activeSessions });
  }

  // Error logging
  logWebSocketError(sessionId: string, name?: string, error?: Error): void {
    this.error('WebSocket error', error, { sessionId, name });
  }
}

// Export singleton instance
export const logger = new Logger();
