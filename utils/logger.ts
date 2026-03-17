type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

const isDevelopment = import.meta.env.DEV;

const DEFAULT_CONFIG: LoggerConfig = {
  level: isDevelopment ? 'debug' : 'warn',
  enableConsole: true,
  enableRemote: !isDevelopment,
};

class Logger {
  private config: LoggerConfig;
  private static instance: Logger;
  
  private constructor(config: LoggerConfig = DEFAULT_CONFIG) {
    this.config = config;
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4,
    };
    return levels[level] >= levels[this.config.level];
  }
  
  private formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
    return data !== undefined ? `${prefix} ${message}` : `${prefix} ${message}`;
  }
  
  debug(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog('debug')|| !this.config.enableConsole) return;
    console.debug(this.formatMessage('debug', context, message), data !== undefined ? data : '');
  }
  
  info(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog('info') || !this.config.enableConsole) return;
    console.info(this.formatMessage('info', context, message), data !== undefined ? data : '');
  }
  
  warn(context: string, message: string, data?: unknown): void {
    if (!this.shouldLog('warn') || !this.config.enableConsole) return;
    console.warn(this.formatMessage('warn', context, message), data !== undefined ? data : '');
  }
  
  error(context: string, message: string, error?: Error | unknown): void {
    if (!this.shouldLog('error')) return;
    
    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', context, message), error || '');
    }
    
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(context, message, error).catch(() => {
        // Silently fail remote logging
      });
    }
  }
  
  private async sendToRemote(context: string, message: string, error?: unknown): Promise<void> {
    if (!this.config.remoteEndpoint) return;
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          message,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // Silently fail
    }
  }
  
  group(label: string): void {
    if (isDevelopment && this.config.enableConsole) {
      console.group(label);
    }
  }
  
  groupEnd(): void {
    if (isDevelopment && this.config.enableConsole) {
      console.groupEnd();
    }
  }
  
  time(label: string): void {
    if (isDevelopment && this.config.enableConsole) {
      console.time(label);
    }
  }
  
  timeEnd(label: string): void {
    if (isDevelopment && this.config.enableConsole) {
      console.timeEnd(label);
    }
  }
}

export const logger = Logger.getInstance();

export const logContext = {
  PORTFOLIO: 'Portfolio',
  TRANSACTIONS: 'Transactions',
  BANK_OPS: 'BankOps',
  FEES: 'Fees',
  AUTH: 'Auth',
  API: 'API',
  DB: 'Database',
  SYNC: 'Sync',
  MARKET: 'MarketData',
  ANALYSIS: 'Analysis',
  AI: 'AI',
} as const;

export type LogContext = typeof logContext[keyof typeof logContext];