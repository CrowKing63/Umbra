import fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { getSettings, updateSettings } from './database';
import { getRootPath, resolvePath, isHidden, isAllowedFile, isPathSafe } from './sandbox';
import { search, invalidateFileFromIndex, addOrUpdateFileInIndex, refreshSearchIndex } from './search-service';
import {
  createSnapshot,
  getHistory,
  getSnapshotContent,
  restoreSnapshot,
  deleteFileHistory
} from './history-service';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  isAuthenticated
} from './auth-service';
import { getNetworkInfo } from './network';
import type {
  Settings,
  FileNode,
  FileContent,
  SearchRequest,
  RestoreRequest,
  ImportResponse,
  ExportFormat,
  LoginRequest,
  SetPasswordRequest
} from '@umbra/shared-types';

const app = fastify({ logger: true });

const ERR_ROOT = 'Root path not configured or not found';
const ERR_FILE_NOT_FOUND = 'File not found';
const ERR_NOT_A_FILE = 'Path is not a file';
const ERR_INVALID_EXT = 'File extension not allowed. Only .md and .txt are supported.';

// Authentication middleware
function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const settings = getSettings();
  
  if (!settings.passwordEnabled) {
    return; // No auth required
  }
  
  // Skip auth endpoints
  const url = request.url;
  if (url?.startsWith('/api/v1/auth/')) {
    return;
  }
  
  const sessionId = request.cookies.session_id;
  if (!isAuthenticated(sessionId)) {
    reply.code(401).send({ success: false, error: 'Authentication required' });
    return;
  }
}

// Auth endpoints
app.post('/api/v1/auth/login', async (request, reply) => {
  const settings = getSettings();
  
  if (!settings.passwordEnabled) {
    return { success: false, error: 'Password protection is not enabled' };
  }
  
  const body = request.body as LoginRequest;
  if (!body.password) {
    return { success: false, error: 'Password is required' };
  }
  
  if (!settings.passwordHash) {
    return { success: false, error: 'Password not set. Please enable password protection first.' };
  }
  
  const valid = await verifyPassword(settings.passwordHash, body.password);
  if (!valid) {
    return { success: false, error: 'Invalid password' };
  }
  
  const sessionId = createSession();
  reply.setCookie('session_id', sessionId, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    sameSite: 'lax',
  });
  
  return { success: true, sessionId };
});

app.post('/api/v1/auth/logout', async (request, reply) => {
  const sessionId = request.cookies.session_id;
  if (sessionId) {
    deleteSession(sessionId);
  }
  reply.clearCookie('session_id');
  return { success: true };
});

app.post('/api/v1/auth/set-password', async (request) => {
  // This endpoint requires authentication if password is already enabled
  const settings = getSettings();
  
  if (settings.passwordEnabled && settings.passwordHash) {
    // Must be logged in to change password
    const sessionId = request.cookies.session_id;
    if (!isAuthenticated(sessionId)) {
      return { success: false, error: 'Authentication required to change password' };
    }
  }
  
  const body = request.body as SetPasswordRequest;
  if (!body.password) {
    return { success: false, error: 'Password is required' };
  }
  
  if (body.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  
  const hashed = await hashPassword(body.password);
  const updates: Partial<Settings> = {
    passwordHash: hashed,
    passwordEnabled: body.enable
  };
  updateSettings(updates);
  
  return { success: true };
});

app.get('/api/v1/auth/session', async (request) => {
  const sessionId = request.cookies.session_id;
  if (isAuthenticated(sessionId)) {
    return { success: true, data: { authenticated: true } };
  }
  return { success: true, data: { authenticated: false } };
});

app.get('/api/v1/health', async () => {
  const settings = getSettings();
  const networkInfo = getNetworkInfo();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: settings.port,
    lanEnabled: settings.lanEnabled,
    localhostUrl: networkInfo.localhostUrl,
    lanUrl: networkInfo.lanUrl,
  };
});

app.get('/api/v1/settings', async () => {
  const settings = getSettings();
  return { success: true, data: settings };
});

app.patch('/api/v1/settings', async (request) => {
  const updates = request.body as Partial<Settings>;
  const settings = updateSettings(updates);
  return { success: true, data: settings };
});

app.get('/api/v1/network', async () => {
  const networkInfo = getNetworkInfo();
  return { success: true, data: networkInfo };
});

function buildFileTree(dirPath: string, depth: number = 0): FileNode[] {
  if (depth > 10) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (isHidden(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(getRootPath()!, fullPath);
    
    if (entry.isDirectory()) {
      const children = buildFileTree(fullPath, depth + 1);
      nodes.push({
        name: entry.name,
        path: relativePath,
        isDirectory: true,
        children: children.length > 0 ? children : undefined,
      });
    } else {
      if (!isAllowedFile(entry.name)) continue;

      const stats = fs.statSync(fullPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        isDirectory: false,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

app.get('/api/v1/tree', async () => {
  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const tree = buildFileTree(root);
  return { success: true, data: tree };
});

app.get('/api/v1/files', async (request) => {
  const { path: filePath } = request.query as { path?: string };
  
  if (!filePath) {
    return { success: false, error: 'Path parameter is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const relativePath = path.relative(root, fullPath);

  const fileContent: FileContent = {
    path: relativePath,
    content,
    modifiedAt: stats.mtime.toISOString(),
  };

  return { success: true, data: fileContent };
});

interface CreateFileBody {
  path: string;
  content?: string;
}

app.post('/api/v1/files', async (request) => {
  const body = request.body as CreateFileBody;
  const { path: filePath, content = '' } = body;

  if (!filePath) {
    return { success: false, error: 'Path is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath) {
    return { success: false, error: 'Invalid path' };
  }

  if (fs.existsSync(fullPath)) {
    return { success: false, error: 'File already exists' };
  }

  const dirPath = path.dirname(fullPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext && !isAllowedFile(filePath)) {
    return { success: false, error: ERR_INVALID_EXT };
  }

  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const stats = fs.statSync(fullPath);
    const relativePath = path.relative(root, fullPath);
    
    // Update search index
    addOrUpdateFileInIndex(relativePath);
     
    return { 
      success: true, 
      data: {
        path: relativePath,
        content,
        modifiedAt: stats.mtime.toISOString(),
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to create file: ${err}` };
  }
});

interface UpdateFileBody {
  path: string;
  content: string;
}

app.put('/api/v1/files', async (request) => {
  const body = request.body as UpdateFileBody;
  const { path: filePath, content } = body;

  if (!filePath || content === undefined) {
    return { success: false, error: 'Path and content are required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  try {
    const tempPath = fullPath + '.tmp';
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, fullPath);
    
    const newStats = fs.statSync(fullPath);
    const relativePath = path.relative(root, fullPath);

    // Update search index
    addOrUpdateFileInIndex(relativePath);

    // Create snapshot for history (UMB-10)
    createSnapshot(relativePath, content);

    return { 
      success: true, 
      data: {
        path: relativePath,
        content,
        modifiedAt: newStats.mtime.toISOString(),
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to save file: ${err}` };
  }
});

interface RenameFileBody {
  path: string;
  newName: string;
}

app.patch('/api/v1/files/rename', async (request) => {
  const body = request.body as RenameFileBody;
  const { path: filePath, newName } = body;

  if (!filePath || !newName) {
    return { success: false, error: 'Path and newName are required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  const dirPath = path.dirname(fullPath);
  const newPath = path.join(dirPath, newName);

  if (!isPathSafe(path.relative(root, newPath))) {
    return { success: false, error: 'Invalid target path' };
  }

  if (fs.existsSync(newPath)) {
    return { success: false, error: 'A file with the new name already exists' };
  }

  try {
    fs.renameSync(fullPath, newPath);
    const newStats = fs.statSync(newPath);
    const relativePath = path.relative(root, newPath);

    // Update search index: invalidate old, add new
    invalidateFileFromIndex(relativePath);
    addOrUpdateFileInIndex(relativePath);

    return { 
      success: true, 
      data: {
        path: relativePath,
        content: '',
        modifiedAt: newStats.mtime.toISOString(),
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to rename file: ${err}` };
  }
});

app.delete('/api/v1/files', async (request) => {
  const { path: filePath } = request.query as { path?: string };

  if (!filePath) {
    return { success: false, error: 'Path parameter is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  try {
    fs.unlinkSync(fullPath);
    // Remove from search index
    invalidateFileFromIndex(filePath);
    // Delete history for this file (UMB-10)
    deleteFileHistory(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to delete file: ${err}` };
  }
});

// UMB-11: Import endpoint
interface ImportFile {
  name: string;
  content: string;
  targetDir?: string;
}

interface ImportRequestBody {
  files: ImportFile[];
  conflictResolution?: 'overwrite' | 'keep_both' | 'cancel';
}

app.post('/api/v1/import', async (request): Promise<{ success: boolean; data?: ImportResponse; error?: string }> => {
  const body = request.body as ImportRequestBody;
  const { files, conflictResolution = 'keep_both' } = body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return { success: false, error: 'Files array is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const imported: Array<{ sourcePath: string; targetPath: string; status: 'created' | 'overwritten' }> = [];
  const skipped: Array<{ sourcePath: string; reason: string }> = [];

  for (const file of files) {
    const { name, content, targetDir = '' } = file;

    if (!name) {
      skipped.push({ sourcePath: 'unnamed', reason: 'File name is required' });
      continue;
    }

    const ext = path.extname(name).toLowerCase();
    if (ext && !isAllowedFile(name)) {
      skipped.push({ sourcePath: name, reason: ERR_INVALID_EXT });
      continue;
    }

    // Build initial target path
    let targetPath = targetDir ? path.join(targetDir, name) : name;
    let fullPath = resolvePath(targetPath);

    if (!fullPath) {
      skipped.push({ sourcePath: name, reason: 'Invalid target path' });
      continue;
    }

    // Check for conflicts and resolve
    let fileExisted = false;
    if (fs.existsSync(fullPath)) {
      fileExisted = true;
      if (conflictResolution === 'cancel') {
        skipped.push({ sourcePath: name, reason: 'File already exists and conflict resolution set to cancel' });
        continue;
      } else if (conflictResolution === 'overwrite') {
        // Proceed with overwrite
      } else if (conflictResolution === 'keep_both') {
        // Generate unique name
        const base = path.basename(name, ext);
        let counter = 1;
        do {
          const newName = `${base} (${counter})${ext}`;
          targetPath = path.join(targetDir || '', newName);
          fullPath = resolvePath(targetPath);
          if (!fullPath) {
            skipped.push({ sourcePath: name, reason: 'Failed to resolve unique path' });
            break;
          }
          counter++;
        } while (fs.existsSync(fullPath));
        if (!fullPath) continue;
        fileExisted = false; // New file created
      }
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      const relativePath = path.relative(root, fullPath);

      // Update search index
      addOrUpdateFileInIndex(relativePath);

      imported.push({
        sourcePath: name,
        targetPath: relativePath,
        status: fileExisted ? 'overwritten' : 'created'
      });
    } catch (err) {
      skipped.push({ sourcePath: name, reason: `Failed to write file: ${err}` });
    }
  }

  return {
    success: true,
    data: {
      imported,
      skipped
    }
  };
});

// UMB-11: Export endpoint
app.get('/api/v1/export', async (request) => {
  const { path: filePath, format = 'txt' } = request.query as { path?: string; format?: ExportFormat };

  if (!filePath) {
    return { success: false, error: 'Path parameter is required' };
  }

  if (!['txt', 'html', 'pdf'].includes(format)) {
    return { success: false, error: 'Invalid export format. Supported: txt, html, pdf' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');

    // For txt format, return raw content
    // For html and pdf, return raw markdown content; client will convert to HTML
    // (PDF will be generated from HTML on client side via browser print)
    return {
      success: true,
      data: {
        filePath,
        format,
        content
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to read file: ${err}` };
  }
});

interface CreateFolderBody {
  path: string;
}

app.post('/api/v1/folders', async (request) => {
  const body = request.body as CreateFolderBody;
  const { path: folderPath } = body;

  if (!folderPath) {
    return { success: false, error: 'Path is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(folderPath);
  if (!fullPath) {
    return { success: false, error: 'Invalid path' };
  }

  if (fs.existsSync(fullPath)) {
    return { success: false, error: 'Folder already exists' };
  }

  try {
    fs.mkdirSync(fullPath, { recursive: true });
    const relativePath = path.relative(root, fullPath);

    return { 
      success: true, 
      data: {
        name: path.basename(fullPath),
        path: relativePath,
        isDirectory: true,
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to create folder: ${err}` };
  }
});

interface RenameFolderBody {
  path: string;
  newName: string;
}

app.patch('/api/v1/folders/rename', async (request) => {
  const body = request.body as RenameFolderBody;
  const { path: folderPath, newName } = body;

  if (!folderPath || !newName) {
    return { success: false, error: 'Path and newName are required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(folderPath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: 'Folder not found' };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isDirectory()) {
    return { success: false, error: 'Path is not a folder' };
  }

  const dirPath = path.dirname(fullPath);
  const newPath = path.join(dirPath, newName);

  if (!isPathSafe(path.relative(root, newPath))) {
    return { success: false, error: 'Invalid target path' };
  }

  if (fs.existsSync(newPath)) {
    return { success: false, error: 'A folder with the new name already exists' };
  }

  try {
    fs.renameSync(fullPath, newPath);
    const relativePath = path.relative(root, newPath);

    // Refresh entire index since folder rename affects all nested files
    refreshSearchIndex();

    return { 
      success: true, 
      data: {
        name: path.basename(newPath),
        path: relativePath,
        isDirectory: true,
      }
    };
  } catch (err) {
    return { success: false, error: `Failed to rename folder: ${err}` };
  }
});

app.delete('/api/v1/folders', async (request) => {
  const { path: folderPath } = request.query as { path?: string };

  if (!folderPath) {
    return { success: false, error: 'Path parameter is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(folderPath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: 'Folder not found' };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isDirectory()) {
    return { success: false, error: 'Path is not a folder' };
  }

  const entries = fs.readdirSync(fullPath);
  if (entries.length > 0) {
    return { success: false, error: 'Folder is not empty. Please delete all contents first.' };
  }

  try {
    fs.rmdirSync(fullPath);
    // Refresh entire index since folder deletion affects all nested files
    refreshSearchIndex();
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to delete folder: ${err}` };
  }
});

app.get('/api/v1/search', async (request) => {
  const { q, scope, limit } = request.query as { q?: string; scope?: string; limit?: number };

  if (!q || q.trim() === '') {
    return { success: false, error: 'Search query is required' };
  }

  const searchRequest: SearchRequest = {
    q: q.trim(),
    scope: scope as 'all' | 'filename' | 'content' || 'all',
    limit: limit || 50,
  };

  const result = search(searchRequest.q, searchRequest.scope, searchRequest.limit);
  return { success: true, data: result };
});

app.get('/api/v1/history', async (request) => {
  const { path: filePath } = request.query as { path?: string };
  
  if (!filePath) {
    return { success: false, error: 'Path parameter is required' };
  }

  const history = getHistory(filePath);
  return { success: true, data: history };
});

app.post('/api/v1/history/snapshot', async (request) => {
  const { filePath, description } = request.body as { filePath: string; description?: string };
  
  if (!filePath) {
    return { success: false, error: 'File path is required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const snapshot = createSnapshot(filePath, content, description);
    
    if (snapshot) {
      return { success: true, data: snapshot };
    } else {
      return { success: false, error: 'Failed to create snapshot' };
    }
  } catch (err) {
    return { success: false, error: `Failed to create snapshot: ${err}` };
  }
});

app.get('/api/v1/history/:id/content', async (request) => {
  const { id } = request.params as { id: string };
  
  const content = getSnapshotContent(id);
  if (content === null) {
    return { success: false, error: 'Snapshot not found' };
  }
  
  return { success: true, data: { content } };
});

app.post('/api/v1/history/restore', async (request) => {
  const { snapshotId, filePath } = request.body as RestoreRequest;
  
  if (!snapshotId || !filePath) {
    return { success: false, error: 'Snapshot ID and file path are required' };
  }

  const root = getRootPath();
  if (!root || !fs.existsSync(root)) {
    return { success: false, error: ERR_ROOT };
  }

  const fullPath = resolvePath(filePath);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return { success: false, error: ERR_FILE_NOT_FOUND };
  }

  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) {
    return { success: false, error: ERR_NOT_A_FILE };
  }

  const success = restoreSnapshot(snapshotId, filePath);
  if (!success) {
    return { success: false, error: 'Failed to restore snapshot' };
  }

  return { success: true };
});

// Register cookie plugin and start server
(async () => {
  try {
    await app.register(fastifyCookie);

    // Register auth hook
    app.addHook('preHandler', requireAuth);

    // Serve web app static files in production (Electron sets UMBRA_STATIC_PATH)
    const staticPath = process.env.UMBRA_STATIC_PATH;
    if (staticPath && fs.existsSync(staticPath)) {
      await app.register(fastifyStatic, { root: staticPath, prefix: '/', wildcard: false });
      // SPA fallback: serve index.html for client-side routes
      app.setNotFoundHandler((_request, reply) => {
        reply.sendFile('index.html', staticPath);
      });
    }

    const settings = getSettings();
    await app.listen({ port: settings.port, host: settings.lanEnabled ? '0.0.0.0' : '127.0.0.1' });
    console.log(`Server running at http://localhost:${settings.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
})();
