import path from 'path';
import fs from 'fs';
import { getSettings } from './database';

export function getRootPath(): string | null {
  const settings = getSettings();
  return settings.rootPath;
}

export function normalizePath(requestPath: string): string {
  return path.normalize(requestPath).replace(/^([a-zA-Z]:)?[/\\]+/, '');
}

export function isPathSafe(requestedPath: string): boolean {
  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return false;
  }

  const normalizedRequested = path.normalize(requestedPath);
  const resolvedRequested = path.resolve(root, normalizedRequested);
  const resolvedRoot = path.resolve(root);

  if (!resolvedRequested.startsWith(resolvedRoot)) {
    return false;
  }

  return true;
}

export function resolvePath(relativePath: string): string | null {
  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return null;
  }

  const normalized = normalizePath(relativePath || '.');
  const fullPath = path.join(root, normalized);

  if (!isPathSafe(normalized)) {
    return null;
  }

  return fullPath;
}

export function isHidden(name: string): boolean {
  return name.startsWith('.');
}

export function isAllowedFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return ext === '.md' || ext === '.txt';
}
