import csv

def parse_val(v):
    if not v: return 0.0
    v = v.replace('"', '').replace(' ', '').replace('MAD', '')
    if ',' in v and '.' in v: v = v.replace(',', '')
    elif ',' in v:
        parts = v.split(',')
        if len(parts[1]) == 2: v = v.replace(',', '.')
        else: v = v.replace(',', '')
    return float(v or 0.0)

# 1. Load Bank Ops
bank_ops = []
with open('bank_operations_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        bank_ops.append({
            'Category': row['Category'].upper(),
            'Amount': parse_val(row['Amount'])
        })

# 2. Load Transactions
trades = []
with open('atlas_portfolio_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trades.append({
            'Operation': row['Operation'].lower(),
            'Total': parse_val(row['Total']),
            'Fees': parse_val(row['Fees']),
            'Tax': parse_val(row['Tax']),
            'Ticker': row['Ticker']
        })

# 3. Calculate Components
# We assume the app logic:
# - Deposits from bank ops
# - Withdrawals from bank ops
# - Dividends from bank ops (app skips portfolio dividends if bank ops exist)
# - Taxes from bank ops (app skips portfolio taxes if bank ops exist)
# - Fees from bank ops (app skips portfolio fees if bank ops exist)
# - Trades from portfolio (Achat/Vente)

deposits = sum(op['Amount'] for op in bank_ops if op['Category'] == 'DEPOSIT')
withdrawals = sum(op['Amount'] for op in bank_ops if op['Category'] == 'WITHDRAWAL')
dividends = sum(op['Amount'] for op in bank_ops if op['Category'] == 'DIVIDEND')
taxes = sum(op['Amount'] for op in bank_ops if op['Category'] == 'TAX')
bank_fees = sum(op['Amount'] for op in bank_ops if op['Category'] in ['BANK_FEE', 'CUSTODY', 'SUBSCRIPTION'])

# Trades (Achat/Vente) only
net_trades = sum(t['Total'] for t in trades if t['Operation'] in ['achat', 'vente', 'buy', 'sell'])

print(f"Bank Deposits:    {deposits:10.2f}")
print(f"Bank Withdrawals: {withdrawals:10.2f}")
print(f"Bank Dividends:   {dividends:10.2f}")
print(f"Bank Taxes:       {taxes:10.2f}")
print(f"Bank Fees:        {bank_fees:10.2f}")
print(f"Net Trades:       {net_trades:10.2f}")
print("-" * 30)
current_calc = deposits + withdrawals + dividends + taxes + bank_fees + net_trades
print(f"Current Calc:     {current_calc:10.2f}")
print(f"Target:           23.10")
print(f"Discrepancy:      {current_calc - 23.10:10.2f}")
