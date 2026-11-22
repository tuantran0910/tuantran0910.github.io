---
id: content-audit
title: Content Verification Status
sidebar_position: 12
---

# Content Verification Status

Updated: **November 22, 2026**.

The Handbook contains 19 lessons that have been **rewritten and expanded**; no placeholder pages remain. This is **not a fully verbatim reconstruction**. A complete export of the original answers was unavailable for paragraph-by-paragraph comparison.

| Scope | Status |
|---|---|
| Lessons 01–04 | Titles identified; content rewritten |
| Lessons 05–07 | Titles and positions in the original sequence have not been fully confirmed |
| Lessons 08–14 | Topics identified; full text has not been compared |
| Lessons 15–19 | Topics cross-checked against the conversation; website content remains an edited reconstruction |

**Checked:** the structure of all 19 lessons, YAML snippet syntax, internal links, and key technical topics against official documentation. In particular, the Structured-Merge Diff lesson was updated to reflect the current state of Argo CD.

**Not yet complete:** comparison against the full transcript, version-specific Kubernetes API schema validation, running the labs on kind and GKE, a Docusaurus production build, and crawling for broken external links. These checks are required before the final version can be called verified.

See `CONTENT_STATUS.md`, `CONTENT_AUDIT.json`, and `CONTENT_PROVENANCE.json` in the repository for the detailed lesson-by-lesson audit.

## Notes on the examples

Values such as `example.com`, `PROJECT_ID`, and `REPLACE_*` image digests are illustrative placeholders. Do not apply these examples to production until you have substituted real values and tested them in an appropriate cluster. Examples that use CRDs require the corresponding controller or operator to be installed first.
