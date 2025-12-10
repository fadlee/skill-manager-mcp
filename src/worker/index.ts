/**
 * Worker Entry Point
 * Wires up MCP, API, and static file routes
 * Requirements: 8.1, 8.2
 */

import { Hono } from 'hono';
import type { SkillService } from './services/skill.service';
import { createSkillRepository } from './repositories';
import { createSkillService } from './services';
import { authMiddleware } from './lib/auth';
import { isAppError } from './lib/errors';
// Import route creators
import { createMCPRoutes } from './routes/mcp';

// Extend Hono context with our variables
type Variables = {
  service: SkillService;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  if (isAppError(err)) {
    return c.json(
      { ok: false, error: { code: err.code, message: err.message } },
      err.status as 400 | 401 | 404 | 409 | 500
    );
  }
  return c.json(
    { ok: false, error: { code: 'DB_ERROR', message: 'Internal server error' } },
    500
  );
});

// Health check endpoint (no auth required)
app.get('/api/health', (c) => c.json({ ok: true, status: 'healthy' }));

// Create service per request middleware
app.use('*', async (c, next) => {
  const repo = createSkillRepository(c.env.DB);
  const service = createSkillService(repo);
  c.set('service', service);
  await next();
});

// Apply auth middleware only to write operations and MCP
// GET requests are public for Web UI access
app.use('/mcp', authMiddleware());

// ============================================================================
// API Routes
// ============================================================================

// GET /api/skills - List skills
app.get('/api/skills', async (c) => {
  const service = c.get('service');
  const activeOnly = c.req.query('active_only') === 'true';
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const query = c.req.query('query') || undefined;

  const skills = await service.listSkills({
    activeOnly,
    limit: Math.min(limit, 100),
    offset: Math.max(offset, 0),
    query,
  });

  return c.json({ ok: true, data: { skills, count: skills.length } });
});

// GET /api/skills/:id - Get skill details
app.get('/api/skills/:id', async (c) => {
  const service = c.get('service');
  const skillId = c.req.param('id');
  const versionParam = c.req.query('version');
  const version = versionParam ? parseInt(versionParam, 10) : undefined;

  const skill = await service.getSkill(skillId, version);
  return c.json({ ok: true, data: skill });
});

// GET /api/skills/:id/versions - Get version history
app.get('/api/skills/:id/versions', async (c) => {
  const service = c.get('service');
  const skillId = c.req.param('id');

  const skill = await service.getSkill(skillId);
  return c.json({
    ok: true,
    data: {
      versions: [{
        version_number: skill.version.version_number,
        changelog: skill.version.changelog,
        created_at: skill.version.created_at,
        created_by: skill.version.created_by,
      }],
    },
  });
});

// GET /api/skills/:id/versions/:version/files/* - Get file content
app.get('/api/skills/:id/versions/:version/files/*', async (c) => {
  const service = c.get('service');
  const skillId = c.req.param('id');
  const version = parseInt(c.req.param('version'), 10);
  
  const url = new URL(c.req.url);
  const pathMatch = url.pathname.match(/\/files\/(.+)$/);
  const filePath = pathMatch ? pathMatch[1] : '';

  if (!filePath) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'File path is required' } },
      400
    );
  }

  const file = await service.getFile(skillId, filePath, version);
  return c.json({ ok: true, data: file });
});

// PATCH /api/skills/:id - Update skill status (requires auth)
app.patch('/api/skills/:id', authMiddleware(), async (c) => {
  const service = c.get('service');
  const skillId = c.req.param('id');
  const body = await c.req.json<{ active?: boolean }>();

  if (body.active === undefined) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'active field is required' } },
      400
    );
  }

  const skill = await service.updateStatus(skillId, body.active);
  return c.json({ ok: true, data: skill });
});

// ============================================================================
// MCP Routes
// ============================================================================

app.post('/mcp', async (c) => {
  const service = c.get('service');
  
  // Create a sub-app for MCP and delegate
  const mcpApp = createMCPRoutes(service);
  
  // Forward the request to MCP handler
  return mcpApp.fetch(c.req.raw, c.env, c.executionCtx);
});

export default app;
