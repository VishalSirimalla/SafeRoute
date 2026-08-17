import os
import json
from pathlib import Path
import pandas as pd

root = Path(r"c:\Users\sirim\Downloads\stitch_saferoute_intelligence_platform (1)\saferoute-app\dataset")
files = []
for archive in sorted(root.iterdir()):
    if archive.is_dir():
        for p in sorted(archive.rglob('*')):
            if p.is_file():
                files.append(p)

print('TOTAL_FILES', len(files))

for p in files:
    if p.suffix.lower() in {'.csv', '.xlsx', '.xls', '.json'}:
        try:
            if p.suffix.lower() == '.csv':
                df = pd.read_csv(p)
            elif p.suffix.lower() in {'.xlsx', '.xls'}:
                df = pd.read_excel(p)
            else:
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    obj = json.load(f)
                if isinstance(obj, list):
                    df = pd.json_normalize(obj)
                else:
                    df = pd.json_normalize([obj])
            print(f"FILE::{p.relative_to(root)}")
            print('rows=', len(df), 'cols=', len(df.columns))
            print('columns=', list(df.columns))
            print('dtypes=', {k: str(v) for k, v in df.dtypes.to_dict().items()})
            print('missing=', {k: int(v) for k, v in df.isna().sum().items()})
            print('duplicate_rows=', int(df.duplicated().sum()))
            print('sample=', df.head(2).to_dict(orient='records'))
            print('---')
        except Exception as e:
            print(f"FILE::{p.relative_to(root)}")
            print('ERROR', repr(e))
            print('---')
