import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../db';
import type {
  Transaction,
  BankOperation,
  FeeRecord,
  CompanyProfile,
  ManagementMember,
  FinancialFigure,
  FinancialRatio,
  DividendRecord,
  Shareholder,
  CapitalEvent
} from '../types';

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// ==================== TRANSACTIONS ====================

export const getTransactions = async (): Promise<Transaction[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    // Fallback to local Dexie
    return await db.trades.toArray();
  }

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('parsed_date', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return data.map(t => ({
    id: t.id,
    Date: t.date,
    Company: t.company,
    ISIN: t.isin,
    Operation: t.operation,
    Ticker: t.ticker,
    Qty: t.qty,
    Price: t.price,
    Total: t.total,
    Fees: t.fees === 0 ? null : t.fees,
    Tax: t.tax === 0 ? null : t.tax,
    RealizedPL: t.realized_pl === 0 ? null : t.realized_pl,
    parsedDate: new Date(t.parsed_date)
  }));
};

export const addTransaction = async (transaction: Transaction): Promise<Transaction> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    const id = await db.trades.add(transaction);
    return { ...transaction, id };
  }

  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: userId,
      date: transaction.Date,
      company: transaction.Company,
      isin: transaction.ISIN,
      operation: transaction.Operation,
      ticker: transaction.Ticker,
      qty: transaction.Qty,
      price: transaction.Price,
      total: transaction.Total,
      fees: transaction.Fees === undefined ? null : transaction.Fees,
      tax: transaction.Tax === undefined ? null : transaction.Tax,
      realized_pl: transaction.RealizedPL === undefined ? null : transaction.RealizedPL,
      parsed_date: transaction.parsedDate.toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }

  return {
    id: data.id,
    Date: data.date,
    Company: data.company,
    ISIN: data.isin,
    Operation: data.operation,
    Ticker: data.ticker,
    Qty: data.qty,
    Price: data.price,
    Total: data.total,
    Fees: data.fees,
    Tax: data.tax,
    RealizedPL: data.realized_pl,
    parsedDate: new Date(data.parsed_date)
  };
};

export const addTransactions = async (trades: Transaction[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.trades.bulkAdd(trades);
    return;
  }

  const records = trades.map(t => ({
    user_id: userId,
    date: t.Date,
    company: t.Company,
    isin: t.ISIN,
    operation: t.Operation,
    ticker: t.Ticker,
    qty: t.Qty,
    price: t.Price,
    total: t.Total,
    fees: t.Fees === undefined ? null : t.Fees,
    tax: t.Tax === undefined ? null : t.Tax,
    realized_pl: t.RealizedPL === undefined ? null : t.RealizedPL,
    parsed_date: t.parsedDate.toISOString().split('T')[0]
  }));

  const { error } = await supabase.from('trades').insert(records);
  
  if (error) {
    console.error('Error adding trades:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string | number): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.trades.delete(id as number);
    return;
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const clearTransactions = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.trades.clear();
    return;
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing trades:', error);
    throw error;
  }
};

// ==================== FEES ====================

export const getFees = async (): Promise<FeeRecord[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.fees.toArray();
  }

  const { data, error } = await supabase
    .from('fees_v2')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching fees:', error);
    return [];
  }

  return data.map(f => ({
    id: f.id,
    date: new Date(f.date),
    type: f.type,
    amount: f.amount,
    description: f.description
  }));
};

export const addFee = async (fee: FeeRecord): Promise<FeeRecord> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    const id = await db.fees.add(fee);
    return { ...fee, id };
  }

  const { data, error } = await supabase
    .from('fees_v2')
    .insert({
      user_id: userId,
      date: fee.date.toISOString().split('T')[0],
      type: fee.type,
      amount: fee.amount,
      description: fee.description
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding fee:', error);
    throw error;
  }

  return {
    id: data.id,
    date: new Date(data.date),
    type: data.type,
    amount: data.amount,
    description: data.description
  };
};

export const addFees = async (fees: FeeRecord[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.fees.bulkAdd(fees);
    return;
  }

  const records = fees.map(f => ({
    user_id: userId,
    date: f.date.toISOString().split('T')[0],
    type: f.type,
    amount: f.amount,
    description: f.description
  }));

  const { error } = await supabase.from('fees_v2').insert(records);
  
  if (error) {
    console.error('Error adding fees:', error);
    throw error;
  }
};

export const clearFees = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.fees.clear();
    return;
  }

  const { error } = await supabase
    .from('fees_v2')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing fees:', error);
    throw error;
  }
};

export const deleteFee = async (id: number | string): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.fees.delete(id as number);
    return;
  }

  const { error } = await supabase
    .from('fees_v2')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting fee:', error);
    throw error;
  }
};

// ==================== BANK OPERATIONS ====================

export const getBankOperations = async (): Promise<BankOperation[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.bankOperations?.toArray() || [];
  }

  const { data, error } = await supabase
    .from('bank_ops')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching bank operations:', error);
    return [];
  }

  return data.map(op => ({
    id: op.id,
    Date: op.date,
    parsedDate: new Date(op.parsed_date),
    Operation: op.operation,
    Description: op.description,
    Amount: op.amount,
    Category: op.category,
    Reference: op.reference
  }));
};

export const addBankOperation = async (operation: BankOperation): Promise<BankOperation> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    const id = await db.bankOperations?.add(operation);
    return { ...operation, id };
  }

  const { data, error } = await supabase
    .from('bank_ops')
    .insert({
      user_id: userId,
      date: operation.Date,
      parsed_date: operation.parsedDate.toISOString().split('T')[0],
      operation: operation.Operation,
      description: operation.Description,
      amount: operation.Amount,
      category: operation.Category,
      reference: operation.Reference
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding bank operation:', error);
    throw error;
  }

  return {
    id: data.id,
    Date: data.date,
    parsedDate: new Date(data.parsed_date),
    Operation: data.operation,
    Description: data.description,
    Amount: data.amount,
    Category: data.category,
    Reference: data.reference
  };
};

export const deleteBankOperation = async (id: string | number): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.bankOperations?.delete(id as number);
    return;
  }

  const { error } = await supabase
    .from('bank_ops')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting bank operation:', error);
    throw error;
  }
};

export const clearBankOperations = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.bankOperations?.clear();
    return;
  }

  const { error } = await supabase
    .from('bank_ops')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing bank operations:', error);
    throw error;
  }
};

// ==================== COMPANY PROFILES ====================

export const getCompanies = async (): Promise<CompanyProfile[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.companies.toArray();
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  return data.map(c => ({
    id: c.id,
    ticker: c.ticker,
    name: c.name,
    sector: c.sector,
    headquarters: c.headquarters,
    website: c.website,
    phone: c.phone,
    fax: c.fax,
    auditors: c.auditors,
    date_of_incorporation: c.date_of_incorporation,
    introduction_date_bourse: c.introduction_date_bourse,
    fiscal_year_duration_months: c.fiscal_year_duration_months,
    investor_relations_person: c.investor_relations_person,
    investor_relations_email: c.investor_relations_email,
    investor_relations_phone: c.investor_relations_phone,
    flottant: c.flottant
  }));
};

export const getCompanyByTicker = async (ticker: string): Promise<CompanyProfile | undefined> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.companies.where('ticker').equals(ticker).first();
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker)
    .single();

  if (error || !data) {
    return undefined;
  }

  return {
    id: data.id,
    ticker: data.ticker,
    name: data.name,
    sector: data.sector,
    headquarters: data.headquarters,
    website: data.website,
    phone: data.phone,
    fax: data.fax,
    auditors: data.auditors,
    date_of_incorporation: data.date_of_incorporation,
    introduction_date_bourse: data.introduction_date_bourse,
    fiscal_year_duration_months: data.fiscal_year_duration_months,
    investor_relations_person: data.investor_relations_person,
    investor_relations_email: data.investor_relations_email,
    investor_relations_phone: data.investor_relations_phone,
    flottant: data.flottant
  };
};

export const addCompany = async (company: CompanyProfile): Promise<CompanyProfile> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    const id = await db.companies.add(company);
    return { ...company, id };
  }

  const { data, error } = await supabase
    .from('companies')
    .upsert({
      user_id: userId,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
      headquarters: company.headquarters,
      website: company.website,
      phone: company.phone,
      fax: company.fax,
      auditors: company.auditors,
      date_of_incorporation: company.date_of_incorporation,
      introduction_date_bourse: company.introduction_date_bourse,
      fiscal_year_duration_months: company.fiscal_year_duration_months,
      investor_relations_person: company.investor_relations_person,
      investor_relations_email: company.investor_relations_email,
      investor_relations_phone: company.investor_relations_phone,
      flottant: company.flottant
    }, { onConflict: 'ticker' })
    .select()
    .single();

  if (error) {
    console.error('Error adding company:', error);
    throw error;
  }

  return {
    id: data.id,
    ticker: data.ticker,
    name: data.name,
    sector: data.sector,
    headquarters: data.headquarters,
    website: data.website,
    phone: data.phone,
    fax: data.fax,
    auditors: data.auditors,
    date_of_incorporation: data.date_of_incorporation,
    introduction_date_bourse: data.introduction_date_bourse,
    fiscal_year_duration_months: data.fiscal_year_duration_months,
    investor_relations_person: data.investor_relations_person,
    investor_relations_email: data.investor_relations_email,
    investor_relations_phone: data.investor_relations_phone,
    flottant: data.flottant
  };
};

// ==================== MANAGEMENT ====================

export const getManagementByTicker = async (ticker: string): Promise<ManagementMember[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.management.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('management')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching management:', error);
    return [];
  }

  return data.map(m => ({
    id: m.id,
    ticker: m.ticker,
    role: m.role,
    name: m.name
  }));
};

export const addManagement = async (members: ManagementMember[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.management.bulkAdd(members);
    return;
  }

  const records = members.map(m => ({
    user_id: userId,
    ticker: m.ticker,
    role: m.role,
    name: m.name
  }));

  const { error } = await supabase.from('management').insert(records);
  
  if (error) {
    console.error('Error adding management:', error);
    throw error;
  }
};

// ==================== FINANCIAL FIGURES ====================

export const getFinancialFiguresByTicker = async (ticker: string): Promise<FinancialFigure[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.financialFigures.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('financial_figures')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching financial figures:', error);
    return [];
  }

  return data.map(f => ({
    id: f.id,
    ticker: f.ticker,
    year: f.year,
    consolidated_accounts: f.consolidated_accounts,
    revenue: f.revenue,
    operating_income: f.operating_income,
    net_income_group_share: f.net_income_group_share,
    shareholders_equity: f.shareholders_equity,
    shares_outstanding: f.shares_outstanding,
    capital_social: f.capital_social
  }));
};

export const addFinancialFigures = async (figures: FinancialFigure[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.financialFigures.bulkAdd(figures);
    return;
  }

  const records = figures.map(f => ({
    user_id: userId,
    ticker: f.ticker,
    year: f.year,
    consolidated_accounts: f.consolidated_accounts,
    revenue: f.revenue,
    operating_income: f.operating_income,
    net_income_group_share: f.net_income_group_share,
    shareholders_equity: f.shareholders_equity,
    shares_outstanding: f.shares_outstanding,
    capital_social: f.capital_social
  }));

  const { error } = await supabase.from('financial_figures').upsert(records);
  
  if (error) {
    console.error('Error adding financial figures:', error);
    throw error;
  }
};

// ==================== FINANCIAL RATIOS ====================

export const getFinancialRatiosByTicker = async (ticker: string): Promise<FinancialRatio[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.financialRatios.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('financial_ratios')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching financial ratios:', error);
    return [];
  }

  return data.map(r => ({
    id: r.id,
    ticker: r.ticker,
    year: r.year,
    eps_bpa: r.eps_bpa,
    roe_percent: r.roe_percent,
    per: r.per,
    pbr: r.pbr,
    payout_percent: r.payout_percent,
    dividend_yield_percent: r.dividend_yield_percent
  }));
};

export const addFinancialRatios = async (ratios: FinancialRatio[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.financialRatios.bulkAdd(ratios);
    return;
  }

  const records = ratios.map(r => ({
    user_id: userId,
    ticker: r.ticker,
    year: r.year,
    eps_bpa: r.eps_bpa,
    roe_percent: r.roe_percent,
    per: r.per,
    pbr: r.pbr,
    payout_percent: r.payout_percent,
    dividend_yield_percent: r.dividend_yield_percent
  }));

  const { error } = await supabase.from('financial_ratios').upsert(records);
  
  if (error) {
    console.error('Error adding financial ratios:', error);
    throw error;
  }
};

// ==================== DIVIDENDS ====================

export const getDividendsByTicker = async (ticker: string): Promise<DividendRecord[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.dividends.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('dividends')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching dividends:', error);
    return [];
  }

  return data.map(d => ({
    id: d.id,
    ticker: d.ticker,
    year: d.year,
    amount: d.amount,
    type: d.type,
    ex_date: d.ex_date ? new Date(d.ex_date) : undefined,
    detachment_date: d.detachment_date ? new Date(d.detachment_date) : undefined,
    payment_date: d.payment_date ? new Date(d.payment_date) : undefined
  }));
};

export const getAllDividends = async (): Promise<DividendRecord[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.dividends.toArray();
  }

  const { data, error } = await supabase
    .from('dividends')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching all dividends:', error);
    return [];
  }

  return data.map(d => ({
    id: d.id,
    ticker: d.ticker,
    year: d.year,
    amount: d.amount,
    type: d.type,
    ex_date: d.ex_date ? new Date(d.ex_date) : undefined,
    detachment_date: d.detachment_date ? new Date(d.detachment_date) : undefined,
    payment_date: d.payment_date ? new Date(d.payment_date) : undefined
  }));
};

export const addDividends = async (dividends: DividendRecord[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.dividends.bulkAdd(dividends);
    return;
  }

  const records = dividends.map(d => ({
    user_id: userId,
    ticker: d.ticker,
    year: d.year,
    amount: d.amount,
    type: d.type,
    ex_date: d.ex_date?.toISOString().split('T')[0],
    detachment_date: d.detachment_date?.toISOString().split('T')[0],
    payment_date: d.payment_date?.toISOString().split('T')[0]
  }));

  const { error } = await supabase.from('dividends').upsert(records);
  
  if (error) {
    console.error('Error adding dividends:', error);
    throw error;
  }
};

// ==================== SHAREHOLDERS ====================

export const getShareholdersByTicker = async (ticker: string): Promise<Shareholder[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.shareholders.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('shareholders')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching shareholders:', error);
    return [];
  }

  return data.map(s => ({
    id: s.id,
    ticker: s.ticker,
    name: s.name,
    percentage: s.percentage,
    as_of_date: s.as_of_date ? new Date(s.as_of_date) : undefined
  }));
};

export const addShareholders = async (shareholders: Shareholder[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.shareholders.bulkAdd(shareholders);
    return;
  }

  const records = shareholders.map(s => ({
    user_id: userId,
    ticker: s.ticker,
    name: s.name,
    percentage: s.percentage,
    as_of_date: s.as_of_date?.toISOString().split('T')[0]
  }));

  const { error } = await supabase.from('shareholders').insert(records);
  
  if (error) {
    console.error('Error adding shareholders:', error);
    throw error;
  }
};

// ==================== CAPITAL EVENTS ====================

export const getCapitalEventsByTicker = async (ticker: string): Promise<CapitalEvent[]> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return await db.capitalEvents.where('ticker').equals(ticker).toArray();
  }

  const { data, error } = await supabase
    .from('capital_events')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    console.error('Error fetching capital events:', error);
    return [];
  }

  return data.map(e => ({
    id: e.id,
    ticker: e.ticker,
    date: new Date(e.date),
    event_type: e.event_type,
    description: e.description,
    shares_variation: e.shares_variation,
    nature: e.nature,
    threshold_percent: e.threshold_percent,
    declarant: e.declarant,
    direction: e.direction
  }));
};

export const addCapitalEvents = async (events: CapitalEvent[]): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await db.capitalEvents.bulkAdd(events);
    return;
  }

  const records = events.map(e => ({
    user_id: userId,
    ticker: e.ticker,
    date: e.date.toISOString().split('T')[0],
    event_type: e.event_type,
    description: e.description,
    shares_variation: e.shares_variation,
    nature: e.nature,
    threshold_percent: e.threshold_percent,
    declarant: e.declarant,
    direction: e.direction
  }));

  const { error } = await supabase.from('capital_events').insert(records);
  
  if (error) {
    console.error('Error adding capital events:', error);
    throw error;
  }
};

// ==================== CLEAR ALL DATA ====================

export const clearAllData = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    await Promise.all([
      db.trades.clear(),
      db.fees.clear(),
      db.companies.clear(),
      db.management.clear(),
      db.financialFigures.clear(),
      db.financialRatios.clear(),
      db.dividends.clear(),
      db.shareholders.clear(),
      db.capitalEvents.clear()
    ]);
    return;
  }

  const tables = [
    'trades',
    'fees',
    'companies',
    'management',
    'financial_figures',
    'financial_ratios',
    'dividends',
    'shareholders',
    'capital_events'
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error(`Error clearing ${table}:`, error);
    }
  }
};
