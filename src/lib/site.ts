export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://tuantran0910.github.io'
).replace(/\/$/, '');

export const GITHUB_REPO_URL = (
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ||
  'https://github.com/tuantran0910/tuantran0910.github.io'
).replace(/\/$/, '');

export const GITHUB_EDIT_DOCS_BASE = `${GITHUB_REPO_URL}/edit/main/docs`;
