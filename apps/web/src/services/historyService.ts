import type { ApiResponse, HistoryListResponse, Snapshot } from '@umbra/shared-types';
import { API_BASE } from './api';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json() as ApiResponse<T>;
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Request failed');
  }
  return data.data;
}

export async function getHistory(filePath: string): Promise<HistoryListResponse> {
  const response = await fetch(`${API_BASE}/history?path=${encodeURIComponent(filePath)}`);
  return handleResponse<HistoryListResponse>(response);
}

export async function createSnapshot(filePath: string): Promise<Snapshot> {
  const response = await fetch(`${API_BASE}/history/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  return handleResponse<Snapshot>(response);
}

export async function getSnapshotContent(snapshotId: string): Promise<{ content: string }> {
  const response = await fetch(`${API_BASE}/history/${encodeURIComponent(snapshotId)}/content`);
  return handleResponse<{ content: string }>(response);
}

export async function restoreSnapshot(snapshotId: string, filePath: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/history/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotId, filePath }),
  });
  return handleResponse<boolean>(response);
}