import { useState, useEffect, useCallback } from 'react';
import { useFile } from '../../context/FileContext';
import { searchFiles } from '../../services/searchService';
import type { SearchResult } from '@umbra/shared-types';
import './Search.css';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const { selectFile } = useFile();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const response = await searchFiles({ q: searchQuery, scope: 'all', limit: 50 });
      if (response.success && response.data) {
        setResults(response.data.results);
        setTotal(response.data.total);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    selectFile({ path: result.filePath, content: '', modifiedAt: '' });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search files and content..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />

      {loading && <div className="search-loading">Searching...</div>}

      {!loading && results.length > 0 && (
        <div className="search-results">
          <div className="search-results-header">
            {total} result{total !== 1 ? 's' : ''} found
          </div>
          {results.map((result, idx) => (
            <div
              key={idx}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              <div className="search-result-path">{result.filePath}</div>
              {result.snippet && (
                <div className="search-result-snippet">{result.snippet}</div>
              )}
              <div className="search-result-type">
                Match in {result.matchType}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="search-no-results">No results found</div>
      )}
    </div>
  );
}