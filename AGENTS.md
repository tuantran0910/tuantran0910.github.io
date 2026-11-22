# Project Rules — Cloud Native Engineering Handbook (`tuantran0910.github.io`)

## Architecture & Static Export
- **Stack:** Next.js App Router + Fumadocs (`fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`) + Tailwind CSS v4, deployed as a **static export** (`output: 'export'` → `out/`) to GitHub Pages.
- **No server runtime:** Do not add Next.js `middleware.ts` or dynamic server routes. Static search runs via `src/app/api/search/route.ts` (`staticGET`, `revalidate = false`, Orama `localeMap` mapping `vi` → `english`).
- **Keep `docs/` in place:** `source.config.ts` reads directly from `docs/` so `CONTENT_PROVENANCE.json` and Python CI scripts (`scripts/check_lessons.py`, `scripts/check_links.py`, `scripts/verify_yaml.py`) stay valid.
- **GitHub Pages assets:** Keep `public/.nojekyll` (required so GitHub Pages serves `_next/` assets) and dynamic `basePath` support in `next.config.mjs`.

## Bilingual i18n (`en` + `vi`)
- **Dot-suffix parity:** `en` is the default locale (`*.md`, `*.mdx`, `meta.json`); Vietnamese counterparts live beside them as `*.vi.md`, `*.vi.mdx`, and `meta.vi.json`.
- **Keep both locales in sync:** Whenever adding or editing a handbook page, sidebar category, or interactive component in `src/components/GitOpsExercises.tsx` (which uses `usePathname()?.startsWith('/vi')`), update both `en` and `vi`.
- **Translation style:** Translate prose, headings, tables, callouts, and frontmatter `title`/`description` into natural technical Vietnamese. Keep standard Kubernetes/cloud-native terms (`Pod`, `Deployment`, `CRD`, `Server-Side Apply`, `mTLS`, `RBAC`, `HPA`, `CSI`, `RPO`/`RTO`, etc.) and all fenced code blocks (`yaml`, `bash`, `go`, `json`, `promql`) verbatim in English.
- **Relative links:** Point internal markdown links to base `.md`/`.mdx` paths (e.g. `./lesson-02-core-resources.md`); `createRelativeLink` handles locale routing and `scripts/check_links.py` validates them.

## Content & Visual Standards
- **No editorial/source-scope banners:** Do not add `:::info Source status`, `:::info Sources and editorial scope`, `:::note About the content`, or a `content-audit` page.
- **Learning objectives:** Format `## Learning objectives` / `## Mục tiêu học tập` in every lesson as 4–5 detailed bullet points (bold lead-in + concise explanation), not a single prose paragraph.
- **Mermaid over ASCII flows:** Use `mermaid` fenced diagrams instead of ASCII arrow text flows (` ```text ` with `→`/`↓`). Always quote Mermaid labels containing parentheses, slashes, colons, or brackets (e.g. `A["Label (detail)"]`), and never put HTML tags in Mermaid labels.
- **Self-check placement:** Keep `## Self-check questions` / `## Câu hỏi tự kiểm tra` at the end of each lesson.
- **Single `<h1>`:** `<DocsTitle>` renders the page `<h1>` from frontmatter `title:`; `remarkStripLeadingH1` strips duplicate body `# H1` headings.

## UI, Theme & Layout
- **Neutral white light theme:** Use `fumadocs-ui/css/neutral.css` + `preset.css` with `defaultTheme: 'light'` and `enableSystem: false`.
- **Dark mode safety:** Scope light-mode CSS variable overrides in `src/app/global.css` to `:root:not(.dark)` — never override `--color-fd-background` on bare `:root`, or dark mode breaks.
- **Full width without ToC:** Pages with no headings (`toc.length === 0`) must render full-width (`full={page.data.full ?? !hasToc}`).
- **Justified prose:** Keep `article .prose p, article .prose li` justified (`text-align: justify; hyphens: auto`), while keeping tables, code blocks, `.not-prose` cards, and interactive exercises left-aligned.

## Technical Accuracy & Security
- **Argo CD compatibility:** For manual sync examples, omit `syncPolicy.automated` completely. Never rely on `syncPolicy.automated.enabled: false` (requires Argo CD 3.1+; older versions prune unknown fields and silently enable auto-sync).
- **Mermaid XSS hardening:** Keep `securityLevel: 'strict'` in `src/components/Mermaid.tsx`.
- **Dependency hygiene:** Pin explicit semver ranges in `package.json` (never `"latest"`). Keep `npm audit --omit=dev` at 0 vulnerabilities.
- **External links & secrets:** Always pair `target="_blank"` with `rel="noopener noreferrer"`. Never commit real credentials, tokens, or private internal endpoints.

## Verification Before Commit
Run and confirm all pass before committing:
1. `npx tsc --noEmit`
2. `python3 scripts/check_lessons.py && python3 scripts/check_links.py`
3. `NEXT_TELEMETRY_DISABLED=1 npx next build` (verify `out/.nojekyll`, `out/api/search`, and all `en`/`vi` static pages build cleanly)
