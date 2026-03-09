import { forwardRef, useRef, useImperativeHandle } from 'react';
import { useCodeMirror } from '../../hooks/useCodeMirror';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export interface MarkdownEditorRef {
  getEditor: () => any;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ content, onChange, editable = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);

    useCodeMirror(containerRef, { content, onChange, editable });

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
    }));

    return <div ref={containerRef} className="markdown-editor" />;
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
