export interface Settings {
  rootPath: string | null;
  port: number;
  lanEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  autosaveInterval: number;
  snapshotInterval: number;
  passwordEnabled: boolean;
  passwordHash?: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  modifiedAt?: string;
}

export interface FileContent {
  path: string;
  content: string;
  modifiedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MatchType = 'filename' | 'content';

export interface SearchResult {
  filePath: string;
  fileName: string;
  matchType: MatchType;
  snippet?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface SearchRequest {
  q: string;
  scope?: 'all' | 'filename' | 'content';
  limit?: number;
}

export interface Snapshot {
  id: string;
  filePath: string;
  timestamp: string;
  hash: string;
  size: number;
  content?: string; // Only included when fetching specific snapshot
}

export interface HistoryEntry {
  snapshot: Snapshot;
  changeDescription?: string;
}

export interface HistoryListResponse {
  filePath: string;
  entries: HistoryEntry[];
  total: number;
}

export interface CreateSnapshotRequest {
  filePath: string;
  description?: string;
}

export interface RestoreRequest {
  snapshotId: string;
  filePath: string;
}

// UMB-11: Import/Export types
export type ExportFormat = 'txt' | 'html' | 'pdf';

export interface ImportRequest {
  sourcePath: string;
  targetPath?: string;
  conflictResolution?: 'overwrite' | 'keep_both' | 'cancel';
}

export interface ImportResponse {
  imported: Array<{
    sourcePath: string;
    targetPath: string;
    status: 'created' | 'overwritten' | 'skipped';
  }>;
  skipped: Array<{
    sourcePath: string;
    reason: string;
  }>;
}

export interface ExportRequest {
  filePath: string;
  format: ExportFormat;
}

export interface ExportResponse {
  filePath: string;
  format: ExportFormat;
  content?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ConflictResolution {
  type: 'overwrite' | 'keep_both' | 'cancel';
  targetPath?: string;
}

// UMB-12: Authentication types
export interface LoginRequest {
  password: string;
}

export interface SetPasswordRequest {
  password: string;
  enable: boolean;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  sessionId?: string;
}

export interface SessionInfo {
  authenticated: boolean;
  userId?: string;
  expiresAt?: string;
}

// UMB-13: Network settings types
export interface NetworkInfo {
  port: number;
  lanEnabled: boolean;
  localhostUrl: string;
  lanUrl?: string;
  localIp?: string;
}
