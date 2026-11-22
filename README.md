# Tuan Tran’s Portfolio and Learning Notes

This repository hosts my portfolio, public work, and learning material as a single **Next.js + Fumadocs** static site:

- [Portfolio](https://tuantran0910.github.io/) — work and learning links.
- [Cloud Native Engineering Handbook](https://tuantran0910.github.io/handbook/) — 19 English lessons, hands-on labs, and interactive exercises for Kubernetes platform engineering, with built-in static search.

Use `src/app/` for standalone portfolio/application routes and `docs/` for the handbook. Keep published content in English. When adding a handbook lesson, register it in `CONTENT_PROVENANCE.json` (for lesson checks) and the relevant `docs/**/meta.json` (for sidebar navigation).

## Handbook editorial status

See `CONTENT_STATUS.md` and `CONTENT_AUDIT.json` for source verification. Lessons 1–8 were rewritten with examples, architecture, labs, and links; the original titles or details of Lessons 5–7 are not fully verified. Lessons 9–19 were expanded from summaries with operational analysis, code, YAML, and troubleshooting. These lessons are reconstructions, not verified verbatim transcripts.

CI checks internal links, lesson structure, YAML syntax, TypeScript types, and the static production build. Review and version-test any commands that can affect production before running them.

## Run locally

Requires Node.js 22+.

```bash
npm ci
npm run dev
```

Typecheck and static production build (outputs to `out/`):

```bash
npm run typecheck
npm run build
```

## Publish to GitHub Pages

Site: <https://tuantran0910.github.io/>.

In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. Push to `main` or run **Deploy to GitHub Pages** manually to build and publish `out/`.

Next.js static export serves this user-site repository at `/`. GitHub Actions builds for other repository names automatically set `basePath` to `/<repository>`.

## Content governance

- Every example should be marked conceptual/tested and version-scoped where applicable.
- Do not commit real secrets, credentials, customer data or private cloud project IDs.
- Require pull request review for production-sensitive YAML examples.
- Validate links, API versions, CRDs and destructive commands before publishing.

## References

[Fumadocs](https://fumadocs.dev/) · [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) · [Kubernetes documentation](https://kubernetes.io/docs/).
