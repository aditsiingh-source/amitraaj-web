import pandas as pd
import json
import re
import os
import glob
from datetime import datetime

# Load existing JSON file
with open('data.json', 'r') as f:
    data = json.load(f)

# Find 2 latest derivative files dynamically
deriv_files = sorted(glob.glob('fao_participant_oi_*.csv'))
if len(deriv_files) < 2:
    raise ValueError("Need at least 2 fao_participant_oi CSV files to calculate OI change.")

prev_file, curr_file = deriv_files[-2], deriv_files[-1]

# Extract Date from latest filename e.g., fao_participant_oi_24082026.csv
date_match = re.search(r'(\d{2})(\d{2})(\d{4})', curr_file)
if date_match:
    d, m, y = date_match.groups()
    date_obj = datetime(int(y), int(m), int(d))
    date_str_json = date_obj.strftime('%d %b %Y').upper() # "24 AUG 2026"
    date_graph_str = date_obj.strftime('%d %b')            # "24 Aug"
else:
    date_str_json = data['date']
    date_graph_str = "Latest"

# Read Cash Market File
cash_file = glob.glob('fii-dii-combined*.csv')[0]
cash_df = pd.read_csv(cash_file)
cash_df.columns = [c.strip() for c in cash_df.columns]

fii_cash = round(float(str(cash_df[cash_df['CATEGORY'].str.contains('FII', na=False)]['NET VALUE\n(₹ Crores)'].values[0]).replace(',', '')))
dii_cash = round(float(str(cash_df[cash_df['CATEGORY'].str.contains('DII', na=False)]['NET VALUE\n(₹ Crores)'].values[0]).replace(',', '')))

# Process Derivatives Net Positions
def get_net(filepath):
    df = pd.read_csv(filepath, skiprows=1)
    df.columns = [c.strip() for c in df.columns]
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

# Build output
data['date'] = date_str_json
data['cash']['fii'] = f"{'+' if fii_cash >= 0 else ''}{fii_cash} Cr"
data['cash']['dii'] = f"{'+' if dii_cash >= 0 else ''}{dii_cash} Cr"

for key in ['fii', 'dii', 'retail']:
    data['derivatives'][key]['futures'] = fmt(curr_net[key]['fut'] - prev_net[key]['fut'])
    data['derivatives'][key]['calls'] = fmt(curr_net[key]['call'] - prev_net[key]['call'])
    data['derivatives'][key]['puts'] = fmt(curr_net[key]['put'] - prev_net[key]['put'])

# Slide Cash Graph
data['cashGraph']['dates'] = data['cashGraph']['dates'][1:] + [date_graph_str]
data['cashGraph']['fii'] = data['cashGraph']['fii'][1:] + [fii_cash]
data['cashGraph']['dii'] = data['cashGraph']['dii'][1:] + [dii_cash]

# Write back updated data.json
with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("data.json updated successfully!")
