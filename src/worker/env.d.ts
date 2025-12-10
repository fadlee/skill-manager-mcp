/**
 * Extended environment bindings for the worker
 * MCP_API_KEY is set via `wrangler secret put MCP_API_KEY`
 */

declare global {
  interface Env {
    MCP_API_KEY?: string;
  }
}

export {};
