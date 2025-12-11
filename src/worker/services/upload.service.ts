/**
 * Upload Service - Orchestrates ZIP upload flow (parse and process)
 * Requirements: 1.2, 1.6, 1.7, 3.4, 3.5, 3.6, 3.7
 */

import type { SkillFolder } from './zip-parser.service';
import type { SessionStore } from './session.service';
import type { SkillService } from './skill.service';
import { parseZip, extractSkillFolders } from './zip-parser.service';
import { SESSION_TTL } from './session.service';
import { validateZipSize, validateSkillFolder } from '../lib/upload-validation';
import { isExecutable, getScriptLanguage } from '../lib/file-type';
import { validationError } from '../lib/errors';

/**
 * Preview of a skill folder from ZIP
 */
export interface SkillPreview {
  name: string;
  valid: boolean;
  file_count: number;
  errors: string[];
  description?: string;
}

/**
 * Result of parsing a ZIP file
 */
export interface ParseResult {
  session_id: string;
  skills: SkillPreview[];
  expires_at: number;
}

/**
 * Result of importing a single skill
 */
export interface SkillImportResult {
  name: string;
  status: 'success' | 'failed';
  skill_id?: string;
  version?: number;
  error?: string;
  is_new?: boolean;
}

/**
 * Result of processing selected skills
 */
export interface ProcessResult {
  total: number;
  successful: number;
  failed: number;
  results: SkillImportResult[];
}


/**
 * Upload service interface
 */
export interface UploadService {
  /** Step 1: Parse ZIP and create session */
  parseZip(buffer: ArrayBuffer): Promise<ParseResult>;

  /** Step 2: Process selected skills from session */
  processSelected(sessionId: string, selectedSkills: string[]): Promise<ProcessResult>;
}

/**
 * Extract description from SKILL.md content (first paragraph or heading)
 */
function extractDescription(skillFolder: SkillFolder): string | undefined {
  const skillMd = skillFolder.files.find(
    (f) => f.path === 'SKILL.md' || f.path.toLowerCase() === 'skill.md'
  );

  if (!skillMd) return undefined;

  // Get first non-empty line that's not a heading marker
  const lines = skillMd.content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and markdown headings
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Return first content line, truncated
    return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
  }

  return undefined;
}

/**
 * Create an upload service instance
 */
export function createUploadService(
  sessionStore: SessionStore,
  skillService: SkillService
): UploadService {
  return {
    /**
     * Parse ZIP and create session with skill previews
     * Requirements: 1.2, 1.6, 1.7
     */
    async parseZip(buffer: ArrayBuffer): Promise<ParseResult> {
      // Validate ZIP size (Requirement 1.3)
      const sizeValidation = validateZipSize(buffer.byteLength);
      if (!sizeValidation.valid) {
        throw validationError(sizeValidation.errors[0]);
      }

      // Parse ZIP contents (Requirement 1.2)
      const parsedZip = parseZip(buffer);

      // Extract skill folders (Requirement 1.5)
      const skillFolders = extractSkillFolders(parsedZip);

      // Validate each skill folder and build previews (Requirement 1.6)
      const previews: SkillPreview[] = skillFolders.map((folder) => {
        const validation = validateSkillFolder(folder);
        const textFiles = folder.files.filter((f) => !f.isBinary);

        return {
          name: folder.name,
          valid: validation.valid,
          file_count: textFiles.length,
          errors: validation.errors,
          description: validation.valid ? extractDescription(folder) : undefined,
        };
      });

      // Store in session (Requirement 1.7)
      const sessionId = await sessionStore.create(skillFolders);
      const expiresAt = Date.now() + SESSION_TTL;

      return {
        session_id: sessionId,
        skills: previews,
        expires_at: expiresAt,
      };
    },

    /**
     * Process selected skills from session
     * Requirements: 3.4, 3.5, 3.6, 3.7
     */
    async processSelected(
      sessionId: string,
      selectedSkills: string[]
    ): Promise<ProcessResult> {
      // Get session data (Requirement 5.7)
      const session = await sessionStore.get(sessionId);
      if (!session) {
        throw validationError('Session not found or expired');
      }

      const results: SkillImportResult[] = [];

      // Filter to only selected skills (Requirement 3.4)
      const selectedFolders = session.skills.filter((folder) =>
        selectedSkills.includes(folder.name)
      );

      for (const folder of selectedFolders) {
        // Validate folder before processing
        const validation = validateSkillFolder(folder);
        if (!validation.valid) {
          results.push({
            name: folder.name,
            status: 'failed',
            error: validation.errors.join('; '),
          });
          continue;
        }

        try {
          // Convert folder files to skill files format
          const files = folder.files
            .filter((f) => !f.isBinary)
            .map((f) => ({
              path: f.path,
              content: f.content,
              is_executable: isExecutable(f.path),
              script_language: getScriptLanguage(f.path) ?? undefined,
            }));

          // Try to create or update skill
          const result = await createOrUpdateSkill(
            skillService,
            folder.name,
            files
          );

          results.push(result);
        } catch (err) {
          results.push({
            name: folder.name,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Delete session after processing
      await sessionStore.delete(sessionId);

      // Build summary (Requirement 3.6)
      const successful = results.filter((r) => r.status === 'success').length;

      return {
        total: results.length,
        successful,
        failed: results.length - successful,
        results,
      };
    },
  };
}


/**
 * Create a new skill or update existing one (create new version)
 * Requirements: 3.5, 3.7
 */
async function createOrUpdateSkill(
  skillService: SkillService,
  name: string,
  files: Array<{
    path: string;
    content: string;
    is_executable: boolean;
    script_language?: string;
  }>
): Promise<SkillImportResult> {
  try {
    // Try to create new skill first
    const skill = await skillService.createSkill({
      name,
      files,
      changelog: 'Imported via ZIP upload',
    });

    return {
      name,
      status: 'success',
      skill_id: skill.id,
      version: skill.version.version_number,
      is_new: true,
    };
  } catch (err) {
    // If skill already exists (CONFLICT), create new version (Requirement 3.5)
    if (err instanceof Error && err.message.includes('already exists')) {
      // Update existing skill with new version
      const updated = await skillService.updateSkill({
        skill_id: name, // Can use name to lookup
        file_changes: files.map((f) => ({
          type: 'update' as const,
          path: f.path,
          content: f.content,
          is_executable: f.is_executable,
          script_language: f.script_language,
        })),
        changelog: 'Updated via ZIP upload',
      });

      return {
        name,
        status: 'success',
        skill_id: updated.id,
        version: updated.version.version_number,
        is_new: false,
      };
    }

    throw err;
  }
}
