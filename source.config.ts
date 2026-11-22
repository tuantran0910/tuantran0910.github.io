import {defineConfig, defineDocs} from 'fumadocs-mdx/config';
import remarkDirective from 'remark-directive';
import {visit} from 'unist-util-visit';

function remarkMermaid() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index: number | undefined, parent: any) => {
      if (node.lang !== 'mermaid' || !parent || typeof index !== 'number') return;
      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
      };
    });
  };
}

const calloutTypeMap: Record<string, string> = {
  note: 'info',
  info: 'info',
  tip: 'idea',
  warning: 'warn',
  caution: 'warn',
  danger: 'error',
};

function makeCallout(type: string, title: string | undefined, children: any[]) {
  const attributes: any[] = [{type: 'mdxJsxAttribute', name: 'type', value: type}];
  if (title) {
    attributes.push({type: 'mdxJsxAttribute', name: 'title', value: title});
  }
  return {
    type: 'mdxJsxFlowElement',
    name: 'Callout',
    attributes,
    children,
  };
}

function remarkAdmonitions() {
  return (tree: any) => {
    // 1. Handle remark-directive containerDirective nodes (e.g., :::warning without title)
    visit(tree, 'containerDirective', (node: any, index: number | undefined, parent: any) => {
      const mapped = calloutTypeMap[node.name];
      if (!mapped || !parent || typeof index !== 'number') return;

      let title: string | undefined;
      const children = [...(node.children ?? [])];
      if (children[0]?.data?.directiveLabel) {
        const labelNode = children.shift();
        title = (labelNode.children ?? [])
          .map((c: any) => c.value ?? '')
          .join('')
          .trim();
      }
      parent.children[index] = makeCallout(mapped, title, children);
    });

    // 2. Handle Docusaurus space-titled admonitions (e.g., :::info Source status\n...\n:::)
    if (!Array.isArray(tree.children)) return;
    const out: any[] = [];
    const openRe = /^:::(note|info|tip|warning|caution|danger)(?:[ \t]+([^\n]+))?(?:\n([\s\S]*))?$/;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'paragraph' && node.children?.[0]?.type === 'text') {
        const firstText: string = node.children[0].value;
        const m = openRe.exec(firstText);
        if (m) {
          const mapped = calloutTypeMap[m[1]];
          const title = m[2]?.trim() || undefined;
          const restFirst = m[3] ?? '';
          const lastChild = node.children[node.children.length - 1];

          // Case A: Single-paragraph admonition ending with \n:::
          if (lastChild?.type === 'text' && /\n:::[ \t]*$/.test(lastChild.value)) {
            const innerChildren = node.children.map((c: any) => ({...c}));
            innerChildren[0].value = restFirst;
            const last = innerChildren[innerChildren.length - 1];
            last.value = last.value.replace(/\n:::[ \t]*$/, '');
            const cleaned = innerChildren.filter((c: any) => !(c.type === 'text' && c.value === ''));
            out.push(makeCallout(mapped, title, [{type: 'paragraph', children: cleaned}]));
            continue;
          }

          // Case B: Multi-block admonition ending with a sibling paragraph ":::"
          let closeIdx = -1;
          for (let j = i + 1; j < tree.children.length; j++) {
            const sib = tree.children[j];
            if (
              sib.type === 'paragraph' &&
              sib.children?.length === 1 &&
              sib.children[0].type === 'text' &&
              /^:::[ \t]*$/.test(sib.children[0].value.trim())
            ) {
              closeIdx = j;
              break;
            }
          }
          if (closeIdx !== -1) {
            const bodyNodes: any[] = [];
            if (restFirst || node.children.length > 1) {
              const firstParaChildren = node.children.map((c: any) => ({...c}));
              firstParaChildren[0].value = restFirst;
              const cleaned = firstParaChildren.filter((c: any) => !(c.type === 'text' && c.value === ''));
              if (cleaned.length > 0) bodyNodes.push({type: 'paragraph', children: cleaned});
            }
            for (let j = i + 1; j < closeIdx; j++) {
              bodyNodes.push(tree.children[j]);
            }
            out.push(makeCallout(mapped, title, bodyNodes));
            i = closeIdx;
            continue;
          }
        }
      }
      out.push(node);
    }
    tree.children = out;
  };
}

function remarkStripLeadingH1() {
  return (tree: any) => {
    if (!Array.isArray(tree.children)) return;
    tree.children = tree.children.filter(
      (n: any) => !(n.type === 'heading' && n.depth === 1),
    );
  };
}

export const docs = defineDocs({
  dir: 'docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkDirective,
      remarkAdmonitions,
      remarkStripLeadingH1,
      remarkMermaid,
    ],
    rehypeCodeOptions: {
      fallbackLanguage: 'plaintext',
    },
  },
});
