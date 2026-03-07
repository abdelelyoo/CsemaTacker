import csv

def parse_val(v):
    if not v: return 0.0
    v = v.replace('"', '').replace(' ', '').replace('MAD', '')
    # Handle the comma as decimal or thousands
    # In atlas_portfolio_export, "21965.33" uses period
    # In bank_operations_export, "21965,33" uses comma
    if ',' in v and '.' in v:
        # Both exist, usually 1,234.56
        v = v.replace(',', '')
    elif ',' in v:
        # Check if it's 1,234 or 1,23
        parts = v.split(',')
        if len(parts[1]) == 2: # Likely decimal
            v = v.replace(',', '.')
        else:
            v = v.replace(',', '')
    return float(v or 0.0)

trades_sum = 0.0
deposits_sum = 0.0
with open('atlas_portfolio_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        op = row['Operation'].lower()
        total = parse_val(row['Total'])
        if op in ['depot', 'dpt']:
            deposits_sum += total
        elif op in ['dividende', 'taxe']:
            # These are normally in bank ops, let's see
            pass
        else:
            trades_sum += total

bank_deposits = 0.0
bank_divs = 0.0
bank_taxes = 0.0
bank_fees = 0.0
with open('bank_operations_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cat = row['Category'].upper()
        amt = parse_val(row['Amount'])
        if cat == 'DEPOSIT': bank_deposits += amt
        elif cat == 'DIVIDEND': bank_divs += amt
        elif cat == 'TAX': bank_taxes += amt
        else: bank_fees += amt

print(f"Trades Sum (Buys+Sells): {trades_sum}")
print(f"Bank Deposits: {bank_deposits}")
print(f"Bank Divs: {bank_divs}")
print(f"Bank Taxes: {bank_taxes}")
print(f"Bank Fees: {bank_fees}")
print(f"TOTAL: {trades_sum + bank_deposits + bank_divs + bank_taxes + bank_fees}")
