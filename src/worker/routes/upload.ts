/**
 * Upload API Routes - ZIP upload and processing endpoints
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { Hono } from 'hono';
import type { UploadService, ParseResult, ProcessResult } from '../services/upload.service';
import { isAppError, validationError, notFound } from '../lib/errors';

/**
 * Request body for process endpoint
 */
interface ProcessRequest {
  session_id: string;
  selected_skills: string[];
}

/**
 * Create upload API routes
 */
export function createUploadRoutes(uploadService: UploadService) {
  const app = new Hono<{ Bindings: Env }>();

  // Error handler
  app.onError((err, c) => {
    console.error('Upload API error:', err);
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
   * POST /api/skills/upload/parse - Parse ZIP and return preview
   * Requirements: 5.1, 5.4, 5.5
   */
  app.post('/parse', async (c) => {
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw validationError('ZIP file is required');
    }

    // Validate file type
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
      throw validationError('File must be a ZIP archive');
    }

    // Get file buffer
    const buffer = await file.arrayBuffer();

    // Parse ZIP and create session
    const result: ParseResult = await uploadService.parseZip(buffer);

    return c.json({ ok: true, data: result });
  });

  /**
   * POST /api/skills/upload/process - Process selected skills
   * Requirements: 5.2, 5.6, 5.7
   */
  app.post('/process', async (c) => {
    const body = await c.req.json<ProcessRequest>();

    // Validate request body
    if (!body.session_id) {
      throw validationError('session_id is required');
    }

    if (!body.selected_skills || !Array.isArray(body.selected_skills)) {
      throw validationError('selected_skills must be an array');
    }

    if (body.selected_skills.length === 0) {
      throw validationError('At least one skill must be selected');
    }

    // Process selected skills
    try {
      const result: ProcessResult = await uploadService.processSelected(
        body.session_id,
        body.selected_skills
      );

      return c.json({ ok: true, data: result });
    } catch (err) {
      // Handle session not found specifically
      if (err instanceof Error && err.message.includes('Session not found')) {
        throw notFound('Session');
      }
      throw err;
    }
  });

  return app;
}
