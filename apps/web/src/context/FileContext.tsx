import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { FileContent } from '@umbra/shared-types';
import { saveFile } from '../services/fileService';
import { getWordCount } from '../hooks/useCodeMirror';

interface EditorState {
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  wordCount: number;
}

interface FileContextType {
  selectedFile: FileContent | null;
  editorState: EditorState;
  selectFile: (file: FileContent | null) => void;
  updateContent: (content: string) => void;
  saveContent: () => Promise<boolean>;
  resetDirty: () => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const EMPTY_EDITOR_STATE: EditorState = {
  content: '',
  isDirty: false,
  isSaving: false,
  wordCount: 0,
};

export function FileProvider({ children }: { children: ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(EMPTY_EDITOR_STATE);

  const selectFile = useCallback((file: FileContent | null) => {
    setSelectedFile(file);
    if (file) {
      setEditorState({
        content: file.content,
        isDirty: false,
        isSaving: false,
        wordCount: getWordCount(file.content),
      });
    } else {
      setEditorState(EMPTY_EDITOR_STATE);
    }
  }, []);

  const updateContent = useCallback((content: string) => {
    setEditorState(prev => ({
      ...prev,
      content,
      isDirty: content !== selectedFile?.content,
      wordCount: getWordCount(content),
    }));
  }, [selectedFile?.content]);

  const resetDirty = useCallback(() => {
    setEditorState(prev => ({ ...prev, isDirty: false }));
  }, []);

  const saveContent = useCallback(async (): Promise<boolean> => {
    if (!selectedFile || !editorState.isDirty) {
      return true;
    }

    setEditorState(prev => ({ ...prev, isSaving: true }));

    try {
      const response = await saveFile(selectedFile.path, editorState.content);
      if (response.success) {
        setSelectedFile({
          ...selectedFile,
          content: editorState.content,
          modifiedAt: response.data?.modifiedAt || new Date().toISOString(),
        });
        setEditorState(prev => ({ ...prev, isDirty: false, isSaving: false }));
        return true;
      } else {
        setEditorState(prev => ({ ...prev, isSaving: false }));
        console.error('Save failed:', response.error);
        return false;
      }
    } catch (error) {
      setEditorState(prev => ({ ...prev, isSaving: false }));
      console.error('Save error:', error);
      return false;
    }
  }, [selectedFile, editorState.isDirty, editorState.content]);

  return (
    <FileContext.Provider value={{
      selectedFile,
      editorState,
      selectFile,
      updateContent,
      saveContent,
      resetDirty,
    }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFile() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
}
