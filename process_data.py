import pandas as pd
import json
import re
import glob
from datetime import datetime

print("--- STARTING CSV AUTOMATION SCRIPT ---")

# 1. Load data.json
try:
    with open('data.json', 'r') as f:
        data = json.load(f)
    print("Loaded data.json successfully.")
except Exception as e:
    print(f"Error loading data.json: {e}")
    raise e

# 2. Find all CSV files in current folder
all_csvs = glob.glob('*.csv')
print(f"All CSV files found in repo: {all_csvs}")

# Find derivative files flexible on case and spaces
deriv_files = sorted([f for f in all_csvs if 'fao_participant_oi' in f.lower()])
print(f"Filtered FAO Derivative files: {deriv_files}")

if len(deriv_files) < 2:
    raise ValueError(f"CRITICAL ERROR: Found {len(deriv_files)} FAO files. Need at least 2 files (e.g. 21st and 24th) in the main repo folder!")

prev_file, curr_file = deriv_files[-2], deriv_files[-1]
print(f"Using Previous FAO File: {prev_file}")
print(f"Using Current FAO File: {curr_file}")

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

print(f"Detected Market Date: {date_str_json}")

# 4. Find Cash Market File
cash_files = [f for f in all_csvs if 'fii-dii-combined' in f.lower() or 'fii_dii' in f.lower()]
print(f"Filtered Cash Files: {cash_files}")

if not cash_files:
    raise ValueError("CRITICAL ERROR: No cash market CSV file found matching '*fii-dii-combined*.csv'")

cash_file = cash_files[0]

# Read Cash File safely
cash_df = pd.read_csv(cash_file)
cash_df.columns = [str(c).strip().replace('\n', ' ') for c in cash_df.columns]

# Locate rows for FII and DII
fii_row = cash_df[cash_df.iloc[:, 0].astype(str).str.contains('FII', case=False, na=False)]
dii_row = cash_df[cash_df.iloc[:, 0].astype(str).str.contains('DII', case=False, na=False)]

fii_cash = round(float(str(fii_row.iloc[0, -1]).replace(',', '').strip()))
dii_cash = round(float(str(dii_row.iloc[0, -1]).replace(',', '').strip()))

print(f"Parsed FII Cash: {fii_cash}, DII Cash: {dii_cash}")

# 5. Parse Net Positions from Derivative CSVs
def get_net(filepath):
    # Read CSV skipping header text line if present
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

# Slide cash trend graph
if data['cashGraph']['dates'][-1] != date_graph_str:
    data['cashGraph']['dates'] = data['cashGraph']['dates'][1:] + [date_graph_str]
    data['cashGraph']['fii'] = data['cashGraph']['fii'][1:] + [fii_cash]
    data['cashGraph']['dii'] = data['cashGraph']['dii'][1:] + [dii_cash]

# 7. Write data back to file
with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("SUCCESS: data.json updated successfully!")
