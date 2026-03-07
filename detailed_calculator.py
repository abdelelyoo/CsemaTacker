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

trades = []
with open('atlas_portfolio_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        op = row['Operation'].lower()
        if op in ['depot', 'dpt', 'dividende', 'taxe']: continue
        total = parse_val(row['Total'])
        trades.append((i+2, row['Ticker'], row['Operation'], total))

print("ENTRY | TICKER | OP | TOTAL")
current_cash = 77590.93 # From bank operations
for line, ticker, op, total in trades:
    current_cash += total
    print(f"{line:5} | {ticker:6} | {op:6} | {total:10.2f} | Running: {current_cash:10.2f}")
