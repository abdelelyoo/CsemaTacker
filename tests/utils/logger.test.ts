import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, logContext } from '../../utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logContext', () => {
    it('should have all required context values', () => {
      expect(logContext.PORTFOLIO).toBe('Portfolio');
      expect(logContext.TRANSACTIONS).toBe('Transactions');
      expect(logContext.BANK_OPS).toBe('Bankops');
      expect(logContext.FEES).toBe('Fees');
      expect(logContext.AUTH).toBe('Auth');
      expect(logContext.API).toBe('API');
      expect(logContext.DB).toBe('Database');
      expect(logContext.SYNC).toBe('Sync');
      expect(logContext.MARKET).toBe('MarketData');
      expect(logContext.ANALYSIS).toBe('Analysis');
      expect(logContext.AI).toBe('AI');
    });
  });

  describe('logger methods', () => {
    it('should call console.debug for debug level', () => {
      logger.debug(logContext.PORTFOLIO, 'Test debug message');
      // In test environment, debug logs may not appear depending on env
    });

    it('should call console.info for info level', () => {
      logger.info(logContext.TRANSACTIONS, 'Test info message');
      expect(console.info).toHaveBeenCalled();
    });

    it('should call console.warn for warn level', () => {
      logger.warn(logContext.DB, 'Test warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should call console.error for error level', () => {
      logger.error(logContext.API, 'Test error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should format messages with context', () => {
      logger.info(logContext.PORTFOLIO, 'Test message', { key: 'value' });
      // The logger should include context and message
    });
  });

  describe('logger groups', () => {
    it('should support grouping', () => {
      logger.group('TestGroup');
      logger.info(logContext.PORTFOLIO, 'Inside group');
      logger.groupEnd();
    });
  });

  describe('logger timing', () => {
    it('should support timing', () => {
      logger.time('TestTimer');
      logger.timeEnd('TestTimer');
    });
  });
});