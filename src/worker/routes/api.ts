/**
 * REST API Routes
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 6.1, 7.1
 */

import { Hono } from 'hono';
import type { SkillService } from '../services/skill.service';
import { isAppError } from '../lib/errors';

/**
 * Create REST API routes
 */
export function createAPIRoutes(service: SkillService) {
  const app = new Hono<{ Bindings: Env }>();

  // Error handler
  app.onError((err, c) => {
    console.error('API error:', err);
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

  /**
   * GET /api/skills - List skills with pagination and search
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  app.get('/skills', async (c) => {
    const activeOnly = c.req.query('active_only') === 'true';
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const query = c.req.query('query') || undefined;
    const detailed = c.req.query('detailed') !== 'false'; // Default to true for web UI

    const skills = await service.listSkills({
      activeOnly,
      limit: Math.min(limit, 100), // Cap at 100
      offset: Math.max(offset, 0),
      query,
      detailed,
    });

    return c.json({ ok: true, data: { skills, count: skills.length } });
  });


  /**
   * GET /api/skills/:id - Get skill details
   * Requirements: 4.1, 4.2, 4.3
   */
  app.get('/skills/:id', async (c) => {
    const skillId = c.req.param('id');
    const versionParam = c.req.query('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    const skill = await service.getSkill(skillId, version);
    return c.json({ ok: true, data: skill });
  });

  /**
   * GET /api/skills/:id/versions - Get version history
   * Requirements: 6.1, 6.2
   */
  app.get('/skills/:id/versions', async (c) => {
    const skillId = c.req.param('id');

    // First verify skill exists
    await service.getSkill(skillId);

    // Get all versions by fetching skill details for each version
    // We need to access the repository directly for this, but since we only have service,
    // we'll get the skill and then list versions through a workaround
    // For now, return the current version info - this will be enhanced when we wire up the full app
    const skill = await service.getSkill(skillId);
    
    // Return versions array with at least the current version
    return c.json({
      ok: true,
      data: {
        versions: [
          {
            version_number: skill.version.version_number,
            changelog: skill.version.changelog,
            created_at: skill.version.created_at,
            created_by: skill.version.created_by,
          },
        ],
      },
    });
  });

  /**
   * GET /api/skills/:id/versions/:version/files/*path - Get file content
   * Requirements: 5.1, 5.2
   */
  app.get('/skills/:id/versions/:version/files/*', async (c) => {
    const skillId = c.req.param('id');
    const versionParam = c.req.param('version');
    const version = parseInt(versionParam, 10);
    
    // Get the file path from the wildcard - everything after /files/
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

  /**
   * PATCH /api/skills/:id - Update skill status
   * Requirement: 7.1
   */
  app.patch('/skills/:id', async (c) => {
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

  return app;
}
