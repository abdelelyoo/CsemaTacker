-- Supabase Database Schema for Atlas Portfolio Manager
-- Run this SQL in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  company TEXT NOT NULL,
  isin TEXT,
  operation TEXT NOT NULL,
  ticker TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  fees NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  realized_pl NUMERIC DEFAULT 0,
  parsed_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fees Table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CUS', 'SUB')),
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Company Profiles Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  headquarters TEXT,
  website TEXT,
  phone TEXT,
  fax TEXT,
  auditors TEXT[],
  date_of_incorporation TEXT,
  introduction_date_bourse TEXT,
  fiscal_year_duration_months INTEGER,
  investor_relations_person TEXT,
  investor_relations_email TEXT,
  investor_relations_phone TEXT,
  flottant NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- 4. Management Table
CREATE TABLE IF NOT EXISTS management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Financial Figures Table
CREATE TABLE IF NOT EXISTS financial_figures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  consolidated_accounts BOOLEAN DEFAULT FALSE,
  revenue NUMERIC,
  operating_income NUMERIC,
  net_income_group_share NUMERIC,
  shareholders_equity NUMERIC,
  shares_outstanding NUMERIC,
  capital_social NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker, year)
);

-- 6. Financial Ratios Table
CREATE TABLE IF NOT EXISTS financial_ratios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  eps_bpa NUMERIC,
  roe_percent NUMERIC,
  per NUMERIC,
  pbr NUMERIC,
  payout_percent NUMERIC,
  dividend_yield_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker, year)
);

-- 7. Dividends Table
CREATE TABLE IF NOT EXISTS dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT,
  ex_date DATE,
  detachment_date DATE,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker, year)
);

-- 8. Shareholders Table
CREATE TABLE IF NOT EXISTS shareholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC NOT NULL,
  as_of_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Capital Events Table
CREATE TABLE IF NOT EXISTS capital_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('capital_increase', 'threshold_crossing')),
  description TEXT NOT NULL,
  shares_variation NUMERIC,
  nature TEXT,
  threshold_percent NUMERIC,
  declarant TEXT,
  direction TEXT CHECK (direction IN ('Hausse', 'Baisse')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE management ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies - Users can only access their own data
CREATE POLICY "Users can only access their own transactions" 
  ON transactions FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own fees" 
  ON fees FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own companies" 
  ON companies FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own management" 
  ON management FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own financial_figures" 
  ON financial_figures FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own financial_ratios" 
  ON financial_ratios FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own dividends" 
  ON dividends FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own shareholders" 
  ON shareholders FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own capital_events" 
  ON capital_events FOR ALL 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(parsed_date);
CREATE INDEX IF NOT EXISTS idx_fees_user_id ON fees(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_dividends_user_id ON dividends(user_id);
CREATE INDEX IF NOT EXISTS idx_dividends_ticker ON dividends(ticker);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
