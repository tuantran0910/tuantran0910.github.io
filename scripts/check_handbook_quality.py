#!/usr/bin/env python3
"""Enforce bilingual EN/VI parity and handbook content/diagram standards."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
docs_dir = root / "docs"
errors: list[str] = []

all_docs = sorted(list(docs_dir.rglob("*.md")) + list(docs_dir.rglob("*.mdx")))
en_docs = [p for p in all_docs if not p.name.endswith((".vi.md", ".vi.mdx"))]
vi_docs = [p for p in all_docs if p.name.endswith((".vi.md", ".vi.mdx"))]

# 1. EN <-> VI doc parity
for p in en_docs:
    vi = p.with_name(re.sub(r"\.(mdx?)$", r".vi.\1", p.name))
    if not vi.exists():
        errors.append(f"Missing Vietnamese counterpart: {vi.relative_to(root)}")

for p in vi_docs:
    en = p.with_name(re.sub(r"\.vi\.(mdx?)$", r".\1", p.name))
    if not en.exists():
        errors.append(f"Orphan Vietnamese doc without English source: {p.relative_to(root)}")

# 2. meta.json <-> meta.vi.json parity
for meta in sorted(docs_dir.rglob("meta.json")):
    meta_vi = meta.with_name("meta.vi.json")
    if not meta_vi.exists():
        errors.append(f"Missing Vietnamese sidebar meta: {meta_vi.relative_to(root)}")

# 3. Content & diagram standards across all docs
valid_mermaid = re.compile(
    r"^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|xychart-beta)\b"
)
editorial_re = re.compile(
    r":::(?:info|note)\s+(?:Source|About|Nguồn|Trạng thái)", re.IGNORECASE
)
html_tag_re = re.compile(r"</?[a-z]+[^>]*>", re.IGNORECASE)

for p in all_docs:
    rel = p.relative_to(root)
    txt = p.read_text(encoding="utf-8")

    if editorial_re.search(txt):
        errors.append(f"Disallowed editorial/source-scope callout in {rel}")

    lines = txt.splitlines()
    lang = None
    start = 0
    buf: list[str] = []
    mermaid_count = 0

    for i, line in enumerate(lines, 1):
        if lang is None:
            m = re.match(r"^```([a-zA-Z0-9_-]*)", line)
            if m:
                lang = m.group(1) or "text"
                start = i
                buf = []
        elif re.match(r"^```\s*$", line):
            block = "\n".join(buf)
            if lang == "mermaid":
                mermaid_count += 1
                first = next((l.strip() for l in buf if l.strip()), "")
                if not valid_mermaid.match(first):
                    errors.append(f"Invalid Mermaid header in {rel}:{start}: {first!r}")
                if html_tag_re.search(block):
                    errors.append(f"HTML tag found inside Mermaid diagram in {rel}:{start}")
            elif lang == "text" and re.search(r"[→↓]|-->", block):
                errors.append(f"ASCII arrow flow found in ```text block in {rel}:{start} (use Mermaid)")
            lang = None
        else:
            buf.append(line)

    if p.name.startswith("lesson-"):
        if mermaid_count < 1:
            errors.append(f"Lesson has no Mermaid diagrams: {rel}")
        lo = re.search(
            r"## (?:Learning objectives|Mục tiêu học tập)\n([\s\S]*?)(?=\n## )", txt
        )
        bullets = len(re.findall(r"^- ", lo.group(1), re.M)) if lo else 0
        if bullets < 4:
            errors.append(f"Lesson Learning objectives has {bullets} bullets (expected >= 4): {rel}")

print(f"Checked {len(all_docs)} docs ({len(en_docs)} EN, {len(vi_docs)} VI); {len(errors)} error(s)")
for err in errors:
    print("ERROR:", err)
sys.exit(1 if errors else 0)
