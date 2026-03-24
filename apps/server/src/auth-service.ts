import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

interface Session {
  id: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL).unref();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const key = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const key = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), key);
  } catch {
    return false;
  }
}

export function createSession(): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  
  sessions.set(sessionId, {
    id: sessionId,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE,
  });
  
  return sessionId;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  // Refresh expiration
  session.expiresAt = Date.now() + SESSION_MAX_AGE;
  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function isAuthenticated(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  return getSession(sessionId) !== null;
}
