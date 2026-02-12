-- Supabase Database Schema for Atlas Portfolio Manager
-- Updated: 2024 - Fixed fee/tax columns to support NULL values for proper inference
-- Run this SQL in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TRANSACTIONS TABLE
-- ============================================
-- Stores all buy/sell transactions and other operations
-- Note: fees and tax columns allow NULL to enable automatic inference
DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  date TEXT NOT NULL,                    -- Transaction date (DD/MM/YY format)
  company TEXT NOT NULL,                 -- Company name
  isin TEXT,                             -- ISIN code (optional)
  operation TEXT NOT NULL,               -- Operation type: Achat, Vente, Depot, Taxe, Frais, Dividende
  ticker TEXT NOT NULL,                  -- Stock ticker symbol
  
  -- Financial Data
  qty NUMERIC NOT NULL,                  -- Quantity (negative for sells)
  price NUMERIC NOT NULL,                -- Unit price
  total NUMERIC NOT NULL,                -- Total amount (after fees/tax)
  fees NUMERIC,                          -- Transaction fees (NULL = will be inferred)
  tax NUMERIC,                           -- Tax amount (NULL = will be inferred)
  realized_pl NUMERIC,                   -- Realized P&L (NULL = will be calculated)
  
  -- Metadata
  parsed_date DATE NOT NULL,             -- Parsed date for sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_ticker ON transactions(ticker);
CREATE INDEX idx_transactions_parsed_date ON transactions(parsed_date);
CREATE INDEX idx_transactions_operation ON transactions(operation);

-- ============================================
-- 2. FEES TABLE (CUS/SUB)
-- ============================================
-- Stores separate custody and subscription fees
DROP TABLE IF EXISTS fees CASCADE;

CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,                    -- Fee date
  type TEXT NOT NULL CHECK (type IN ('CUS', 'SUB')),  -- CUS = Custody, SUB = Subscription
  amount NUMERIC NOT NULL,               -- Fee amount (always positive)
  description TEXT,                      -- Optional description
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fees_user_id ON fees(user_id);
CREATE INDEX idx_fees_date ON fees(date);

-- ============================================
-- 3. COMPANY PROFILES TABLE
-- ============================================
-- Stores company information and fundamentals
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,                  -- Primary identifier
  name TEXT NOT NULL,                    -- Company name
  sector TEXT,                           -- Business sector
  
  -- Contact Information
  headquarters TEXT,
  website TEXT,
  phone TEXT,
  fax TEXT,
  
  -- Company Details
  auditors TEXT[],                       -- Array of auditor names
  date_of_incorporation TEXT,
  introduction_date_bourse TEXT,         -- Date listed on exchange
  fiscal_year_duration_months INTEGER,
  
  -- Investor Relations
  investor_relations_person TEXT,
  investor_relations_email TEXT,
  investor_relations_phone TEXT,
  
  -- Market Data
  flottant NUMERIC,                      -- Free float percentage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ticker)
);

CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_ticker ON companies(ticker);

-- ============================================
-- 4. MANAGEMENT TABLE
-- ============================================
-- Stores company management/board members
DROP TABLE IF EXISTS management CASCADE;

CREATE TABLE management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,                  -- Company ticker
  role TEXT NOT NULL,                    -- Position/role
  name TEXT NOT NULL,                    -- Person's name
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_management_user_id ON management(user_id);
CREATE INDEX idx_management_ticker ON management(ticker);

-- ============================================
-- 5. FINANCIAL FIGURES TABLE
-- ============================================
-- Annual financial data for companies
DROP TABLE IF EXISTS financial_figures CASCADE;

CREATE TABLE financial_figures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  
  consolidated_accounts BOOLEAN DEFAULT FALSE,
  revenue NUMERIC,                       -- Revenue/Chiffre d'affaires
  operating_income NUMERIC,              -- Operating income/Résultat d'exploitation
  net_income_group_share NUMERIC,        -- Net income/Bénéfice net
  shareholders_equity NUMERIC,           -- Shareholders' equity/Capitaux propres
  shares_outstanding NUMERIC,            -- Number of shares outstanding
  capital_social NUMERIC,                -- Share capital
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ticker, year)
);

CREATE INDEX idx_financial_figures_user_id ON financial_figures(user_id);
CREATE INDEX idx_financial_figures_ticker ON financial_figures(ticker);

-- ============================================
-- 6. FINANCIAL RATIOS TABLE
-- ============================================
-- Calculated financial ratios
DROP TABLE IF EXISTS financial_ratios CASCADE;

CREATE TABLE financial_ratios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  
  eps_bpa NUMERIC,                       -- Earnings per share/Bénéfice par action
  roe_percent NUMERIC,                   -- Return on equity
  per NUMERIC,                           -- Price to earnings ratio
  pbr NUMERIC,                           -- Price to book ratio
  payout_percent NUMERIC,                -- Payout ratio
  dividend_yield_percent NUMERIC,        -- Dividend yield
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ticker, year)
);

CREATE INDEX idx_financial_ratios_user_id ON financial_ratios(user_id);
CREATE INDEX idx_financial_ratios_ticker ON financial_ratios(ticker);

-- ============================================
-- 7. DIVIDENDS TABLE
-- ============================================
-- Dividend payment history
DROP TABLE IF EXISTS dividends CASCADE;

CREATE TABLE dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,               -- Dividend per share
  type TEXT,                             -- Type: Ordinaire, Exceptionnel, etc.
  ex_date DATE,                          -- Ex-dividend date
  detachment_date DATE,                  -- Detachment date
  payment_date DATE,                     -- Payment date
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ticker, year)
);

CREATE INDEX idx_dividends_user_id ON dividends(user_id);
CREATE INDEX idx_dividends_ticker ON dividends(ticker);

-- ============================================
-- 8. SHAREHOLDERS TABLE
-- ============================================
-- Major shareholders information
DROP TABLE IF EXISTS shareholders CASCADE;

CREATE TABLE shareholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,                    -- Shareholder name
  percentage NUMERIC NOT NULL,           -- Ownership percentage
  as_of_date DATE,                       -- Date of information
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shareholders_user_id ON shareholders(user_id);
CREATE INDEX idx_shareholders_ticker ON shareholders(ticker);

-- ============================================
-- 9. CAPITAL EVENTS TABLE
-- ============================================
-- Capital increases, threshold crossings, etc.
DROP TABLE IF EXISTS capital_events CASCADE;

CREATE TABLE capital_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ticker TEXT NOT NULL,
  date DATE NOT NULL,                    -- Event date
  event_type TEXT NOT NULL CHECK (event_type IN ('capital_increase', 'threshold_crossing')),
  description TEXT NOT NULL,             -- Event description
  
  -- Optional details
  shares_variation NUMERIC,              -- Change in shares outstanding
  nature TEXT,                           -- Nature of operation
  threshold_percent NUMERIC,             -- Threshold crossed (if applicable)
  declarant TEXT,                        -- Who declared the crossing
  direction TEXT CHECK (direction IN ('Hausse', 'Baisse')),  -- Increase or decrease
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_capital_events_user_id ON capital_events(user_id);
CREATE INDEX idx_capital_events_ticker ON capital_events(ticker);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
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

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION HELPERS
-- ============================================
-- Function to migrate existing transactions with 0 fees/tax to NULL
CREATE OR REPLACE FUNCTION migrate_transaction_fees_to_null()
RETURNS void AS $$
BEGIN
  UPDATE transactions 
  SET 
    fees = CASE 
      WHEN (operation ILIKE 'achat' OR operation ILIKE 'buy' OR operation ILIKE 'vente' OR operation ILIKE 'sell') 
        AND fees = 0 
      THEN NULL 
      ELSE fees 
    END,
    tax = CASE 
      WHEN (operation ILIKE 'achat' OR operation ILIKE 'buy' OR operation ILIKE 'vente' OR operation ILIKE 'sell') 
        AND tax = 0 
      THEN NULL 
      ELSE tax 
    END,
    realized_pl = CASE 
      WHEN (operation ILIKE 'achat' OR operation ILIKE 'buy' OR operation ILIKE 'vente' OR operation ILIKE 'sell') 
        AND realized_pl = 0 
      THEN NULL 
      ELSE realized_pl 
    END
  WHERE operation ILIKE 'achat' 
     OR operation ILIKE 'vente' 
     OR operation ILIKE 'buy' 
     OR operation ILIKE 'sell';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE transactions IS 'Stores all portfolio transactions. fees, tax, and realized_pl columns allow NULL values to enable automatic calculation/inference';
COMMENT ON COLUMN transactions.fees IS 'Transaction fees. NULL values will be automatically calculated based on standard fee rates';
COMMENT ON COLUMN transactions.tax IS 'Tax amount (TPCVM). NULL values will be automatically calculated for profitable sells';
COMMENT ON COLUMN transactions.realized_pl IS 'Realized profit/loss. NULL values will be automatically calculated';
COMMENT ON TABLE fees IS 'Stores custody fees (CUS) and subscription fees (SUB) separate from transactions';

-- ============================================
-- END OF SCHEMA
-- ============================================