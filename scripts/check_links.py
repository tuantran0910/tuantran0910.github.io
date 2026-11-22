#!/usr/bin/env python3
"""Static Markdown internal-link validation; does not replace a Docusaurus build."""
from pathlib import Path
import re
from urllib.parse import urlparse, unquote
root=Path(__file__).resolve().parents[1]
docs=root/'docs'
known={}
for f in list(docs.rglob('*.md'))+list(docs.rglob('*.mdx')):
 rel=f.relative_to(docs).as_posix()
 slug='/'+str(Path(rel).with_suffix(''))
 known[slug]=f
 known[slug+'/']=f
 # Docusaurus frontmatter with slug alias
 fm=re.search(r'^---\n(.*?)\n---',f.read_text(),re.S)
 if fm:
  match=re.search(r'^slug:\s*["\']?([^"\'\n]+)',fm.group(1),re.M)
  if match: known[match.group(1).strip()]=f
bad=[]
num=0
for f in set(known.values()):
 text=f.read_text()
 text=re.sub(r'```[^\n]*\n.*?\n```','',text,flags=re.S)
 for url in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
  if url.startswith(('https://','http://','mailto:','#')): continue
  target=url.split('#')[0].split('?')[0]
  if not target: continue
  num+=1
  if target.startswith('/'):
   normalized=target
  else:
   rel=f.relative_to(docs)
   normalized='/'+(Path(rel).parent/target).as_posix()
  # simplify dot segments
  parts=[]
  for p in normalized.split('/'):
   if p in ('','.'):continue
   if p=='..':
    if parts: parts.pop()
   else: parts.append(p)
  normalized='/'+('/'.join(parts))
  normalized=re.sub(r'\.(md|mdx)$','',normalized)
  if normalized not in known:
   bad.append(f'{f.relative_to(root)} -> {url} (resolved {normalized})')
print(f'Checked {num} internal links; {len(bad)} unresolved')
for x in bad: print('ERROR',x)
raise SystemExit(1 if bad else 0)
