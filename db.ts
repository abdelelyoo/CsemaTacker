import Dexie, { Table } from 'dexie';
import {
  Transaction,
  BankOperation,
  FeeRecord,
  CompanyProfile,
  ManagementMember,
  FinancialFigure,
  FinancialRatio,
  DividendRecord,
  Shareholder,
  CapitalEvent,
  TaxLot,
  UserSettings
} from './types';

export class AtlasPortfolioDB extends Dexie {
  transactions!: Table<Transaction>;
  bankOperations!: Table<BankOperation>;
  fees!: Table<FeeRecord>;
  companies!: Table<CompanyProfile>;
  management!: Table<ManagementMember>;
  financialFigures!: Table<FinancialFigure>;
  financialRatios!: Table<FinancialRatio>;
  dividends!: Table<DividendRecord>;
  shareholders!: Table<Shareholder>;
  capitalEvents!: Table<CapitalEvent>;
  taxLots!: Table<TaxLot>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('AtlasPortfolioDB');

    const baseStores = {
      transactions: '++id, parsedDate, Ticker, Operation, Company',
      fees: '++id, date, type'
    };

    const profileStores = {
      ...baseStores,
      companies: '++id, ticker, name, sector',
      management: '++id, ticker, name',
      financialFigures: '++id, ticker, year',
      financialRatios: '++id, ticker, year',
      dividends: '++id, ticker, year, payment_date',
      shareholders: '++id, ticker, name',
      capitalEvents: '++id, ticker, date, event_type'
    };

    const v4Stores = {
      ...profileStores,
      bankOperations: '++id, parsedDate, Operation, Category'
    };

    const v5Stores = {
      ...v4Stores,
      taxLots: '++id, ticker, purchaseDate',
      userSettings: '++id'
    };

    this.version(2).stores(baseStores);
    this.version(3).stores(profileStores);
    this.version(4).stores(v4Stores);
    this.version(5).stores(v5Stores);
  }
}

export const db = new AtlasPortfolioDB();