/**
 * Session Store Service - D1-backed storage for ZIP upload sessions
 * Requirements: 1.7, 5.7
 *
 * Stores parsed ZIP data (SkillFolder[]) between parse and process steps.
 * Uses D1 database for persistence across Cloudflare Worker instances.
 */

import type { SkillFolder } from './zip-parser.service';

/**
 * Session TTL: 10 minutes in milliseconds
 */
export const SESSION_TTL = 10 * 60 * 1000;

/**
 * Data stored in a session
 */
export interface SessionData {
  skills: SkillFolder[];
  created_at: number;
  expires_at: number;
}

/**
 * Session store interface
 */
export interface SessionStore {
  /** Store parsed ZIP data with TTL, returns session_id */
  create(skills: SkillFolder[]): Promise<string>;

  /** Retrieve session data by ID, returns null if not found or expired */
  get(sessionId: string): Promise<SessionData | null>;

  /** Delete session after processing */
  delete(sessionId: string): Promise<void>;

  /** Clean up expired sessions */
  cleanup(): Promise<void>;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Create a D1-backed session store instance
 * @param db - D1 database binding
 */
export function createSessionStore(db: D1Database): SessionStore {
  return {
    /**
     * Store parsed ZIP data with TTL
     * Requirements: 1.7 - store ZIP temporarily and return session ID
     */
    async create(skills: SkillFolder[]): Promise<string> {
      const sessionId = generateSessionId();
      const now = Date.now();
      const expiresAt = now + SESSION_TTL;

      const skillsData = JSON.stringify(skills);

      await db
        .prepare(
          'INSERT INTO upload_sessions (id, skills_data, created_at, expires_at) VALUES (?, ?, ?, ?)'
        )
        .bind(sessionId, skillsData, now, expiresAt)
        .run();

      return sessionId;
    },

    /**
     * Retrieve session data by ID
     * Requirements: 5.7 - return null if session expires or not found
     */
    async get(sessionId: string): Promise<SessionData | null> {
      const now = Date.now();

      const result = await db
        .prepare(
          'SELECT skills_data, created_at, expires_at FROM upload_sessions WHERE id = ? AND expires_at > ?'
        )
        .bind(sessionId, now)
        .first<{ skills_data: string; created_at: number; expires_at: number }>();

      if (!result) {
        return null;
      }

      return {
        skills: JSON.parse(result.skills_data) as SkillFolder[],
        created_at: result.created_at,
        expires_at: result.expires_at,
      };
    },

    /**
     * Delete session after processing
     */
    async delete(sessionId: string): Promise<void> {
      await db.prepare('DELETE FROM upload_sessions WHERE id = ?').bind(sessionId).run();
    },

    /**
     * Clean up all expired sessions
     * Should be called periodically to prevent database bloat
     */
    async cleanup(): Promise<void> {
      const now = Date.now();
      await db.prepare('DELETE FROM upload_sessions WHERE expires_at <= ?').bind(now).run();
    },
  };
}
