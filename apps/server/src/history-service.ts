import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Snapshot, HistoryEntry, HistoryListResponse } from '@umbra/shared-types';
import { getRootPath } from './sandbox';

const HISTORY_DIR = path.join(process.env.UMBRA_DATA_DIR || process.cwd(), '.umbra-data', 'history');
const SNAPSHOTS_DIR = path.join(HISTORY_DIR, 'snapshots');
const METADATA_FILE = path.join(HISTORY_DIR, 'metadata.json');

interface HistoryMetadata {
  filePaths: Record<string, Snapshot[]>; // key: relative file path, value: array of snapshots
}

let metadata: HistoryMetadata = { filePaths: {} };

function ensureDirs(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function loadMetadata(): void {
  ensureDirs();
  
  if (!fs.existsSync(METADATA_FILE)) {
    metadata = { filePaths: {} };
    saveMetadata();
    return;
  }

  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    metadata = JSON.parse(data);
  } catch (err) {
    console.error('Failed to load history metadata:', err);
    metadata = { filePaths: {} };
  }
}

function saveMetadata(): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error('Failed to save history metadata:', err);
  }
}

function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function generateId(): string {
  return crypto.randomUUID();
}

export function getHistory(filePath: string): HistoryListResponse {
  loadMetadata();
  
  const root = getRootPath();
  if (!root) {
    return { filePath, entries: [], total: 0 };
  }

  const snapshots = metadata.filePaths[filePath] || [];
  
  const entries: HistoryEntry[] = snapshots.map(snapshot => ({
    snapshot,
    changeDescription: undefined,
  }));

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => new Date(b.snapshot.timestamp).getTime() - new Date(a.snapshot.timestamp).getTime());

  return {
    filePath,
    entries,
    total: entries.length,
  };
}

export function createSnapshot(filePath: string, content: string, _description?: string): Snapshot | null {
  loadMetadata();
  
  const root = getRootPath();
  if (!root) {
    return null;
  }

  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const id = generateId();
    const timestamp = new Date().toISOString();
    const hash = calculateHash(content);
    const size = Buffer.byteLength(content, 'utf-8');

    // Save snapshot content
    const snapshotPath = path.join(SNAPSHOTS_DIR, id);
    fs.writeFileSync(snapshotPath, content, 'utf-8');

    // Create snapshot record
    const snapshot: Snapshot = {
      id,
      filePath,
      timestamp,
      hash,
      size,
      content: undefined, // Don't store content in metadata
    };

    // Add to metadata
    if (!metadata.filePaths[filePath]) {
      metadata.filePaths[filePath] = [];
    }
    metadata.filePaths[filePath].push(snapshot);
    saveMetadata();

    return snapshot;
  } catch (err) {
    console.error('Failed to create snapshot:', err);
    return null;
  }
}

export function getSnapshotContent(snapshotId: string): string | null {
  const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotId);
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  try {
    return fs.readFileSync(snapshotPath, 'utf-8');
  } catch (err) {
    console.error('Failed to read snapshot:', err);
    return null;
  }
}

export function restoreSnapshot(snapshotId: string, targetPath: string): boolean {
  const content = getSnapshotContent(snapshotId);
  if (content === null) {
    return false;
  }

  const root = getRootPath();
  if (!root) {
    return false;
  }

  const fullPath = path.join(root, targetPath);
  
  try {
    // Atomic write using temp file
    const tempPath = fullPath + '.tmp';
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, fullPath);
    return true;
  } catch (err) {
    console.error('Failed to restore snapshot:', err);
    return false;
  }
}

export function deleteFileHistory(filePath: string): void {
  loadMetadata();
  
  if (metadata.filePaths[filePath]) {
    // Delete snapshot files
    for (const snapshot of metadata.filePaths[filePath]) {
      const snapshotPath = path.join(SNAPSHOTS_DIR, snapshot.id);
      if (fs.existsSync(snapshotPath)) {
        try {
          fs.unlinkSync(snapshotPath);
         } catch (err) {
           console.error('Failed to delete snapshot file:', snapshot.id, err);
         }
      }
    }
    delete metadata.filePaths[filePath];
    saveMetadata();
  }
}

// Initialize metadata on module load
loadMetadata();