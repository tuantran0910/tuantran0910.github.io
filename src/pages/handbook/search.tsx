import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import index from '../../data/search-index.json';

const normalizeSearch = (value: string) => value.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase();

export default function Search() {
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = normalizeSearch(query).trim();
    if (!q) return index;
    const terms = q.split(/\s+/).filter(Boolean);
    return index.filter(item => {
      const hay = normalizeSearch(`${item.title} ${item.text}`);
      return terms.every(t => hay.includes(t));
    });
  }, [query]);
  return <Layout title="Handbook Search" description="Search all Cloud Native Engineering Handbook lessons">
    <main className="container margin-vert--lg">
      <h1>Search the handbook</h1>
      <p>Search runs locally in your browser.</p>
      <input aria-label="Search lessons" className="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try CSI, Istio, HPA, or NetworkPolicy" />
      <p className="margin-top--md" role="status">{items.length} {items.length === 1 ? 'lesson' : 'lessons'} found</p>
      <div className="card-grid">{items.map(item => <Link key={item.url} className="topic-card" to={`/handbook${item.url}`}>
        <h3>{item.title}</h3><p>{item.text.slice(0, 190)}…</p>
      </Link>)}</div>
    </main>
  </Layout>;
}
