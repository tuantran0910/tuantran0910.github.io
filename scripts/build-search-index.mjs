import {mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {posix} from 'node:path';

const root = new URL('../', import.meta.url);
const docsDir = new URL('docs/', root);
const excludedFiles = new Set(['index.mdx', 'learning-path.md', 'topics.mdx']);

function collectDocs(dirUrl, relPrefix = '') {
  const results = [];
  for (const entry of readdirSync(dirUrl, {withFileTypes: true})) {
    const rel = relPrefix ? posix.join(relPrefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectDocs(new URL(`${entry.name}/`, dirUrl), rel));
    } else if ((entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) && !excludedFiles.has(rel)) {
      results.push(rel);
    }
  }
  return results.sort();
}

const entries = collectDocs(docsDir).map(rel => {
  const source = readFileSync(new URL(rel, docsDir), 'utf8');
  const [, frontMatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source) ?? [];
  const title = frontMatter?.match(/^title:[ \t]*(.+)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
  if (!title || !body?.trim()) throw new Error(`Missing doc title or body: docs/${rel}`);

  const text = body
    .replace(/^([`~]{3,})[^\n]*\n[\s\S]*?^\1[ \t]*\r?$/gm, '')
    .replace(/^import[ \t]+[\s\S]*?from[ \t]+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/<\/?[A-Z][A-Za-z0-9]*(?:\s[^>]*)?\/?>/g, ' ')
    .replace(/<\/?(?:details|summary)(?:\s[^>]*)?>/gi, ' ')
    .replace(/^:::\w*[ \t]*.*$/gm, '')
    .replace(/\[([^\]\n]+)\]\([^\n)]+\)/g, '$1')
    .replace(/(^|\s)[#>*-]+(?=\s)|[*`]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const url = `/${rel.replace(/\.mdx?$/, '')}`;
  return {title, url, text};
});

const output = new URL('src/data/', root);
mkdirSync(output, {recursive: true});
writeFileSync(new URL('search-index.json', output), JSON.stringify(entries));
