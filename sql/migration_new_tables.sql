-- New clean tables for better data organization
-- Run this in Supabase SQL Editor

-- Drop old tables (optional - comment if you want to keep old data)
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS bank_operations CASCADE;
-- DROP TABLE IF EXISTS fees CASCADE;

-- Create new trades table (Achat/Vente only)
CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  parsed_date DATE NOT NULL,
  company TEXT,
  isin TEXT,
  operation TEXT NOT NULL, -- 'Achat' or 'Vente'
  ticker TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  fees NUMERIC,
  tax NUMERIC,
  realized_pl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create new bank_ops table (Depot/Retrait/Frais/Taxe/Dividende)
CREATE TABLE IF NOT EXISTS bank_ops (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  parsed_date DATE NOT NULL,
  operation TEXT NOT NULL, -- 'Depot', 'Retrait', 'Frais', 'Taxe', 'Dividende'
  description TEXT,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'TAX', 'BANK_FEE', 'DIVIDEND'
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create new fees table
CREATE TABLE IF NOT EXISTS fees_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL, -- 'CUS' or 'SUB'
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for bank_ops
CREATE POLICY "Users can manage own bank_ops" ON bank_ops
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for fees_v2
CREATE POLICY "Users can manage own fees_v2" ON fees_v2
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, parsed_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_bank_ops_user_date ON bank_ops(user_id, parsed_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_ops_category ON bank_ops(category);
CREATE INDEX IF NOT EXISTS idx_fees_v2_user_date ON fees_v2(user_id, date DESC);
