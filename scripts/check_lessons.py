#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'CONTENT_PROVENANCE.json').read_text())
errors=[]
for num,entry in source.items():
 p=root/entry['file']
 if not p.exists(): errors.append(f'Missing lesson {num}: {p}'); continue
 text=p.read_text()
 if len(text.split())<1000: errors.append(f'Lesson {num} below 1000 words')
 if 'table of contents pending verification' in text.lower(): errors.append(f'Lesson {num} still placeholder')
 if not text.startswith('---') or '## ' not in text: errors.append(f'Lesson {num} lacks structure')
print(f'Checked {len(source)} lessons')
for err in errors: print('ERROR',err)
sys.exit(1 if errors else 0)
