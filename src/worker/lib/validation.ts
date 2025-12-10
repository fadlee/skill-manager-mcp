/**
 * Validation module with constraint checking
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { CreateSkillInput, UpdateSkillInput, FileInput, FileChange } from '../../shared/types';

/**
 * Validation constraints as defined in requirements
 */
export const CONSTRAINTS = {
  SKILL_NAME_MAX: 100,
  DESCRIPTION_MAX: 1000,
  FILE_PATH_MAX: 255,
  FILE_CONTENT_MAX: 200 * 1024, // 200KB
  FILES_PER_VERSION_MAX: 50,
  CHANGELOG_MAX: 2000,
} as const;

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Create a successful validation result
 */
function success(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create a failed validation result
 */
function failure(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Validate a file input
 */
export function validateFile(file: FileInput): ValidationResult {
  const errors: string[] = [];

  // Check path length (Requirement 9.3)
  if (!file.path || file.path.length === 0) {
    errors.push('File path is required');
  } else if (file.path.length > CONSTRAINTS.FILE_PATH_MAX) {
    errors.push(`File path exceeds ${CONSTRAINTS.FILE_PATH_MAX} characters`);
  }

  // Check content size (Requirement 9.1)
  if (file.content === undefined || file.content === null) {
    errors.push('File content is required');
  } else if (new TextEncoder().encode(file.content).length > CONSTRAINTS.FILE_CONTENT_MAX) {
    errors.push(`File content exceeds ${CONSTRAINTS.FILE_CONTENT_MAX / 1024}KB`);
  }

  return errors.length > 0 ? failure(errors) : success();
}


/**
 * Validate a file change input
 */
export function validateFileChange(change: FileChange): ValidationResult {
  const errors: string[] = [];

  // Path is always required
  if (!change.path || change.path.length === 0) {
    errors.push('File path is required');
  } else if (change.path.length > CONSTRAINTS.FILE_PATH_MAX) {
    errors.push(`File path exceeds ${CONSTRAINTS.FILE_PATH_MAX} characters`);
  }

  // For add/update, content is required and must be within limits
  if (change.type === 'add' || change.type === 'update') {
    if (change.content === undefined || change.content === null) {
      errors.push(`File content is required for ${change.type} operation`);
    } else if (new TextEncoder().encode(change.content).length > CONSTRAINTS.FILE_CONTENT_MAX) {
      errors.push(`File content exceeds ${CONSTRAINTS.FILE_CONTENT_MAX / 1024}KB`);
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}

/**
 * Validate input for creating a skill
 */
export function validateCreateSkill(input: CreateSkillInput): ValidationResult {
  const errors: string[] = [];

  // Validate name (Requirement 1.5)
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Skill name is required');
  } else if (input.name.length > CONSTRAINTS.SKILL_NAME_MAX) {
    errors.push(`Skill name exceeds ${CONSTRAINTS.SKILL_NAME_MAX} characters`);
  }

  // Validate description (Requirement 9.5)
  if (input.description && input.description.length > CONSTRAINTS.DESCRIPTION_MAX) {
    errors.push(`Description exceeds ${CONSTRAINTS.DESCRIPTION_MAX} characters`);
  }

  // Validate changelog (Requirement 9.4)
  if (input.changelog && input.changelog.length > CONSTRAINTS.CHANGELOG_MAX) {
    errors.push(`Changelog exceeds ${CONSTRAINTS.CHANGELOG_MAX} characters`);
  }

  // Validate files count (Requirement 9.2)
  if (!input.files || input.files.length === 0) {
    errors.push('At least one file is required');
  } else if (input.files.length > CONSTRAINTS.FILES_PER_VERSION_MAX) {
    errors.push(`Number of files exceeds ${CONSTRAINTS.FILES_PER_VERSION_MAX}`);
  }

  // Validate each file
  if (input.files) {
    for (const file of input.files) {
      const fileResult = validateFile(file);
      if (!fileResult.valid) {
        errors.push(...fileResult.errors.map(e => `File "${file.path}": ${e}`));
      }
    }

    // Check for duplicate paths
    const paths = input.files.map(f => f.path);
    const uniquePaths = new Set(paths);
    if (paths.length !== uniquePaths.size) {
      errors.push('Duplicate file paths are not allowed');
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}


/**
 * Validate input for updating a skill
 */
export function validateUpdateSkill(input: UpdateSkillInput, currentFileCount: number = 0): ValidationResult {
  const errors: string[] = [];

  // Validate skill_id
  if (!input.skill_id || input.skill_id.trim().length === 0) {
    errors.push('Skill ID is required');
  }

  // Validate description (Requirement 9.5)
  if (input.description && input.description.length > CONSTRAINTS.DESCRIPTION_MAX) {
    errors.push(`Description exceeds ${CONSTRAINTS.DESCRIPTION_MAX} characters`);
  }

  // Validate changelog (Requirement 9.4)
  if (input.changelog && input.changelog.length > CONSTRAINTS.CHANGELOG_MAX) {
    errors.push(`Changelog exceeds ${CONSTRAINTS.CHANGELOG_MAX} characters`);
  }

  // Validate file changes
  if (input.file_changes && input.file_changes.length > 0) {
    // Calculate resulting file count
    let addCount = 0;
    let deleteCount = 0;
    const changePaths = new Set<string>();

    for (const change of input.file_changes) {
      // Check for duplicate paths in changes
      if (changePaths.has(change.path)) {
        errors.push(`Duplicate file change path: ${change.path}`);
      }
      changePaths.add(change.path);

      if (change.type === 'add') addCount++;
      if (change.type === 'delete') deleteCount++;

      const changeResult = validateFileChange(change);
      if (!changeResult.valid) {
        errors.push(...changeResult.errors.map(e => `File "${change.path}": ${e}`));
      }
    }

    // Check resulting file count (Requirement 9.2)
    const resultingCount = currentFileCount + addCount - deleteCount;
    if (resultingCount > CONSTRAINTS.FILES_PER_VERSION_MAX) {
      errors.push(`Resulting number of files (${resultingCount}) exceeds ${CONSTRAINTS.FILES_PER_VERSION_MAX}`);
    }
  }

  return errors.length > 0 ? failure(errors) : success();
}
