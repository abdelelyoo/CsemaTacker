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

non_depot_sum = 0.0
with open('atlas_portfolio_export_2026-02-26.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        op = row['Operation'].lower()
        total = parse_val(row['Total'])
        if op not in ['depot', 'dpt']:
            non_depot_sum += total

print(f"Non-Depot Sum: {non_depot_sum}")
print(f"Target Non-Depot Sum for 23.1 Balance: -76967.15")
print(f"Difference: {non_depot_sum - (-76967.15)}")
