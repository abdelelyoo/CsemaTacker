import Dexie, { Table } from 'dexie';
import {
  Transaction,
  FeeRecord,
  CompanyProfile,
  ManagementMember,
  FinancialFigure,
  FinancialRatio,
  DividendRecord,
  Shareholder,
  CapitalEvent
} from './types';

export class AtlasPortfolioDB extends Dexie {
  transactions!: Table<Transaction>;
  fees!: Table<FeeRecord>;
  companies!: Table<CompanyProfile>;
  management!: Table<ManagementMember>;
  financialFigures!: Table<FinancialFigure>;
  financialRatios!: Table<FinancialRatio>;
  dividends!: Table<DividendRecord>;
  shareholders!: Table<Shareholder>;
  capitalEvents!: Table<CapitalEvent>;

  constructor() {
    super('AtlasPortfolioDB');

    // Version 2 (existing)
    (this as any).version(2).stores({
      transactions: '++id, parsedDate, Ticker, Operation, Company',
      fees: '++id, date, type'
    });

    // Version 3 (new profile data tables)
    (this as any).version(3).stores({
      transactions: '++id, parsedDate, Ticker, Operation, Company',
      fees: '++id, date, type',
      companies: '++id, ticker, name, sector',
      management: '++id, ticker, name',
      financialFigures: '++id, ticker, year',
      financialRatios: '++id, ticker, year',
      dividends: '++id, ticker, year, payment_date',
      shareholders: '++id, ticker, name',
      capitalEvents: '++id, ticker, date, event_type'
    });
  }
}

export const db = new AtlasPortfolioDB();