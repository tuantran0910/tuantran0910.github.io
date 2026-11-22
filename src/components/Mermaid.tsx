'use client';

import {useEffect, useId, useState} from 'react';

export function Mermaid({chart}: {chart: string}) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'default',
      });
      try {
        const {svg: rendered} = await mermaid.render(
          `mermaid-${id}-${isDark ? 'd' : 'l'}`,
          chart,
        );
        if (!cancelled) setSvg(rendered);
      } catch {
        // Fallback to raw text below if rendering fails
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, id, isDark]);

  if (!svg) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4 text-xs text-fd-muted-foreground">
        {chart}
      </pre>
    );
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-fd-border bg-fd-card/50 p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{__html: svg}}
    />
  );
}
