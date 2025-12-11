/**
 * Shared types for Skill Manager
 * Requirements: 12.1, 12.2
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Represents a skill - a named collection of files representing a reusable capability
 */
export interface Skill {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: number;
  updated_at: number;
}

/**
 * Represents an immutable snapshot of a skill at a point in time
 */
export interface SkillVersion {
  id: string;
  skill_id: string;
  version_number: number;
  changelog: string | null;
  created_at: number;
  created_by: 'ai' | 'human';
}

/**
 * Represents a text file within a skill version
 */
export interface SkillFile {
  id: string;
  skill_id: string;
  version_id: string;
  path: string;
  content: string;
  is_executable: boolean;
  script_language: string | null;
  run_instructions_for_ai: string | null;
  created_at: number;
}


// ============================================================================
// Composite Types
// ============================================================================

/**
 * Skill with its latest version number for list views
 */
export interface SkillWithVersion extends Skill {
  latest_version: number;
}

/**
 * Detailed skill information including version and file list
 */
export interface SkillDetail extends Skill {
  version: SkillVersion;
  files: Omit<SkillFile, 'content'>[];
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new skill
 */
export interface CreateSkillInput {
  name: string;
  description?: string;
  files: FileInput[];
  changelog?: string;
}

/**
 * Input for updating an existing skill
 */
export interface UpdateSkillInput {
  skill_id: string;
  description?: string;
  file_changes?: FileChange[];
  changelog?: string;
}

/**
 * Input for a file when creating a skill
 */
export interface FileInput {
  path: string;
  content: string;
  is_executable?: boolean;
  script_language?: string;
  run_instructions_for_ai?: string;
}

/**
 * Represents a change to a file during skill update
 */
export interface FileChange extends Partial<FileInput> {
  type: 'add' | 'update' | 'delete';
  path: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Successful API response wrapper
 */
export interface APIResponse<T> {
  ok: true;
  data: T;
}

/**
 * Error API response wrapper
 */
export interface APIError {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Error codes used throughout the application
 */
export type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'UNAUTHORIZED' | 'CONFLICT';

// ============================================================================
// List Options
// ============================================================================

/**
 * Options for listing skills
 */
export interface ListSkillsOptions {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
  query?: string;
}

/**
 * Minimal skill response for token optimization
 */
export interface MinimalSkillResponse {
  name: string;
  description: string | null;
}

/**
 * Extended list options with response format control
 */
export interface ExtendedListSkillsOptions extends ListSkillsOptions {
  detailed?: boolean;
  showInactive?: boolean;
}
