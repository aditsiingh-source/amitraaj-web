import pandas as pd
import json
import re
import glob
from datetime import datetime

print("--- STARTING CSV AUTOMATION SCRIPT ---")

# 1. Load data.json
with open('data.json', 'r') as f:
    data = json.load(f)

# 2. Find all CSV files in current directory
all_csvs = glob.glob('*.csv')

# Filter derivative files
deriv_files = sorted([f for f in all_csvs if 'fao_participant_oi' in f.lower()])
if len(deriv_files) < 2:
    raise ValueError(f"Found {len(deriv_files)} FAO files. Need at least 2 files (e.g. 21st and 24th) in repo!")

prev_file, curr_file = deriv_files[-2], deriv_files[-1]
print(f"Using Previous FAO: {prev_file}")
print(f"Using Current FAO: {curr_file}")

# 3. Extract Date from Current File Name
date_match = re.search(r'(\d{2})(\d{2})(\d{4})', curr_file)
if date_match:
    d, m, y = date_match.groups()
    date_obj = datetime(int(y), int(m), int(d))
    date_str_json = date_obj.strftime('%d %b %Y').upper()
    date_graph_str = date_obj.strftime('%d %b')
else:
    date_str_json = data['date']
    date_graph_str = "Latest"

# 4. Find & Parse Cash Market File (Positional Indexing)
cash_files = [f for f in all_csvs if 'fii-dii-combined' in f.lower() or 'fii_dii' in f.lower()]
if not cash_files:
    raise ValueError("No cash market CSV file found matching '*fii-dii-combined*.csv'")

cash_file = cash_files[0]
print(f"Using Cash File: {cash_file}")

cash_df = pd.read_csv(cash_file)

# Extract using positional index (Column 0 = CATEGORY, Last Column = NET VALUE)
fii_mask = cash_df.iloc[:, 0].astype(str).str.contains('FII', case=False, na=False)
dii_mask = cash_df.iloc[:, 0].astype(str).str.contains('DII', case=False, na=False)

fii_val_str = str(cash_df[fii_mask].iloc[0, -1]).replace(',', '').strip()
dii_val_str = str(cash_df[dii_mask].iloc[0, -1]).replace(',', '').strip()

fii_cash = round(float(fii_val_str))
dii_cash = round(float(dii_val_str))

print(f"Parsed Cash -> FII: {fii_cash}, DII: {dii_cash}")

# 5. Parse Net Positions from Derivative CSVs
def get_net(filepath):
    df = pd.read_csv(filepath)
    if 'Client Type' not in df.columns:
        df = pd.read_csv(filepath, skiprows=1)
    
    df.columns = [str(c).strip() for c in df.columns]
    res = {}
    for client, key in [('FII', 'fii'), ('DII', 'dii'), ('Client', 'retail')]:
        row = df[df['Client Type'] == client].iloc[0]
        res[key] = {
            'fut': int(row['Future Index Long']) - int(row['Future Index Short']),
            'call': int(row['Option Index Call Long']) - int(row['Option Index Call Short']),
            'put': int(row['Option Index Put Long']) - int(row['Option Index Put Short'])
        }
    return res

prev_net = get_net(prev_file)
curr_net = get_net(curr_file)

def fmt(val):
    return f"{'+' if val >= 0 else ''}{val:,}"

# 6. Update target JSON structure
data['date'] = date_str_json
data['cash']['fii'] = f"{'+' if fii_cash >= 0 else ''}{fii_cash} Cr"
data['cash']['dii'] = f"{'+' if dii_cash >= 0 else ''}{dii_cash} Cr"

for key in ['fii', 'dii', 'retail']:
    data['derivatives'][key]['futures'] = fmt(curr_net[key]['fut'] - prev_net[key]['fut'])
    data['derivatives'][key]['calls'] = fmt(curr_net[key]['call'] - prev_net[key]['call'])
    data['derivatives'][key]['puts'] = fmt(curr_net[key]['put'] - prev_net[key]['put'])

# Slide cash trend graph only if date changed
if data['cashGraph']['dates'][-1] != date_graph_str:
    data['cashGraph']['dates'] = data['cashGraph']['dates'][1:] + [date_graph_str]
    data['cashGraph']['fii'] = data['cashGraph']['fii'][1:] + [fii_cash]
    data['cashGraph']['dii'] = data['cashGraph']['dii'][1:] + [dii_cash]

# 7. Write data back to file
with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("SUCCESS: data.json updated successfully!")
