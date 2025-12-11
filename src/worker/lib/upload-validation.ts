/**
 * Upload Validation Module - Validates ZIP uploads and skill folders
 * Requirements: 1.3, 2.1, 2.4, 2.5
 */

import type { SkillFolder } from '../services/zip-parser.service';
import { CONSTRAINTS } from './validation';

/**
 * Upload-specific constraints
 */
export const UPLOAD_CONSTRAINTS = {
  MAX_ZIP_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE: CONSTRAINTS.FILE_CONTENT_MAX, // 200KB (reuse existing)
  MAX_FILES_PER_SKILL: CONSTRAINTS.FILES_PER_VERSION_MAX, // 50 (reuse existing)
  REQUIRED_FILE: 'SKILL.md',
} as const;

/**
 * Result of validating a skill folder
 */
export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate ZIP file size
 * Requirements: 1.3 - reject ZIP exceeding 10MB
 */
export function validateZipSize(sizeInBytes: number): SkillValidationResult {
  if (sizeInBytes > UPLOAD_CONSTRAINTS.MAX_ZIP_SIZE) {
    return {
      valid: false,
      errors: [`ZIP file exceeds maximum size of ${UPLOAD_CONSTRAINTS.MAX_ZIP_SIZE / (1024 * 1024)}MB`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate a skill folder structure
 * Requirements: 2.1, 2.4, 2.5
 */
export function validateSkillFolder(folder: SkillFolder): SkillValidationResult {
  const errors: string[] = [];

  // Filter out binary files for validation (they're skipped anyway)
  const textFiles = folder.files.filter((f) => !f.isBinary);

  // Requirement 2.1: Require SKILL.md file
  const hasSkillMd = textFiles.some(
    (f) => f.path === UPLOAD_CONSTRAINTS.REQUIRED_FILE || f.path.toLowerCase() === 'skill.md'
  );
  if (!hasSkillMd) {
    errors.push(`Skill folder must contain ${UPLOAD_CONSTRAINTS.REQUIRED_FILE} file`);
  }

  // Requirement 2.5: Max 50 files per skill
  if (textFiles.length > UPLOAD_CONSTRAINTS.MAX_FILES_PER_SKILL) {
    errors.push(`Skill contains more than ${UPLOAD_CONSTRAINTS.MAX_FILES_PER_SKILL} files`);
  }

  // Requirement 2.4: Max 200KB per file
  for (const file of textFiles) {
    const fileSizeBytes = new TextEncoder().encode(file.content).length;
    if (fileSizeBytes > UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
      errors.push(
        `File "${file.path}" exceeds maximum size of ${UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024}KB`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all skill folders from a ZIP
 * Returns validation results for each folder
 */
export function validateAllSkillFolders(
  folders: SkillFolder[]
): Map<string, SkillValidationResult> {
  const results = new Map<string, SkillValidationResult>();

  for (const folder of folders) {
    results.set(folder.name, validateSkillFolder(folder));
  }

  return results;
}
