import type { SearchRequest, SearchResponse, ApiResponse } from '@umbra/shared-types';
import { API_BASE } from './api';

export async function searchFiles(request: SearchRequest): Promise<ApiResponse<SearchResponse>> {
  const params = new URLSearchParams();
  if (request.q) params.append('q', request.q);
  if (request.scope) params.append('scope', request.scope);
  if (request.limit) params.append('limit', String(request.limit));

  const response = await fetch(`${API_BASE}/search?${params.toString()}`);
  return response.json();
}