import Dexie, { Table } from 'dexie';
import { Transaction, FeeRecord } from './types';

export class AtlasPortfolioDB extends Dexie {
  transactions!: Table<Transaction>;
  fees!: Table<FeeRecord>;

  constructor() {
    super('AtlasPortfolioDB');
    (this as any).version(1).stores({
      transactions: '++id, parsedDate, Ticker, Operation, Company', // Primary key and indexed props
      fees: '++id, date, type'
    });
  }
}

export const db = new AtlasPortfolioDB();