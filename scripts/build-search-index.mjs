import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const provenance = JSON.parse(readFileSync(new URL('CONTENT_PROVENANCE.json', root), 'utf8'));
const entries = Object.values(provenance).map(({file}) => {
  const source = readFileSync(new URL(file, root), 'utf8');
  const [, frontMatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source) ?? [];
  const title = frontMatter?.match(/^title:[ \t]*(.+)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
  if (!title || !body.trim()) throw new Error(`Missing lesson title or body: ${file}`);

  const text = body
    .replace(/^([`~]{3,})[^\n]*\n[\s\S]*?^\1[ \t]*\r?$/gm, '')
    .replace(/^:::\w*[ \t]*.*$/gm, '')
    .replace(/\[([^\]\n]+)\]\([^\n)]+\)/g, '$1')
    .replace(/(^|\s)[#>*-]+(?=\s)|[*`]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return {title, url: `/${file.slice('docs/'.length, -'.md'.length)}`, text};
});

const output = new URL('src/data/', root);
mkdirSync(output, {recursive: true});
writeFileSync(new URL('search-index.json', output), JSON.stringify(entries));
