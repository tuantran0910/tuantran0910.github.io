'use client';

import {Maximize2, X} from 'lucide-react';
import {useEffect, useId, useState} from 'react';

export function Mermaid({chart}: {chart: string}) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [isDark, setIsDark] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  if (!svg) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4 text-xs text-fd-muted-foreground">
        {chart}
      </pre>
    );
  }

  return (
    <>
      <div className="not-prose group relative my-6 rounded-xl border border-fd-border bg-fd-card/50 p-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Expand diagram"
          title="Expand diagram"
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-background/90 px-2 py-1 text-xs text-fd-muted-foreground opacity-0 shadow-xs transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-fd-foreground"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <div
          onClick={() => setExpanded(true)}
          className="flex cursor-zoom-in justify-center overflow-x-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{__html: svg}}
        />
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded diagram view"
          onClick={() => setExpanded(false)}
          className="not-prose fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs md:p-8"
        >
          <div
            onClick={event => event.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-fd-border bg-fd-background p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close diagram"
              className="sticky top-0 float-right inline-flex items-center justify-center rounded-lg border border-fd-border bg-fd-card p-1.5 text-fd-muted-foreground hover:text-fd-foreground"
            >
              <X className="size-4" />
            </button>
            <div
              className="flex min-h-[40vh] items-center justify-center pt-4 [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{__html: svg}}
            />
          </div>
        </div>
      )}
    </>
  );
}
