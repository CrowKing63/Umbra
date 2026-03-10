import { hash as argon2Hash, verify as argon2Verify, Algorithm } from '@node-rs/argon2';
import crypto from 'crypto';

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
  return argon2Hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return argon2Verify(hash, password);
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
