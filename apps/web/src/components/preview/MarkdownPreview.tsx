import { useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const processMarkdown = async () => {
      try {
        const processed = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype, { allowDangerousHtml: false })
          .use(rehypeRaw)
          .use(rehypeSanitize)
          .use(rehypeStringify)
          .process(content);

        setHtml(String(processed));
      } catch (error) {
        console.error('Failed to process markdown:', error);
        setHtml('<p>Error rendering markdown</p>');
      }
    };

    processMarkdown();
  }, [content]);

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
