import { recordException } from './crashlytics';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AppLogger {
  private isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

  /**
   * Log fine-grained debug information (suppressed in production builds).
   */
  debug(tag: string, message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.debug(`[${tag}] ${message}`, ...args);
    }
  }

  /**
   * Log general informational events (suppressed in production builds).
   */
  info(tag: string, message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.info(`[${tag}] ${message}`, ...args);
    }
  }

  /**
   * Log non-critical warnings.
   */
  warn(tag: string, message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.warn(`[${tag}] ${message}`, ...args);
    }
  }

  /**
   * Log critical errors and automatically record to Firebase Crashlytics on native platforms.
   */
  error(tag: string, message: string, error?: unknown, ...args: unknown[]): void {
    if (this.isDev) {
      console.error(`[${tag}] ${message}`, error, ...args);
    }
    recordException(`[${tag}] ${message}`, error);
  }
}

export const logger = new AppLogger();
