#!/usr/bin/env python3
"""Parse YAML snippets in Markdown. Syntax-only; not Kubernetes schema validation."""
from pathlib import Path
import re
import sys
import yaml
root=Path(__file__).resolve().parents[1]
lessons=sorted((root/'docs').rglob('lesson-*.md'))
errors=[]; count=0
for f in lessons:
    content=f.read_text(encoding='utf-8')
    blocks=re.findall(r'```(?:yaml|yml)\s*\n(.*?)\n```', content, re.S)
    for i,block in enumerate(blocks,1):
        count+=1
        try: list(yaml.safe_load_all(block))
        except yaml.YAMLError as e: errors.append(f'{f.relative_to(root)}:{i}: {e}')
print(f'YAML syntax: {count} blocks / {len(lessons)} lessons / {len(errors)} errors')
for x in errors: print('ERROR:',x)
if errors: sys.exit(1)
