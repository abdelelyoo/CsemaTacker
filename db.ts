import Dexie, { Table } from 'dexie';
import { Transaction } from './types';

export class AtlasPortfolioDB extends Dexie {
  transactions!: Table<Transaction>;

  constructor() {
    super('AtlasPortfolioDB');
    (this as any).version(1).stores({
      transactions: '++id, parsedDate, Ticker, Operation, Company' // Primary key and indexed props
    });
  }
}

export const db = new AtlasPortfolioDB();