import type { FileContent, ApiResponse, ImportResponse, ExportFormat } from '@umbra/shared-types';
import { API_BASE } from './api';

export async function fetchFile(path: string): Promise<ApiResponse<FileContent>> {
  const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`);
  return response.json();
}

export async function saveFile(path: string, content: string): Promise<ApiResponse<FileContent>> {
  const response = await fetch(`${API_BASE}/files`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  return response.json();
}

export async function createFile(parentPath: string, name: string, content: string = ''): Promise<ApiResponse<FileContent>> {
  const response = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: parentPath ? `${parentPath}/${name}` : name, content }),
  });
  return response.json();
}

export async function renameFile(path: string, newName: string): Promise<ApiResponse<{ path: string }>> {
  const response = await fetch(`${API_BASE}/files/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, newName }),
  });
  return response.json();
}

export async function deleteFile(path: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });
  return response.json();
}

// UMB-11: Import/Export functions
export async function importFiles(
  files: Array<{ name: string; content: string; targetDir?: string }>,
  conflictResolution?: 'overwrite' | 'keep_both' | 'cancel'
): Promise<ApiResponse<ImportResponse>> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, conflictResolution }),
  });
  return response.json();
}

export async function exportFile(
  filePath: string,
  format: ExportFormat
): Promise<ApiResponse<{ filePath: string; format: ExportFormat; content: string }>> {
  const response = await fetch(`${API_BASE}/export?path=${encodeURIComponent(filePath)}&format=${format}`);
  return response.json();
}
