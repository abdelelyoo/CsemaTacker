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

with open('atlas_portfolio_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        op = row['Operation'].lower()
        if op in ['depot', 'dpt', 'dividende', 'taxe']: continue
        qty = parse_val(row['Qty'])
        price = parse_val(row['Price'])
        total = parse_val(row['Total'])
        expected_total_abs = abs(qty * price)
        actual_total_abs = abs(total)
        
        diff = actual_total_abs - expected_total_abs
        if abs(diff) > 200: # Significant difference not just fees
             print(f"Line {i+2}: {row['Ticker']} {row['Operation']} Diff: {diff:.2f} (Total: {total}, Qty*Price: {qty*price})")
