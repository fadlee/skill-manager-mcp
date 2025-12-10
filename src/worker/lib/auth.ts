/**
 * Authentication middleware for API key validation
 * Requirements: 8.1, 8.2
 */

import type { Context, Next } from 'hono';
import { unauthorized } from './errors';

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Authentication middleware that validates API key
 * 
 * Checks for Bearer token in Authorization header and validates
 * against MCP_API_KEY environment variable.
 * 
 * Requirements:
 * - 8.1: Reject requests without valid Authorization header with 401
 * - 8.2: Process requests with valid Bearer token matching MCP_API_KEY
 */
export function authMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);
    
    // Requirement 8.1: Reject if no valid token
    if (!token) {
      const error = unauthorized();
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as 401
      );
    }
    
    // Requirement 8.2: Validate token against MCP_API_KEY
    const apiKey = c.env.MCP_API_KEY;
    if (!apiKey || token !== apiKey) {
      const error = unauthorized();
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as 401
      );
    }
    
    await next();
  };
}
