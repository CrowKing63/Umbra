import path from 'path';
import fs from 'fs';
import type { SearchResult } from '@umbra/shared-types';
import { getRootPath, isAllowedFile } from './sandbox';

class SearchService {
  private index: Map<string, SearchResult> = new Map();
  private rootPath: string | null = null;

  constructor() {
    this.refreshIndex();
  }

  refreshIndex(): void {
    this.index.clear();
    this.rootPath = getRootPath();

    if (!this.rootPath || !fs.existsSync(this.rootPath)) {
      return;
    }

    this.indexFilesRecursive(this.rootPath);
  }

  private indexFilesRecursive(dirPath: string): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          this.indexFilesRecursive(fullPath);
        } else if (isAllowedFile(entry.name)) {
          this.indexFile(fullPath);
        }
      }
    } catch (err) {
      console.error('Error indexing directory:', dirPath, err);
    }
  }

  private indexFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const root = this.rootPath!;
      const relativePath = path.relative(root, filePath);
      const fileName = path.basename(filePath);

      // Index filename
      this.index.set(`${filePath}:filename`, {
        filePath: relativePath,
        fileName,
        matchType: 'filename',
        snippet: fileName,
      });

      // Index content words
      const words = content.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words.filter(w => w.length > 2));

      for (const word of uniqueWords) {
        const key = `${filePath}:content:${word}`;
        if (!this.index.has(key)) {
          const snippet = this.createSnippet(content, word);
          this.index.set(key, {
            filePath: relativePath,
            fileName,
            matchType: 'content',
            snippet,
          });
        }
      }
    } catch (err) {
      console.error('Error indexing file:', filePath, err);
    }
  }

  private createSnippet(content: string, searchTerm: string): string {
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(searchTerm.toLowerCase());

    if (index === -1) return '';

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + searchTerm.length + 60);
    let snippet = content.substring(start, end).replace(/\s+/g, ' ').trim();

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  search(query: string, scope: 'all' | 'filename' | 'content' = 'all', limit: number = 50): { results: SearchResult[]; total: number; query: string } {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return { results: [], total: 0, query };
    }

    const resultsSet = new Set<SearchResult>();
    const queryTerms = normalizedQuery.split(/\s+/);

    for (const term of queryTerms) {
      if (term.length < 2) continue;

      for (const [key, result] of this.index) {
        const parts = key.split(':');
        const matchType = parts[1] as 'filename' | 'content';

        if (scope === 'filename' && matchType !== 'filename') continue;
        if (scope === 'content' && matchType !== 'content') continue;

        if (matchType === 'filename' && result.fileName.toLowerCase().includes(term)) {
          resultsSet.add(result);
        } else if (matchType === 'content' && parts[2] === term) {
          resultsSet.add(result);
        }
      }
    }

    return {
      results: Array.from(resultsSet).slice(0, limit),
      total: resultsSet.size,
      query,
    };
  }

  invalidateFile(filePath: string): void {
    const absolutePath = path.join(this.rootPath || '', filePath);

    for (const [key] of this.index) {
      if (key.startsWith(absolutePath)) {
        this.index.delete(key);
      }
    }
  }

  addOrUpdateFile(filePath: string): void {
    const absolutePath = path.join(this.rootPath || '', filePath);
    this.invalidateFile(filePath);
    this.indexFile(absolutePath);
  }
}

export const searchService = new SearchService();

export function search(q: string, scope?: 'all' | 'filename' | 'content', limit?: number): { results: SearchResult[]; total: number; query: string } {
  return searchService.search(q, scope, limit);
}

export function refreshSearchIndex(): void {
  searchService.refreshIndex();
}

export function invalidateFileFromIndex(filePath: string): void {
  searchService.invalidateFile(filePath);
}

export function addOrUpdateFileInIndex(filePath: string): void {
  searchService.addOrUpdateFile(filePath);
}