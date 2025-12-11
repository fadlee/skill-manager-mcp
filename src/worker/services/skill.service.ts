/**
 * Skill Service - Business logic for skill operations
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.3, 7.1
 */

import type {
  Skill,
  SkillVersion,
  SkillFile,
  SkillWithVersion,
  SkillDetail,
  CreateSkillInput,
  UpdateSkillInput,
  ListSkillsOptions,
  MinimalSkillResponse,
  ExtendedListSkillsOptions,
} from '../../shared/types';
import type { SkillRepository } from '../repositories/skill.repo';
import { validateCreateSkill, validateUpdateSkill } from '../lib/validation';
import { notFound, conflict, validationError } from '../lib/errors';

/**
 * Parse metadata from SKILL.md file content
 * Extracts name and description from YAML frontmatter
 */
function parseSkillMetadata(content: string): { name?: string; description?: string } {
  if (!content || content.trim().length === 0) {
    return {};
  }

  const lines = content.split('\n');

  // Check if file starts with YAML frontmatter
  if (!lines[0] || lines[0].trim() !== '---') {
    return {};
  }

  // Find the end of frontmatter
  let frontmatterEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    return {};
  }

  // Parse the frontmatter content
  const frontmatterLines = lines.slice(1, frontmatterEnd);
  let description = '';
  let name = '';
  let inDescription = false;
  let isMultilineDescription = false;

  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();

    // Parse Name
    if (trimmedLine.startsWith('name:')) {
      name = trimmedLine.substring('name:'.length).trim();
      inDescription = false; // Reset description parsing state
      continue;
    }

    // Parse Description
    if (trimmedLine.startsWith('description:')) {
      const descriptionValue = trimmedLine.substring('description:'.length).trim();

      if (descriptionValue === '|') {
        // Multi-line description using YAML literal block scalar
        isMultilineDescription = true;
        inDescription = true;
        continue;
      } else if (descriptionValue.length > 0) {
        // Single-line description
        description = descriptionValue;
        inDescription = false;
        break;
      } else {
        // Description on next line
        inDescription = true;
        continue;
      }
    }

    if (inDescription) {
      if (isMultilineDescription) {
        // For multi-line descriptions, collect all indented lines
        if (line.startsWith('  ') || line.startsWith('\t')) {
          // Remove leading whitespace and add to description
          const cleanLine = line.replace(/^[ \t]+/, '');
          if (description.length > 0) {
            description += '\n';
          }
          description += cleanLine;
        } else if (trimmedLine.length === 0) {
          // Empty line in multi-line description - preserve as newline
          description += '\n';
          continue;
        } else {
          // End of multi-line description
          break;
        }
      } else {
        // Single line description value
        description = trimmedLine;
        break;
      }
    }
  }

  const result: { name?: string; description?: string } = {};

  if (name.length > 0) {
    result.name = name;
  }

  // Clean up and limit to 1024 characters
  description = description.trim();
  if (description.length > 0) {
    result.description = description.length > 1024
      ? description.substring(0, 1024).trim()
      : description;
  }

  return result;
}

/**
 * Service interface for skill operations
 */
export interface SkillService {
  createSkill(input: CreateSkillInput): Promise<SkillDetail>;
  updateSkill(input: UpdateSkillInput): Promise<SkillDetail>;
  listSkills(options: ExtendedListSkillsOptions): Promise<SkillWithVersion[] | MinimalSkillResponse[]>;
  getSkill(skillId: string, version?: number): Promise<SkillDetail>;
  getFile(skillId: string, path: string, version?: number): Promise<SkillFile>;
  updateStatus(skillId: string, active: boolean): Promise<Skill>;
}

/**
 * Create a skill service instance
 */
export function createSkillService(repo: SkillRepository): SkillService {
  return {
    /**
     * Create a new skill with version 1
     * Requirements: 1.1, 1.2, 1.3, 1.4
     */
    async createSkill(input: CreateSkillInput): Promise<SkillDetail> {
      // Validate input
      const validation = validateCreateSkill(input);
      if (!validation.valid) {
        throw validationError(validation.errors.join('; '));
      }

      // Check for duplicate name (Requirement 1.2)
      const existing = await repo.findSkillByName(input.name);
      if (existing) {
        throw conflict(`Skill with name "${input.name}" already exists`);
      }

      // Extract description from SKILL.md if no description provided
      let description = input.description ?? null;
      if (!description) {
        const skillMdFile = input.files.find(f => f.path === 'SKILL.md');
        if (skillMdFile) {
          const metadata = parseSkillMetadata(skillMdFile.content);
          if (metadata.description) {
            description = metadata.description;
          }
        }
      }

      const now = Date.now();

      // Create skill (Requirement 1.4 - creator type 'ai')
      const skill = await repo.createSkill({
        name: input.name,
        description,
        active: true,
        created_at: now,
        updated_at: now,
      });

      // Create version 1 (Requirement 1.1)
      const version = await repo.createVersion({
        skill_id: skill.id,
        version_number: 1,
        changelog: input.changelog ?? null,
        created_at: now,
        created_by: 'ai',
      });

      // Create files (Requirement 1.3)
      const files = await repo.createFiles(
        input.files.map((f) => ({
          skill_id: skill.id,
          version_id: version.id,
          path: f.path,
          content: f.content,
          is_executable: f.is_executable ?? false,
          script_language: f.script_language ?? null,
          run_instructions_for_ai: f.run_instructions_for_ai ?? null,
          created_at: now,
        }))
      );

      return {
        ...skill,
        version,
        files: files.map((f) => {
          const { content: _, ...rest } = f;
          void _;
          return rest;
        }),
      };
    },

    /**
     * Update an existing skill, creating a new version
     * Supports lookup by ID or name
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
     */
    async updateSkill(input: UpdateSkillInput): Promise<SkillDetail> {
      // Find existing skill by ID or name (Requirement 2.6)
      let skill = await repo.findSkillById(input.skill_id);
      if (!skill) {
        skill = await repo.findSkillByName(input.skill_id);
      }
      if (!skill) {
        throw notFound('Skill');
      }

      // Get current version to determine file count for validation
      const currentVersionNumber = await repo.getLatestVersionNumber(skill.id);
      const currentVersion = await repo.findVersion(skill.id, currentVersionNumber);

      let currentFiles: SkillFile[] = [];
      if (currentVersion) {
        currentFiles = await repo.findFilesByVersionId(currentVersion.id);
      }

      // Validate input
      const validation = validateUpdateSkill(input, currentFiles.length);
      if (!validation.valid) {
        throw validationError(validation.errors.join('; '));
      }

      const now = Date.now();

      // Update skill metadata if description changed or extract from SKILL.md
      let updatedSkill = skill;
      const updates: any = { updated_at: now };
      let hasUpdates = false;

      if (input.description !== undefined) {
        updates.description = input.description;
        hasUpdates = true;
      }

      // If SKILL.md is being updated, extract metadata
      if (input.file_changes) {
        const skillMdChange = input.file_changes.find(
          change => change.path === 'SKILL.md' && (change.type === 'add' || change.type === 'update')
        );
        if (skillMdChange && skillMdChange.content) {
          const metadata = parseSkillMetadata(skillMdChange.content);

          if (metadata.name && metadata.name !== skill.name) {
            updates.name = metadata.name;
            hasUpdates = true;
          }

          if (metadata.description && input.description === undefined) {
            updates.description = metadata.description;
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        updatedSkill = (await repo.updateSkill(skill.id, updates))!;
      } else {
        updatedSkill = (await repo.updateSkill(skill.id, {
          updated_at: now,
        }))!;
      }

      // Create new version (Requirement 2.1 - increment version)
      const newVersionNumber = currentVersionNumber + 1;
      const newVersion = await repo.createVersion({
        skill_id: skill.id,
        version_number: newVersionNumber,
        changelog: input.changelog ?? null,
        created_at: now,
        created_by: 'ai',
      });

      // Apply file changes (Requirements 2.2, 2.3, 2.4, 2.5)
      // Start with current files as base
      const fileMap = new Map<string, SkillFile>();
      for (const file of currentFiles) {
        fileMap.set(file.path, file);
      }

      // Apply changes
      if (input.file_changes) {
        for (const change of input.file_changes) {
          switch (change.type) {
            case 'add':
              // Add new file (Requirement 2.3)
              fileMap.set(change.path, {
                id: '', // Will be generated
                skill_id: skill.id,
                version_id: newVersion.id,
                path: change.path,
                content: change.content!,
                is_executable: change.is_executable ?? false,
                script_language: change.script_language ?? null,
                run_instructions_for_ai: change.run_instructions_for_ai ?? null,
                created_at: now,
              });
              break;
            case 'update': {
              // Update existing file (Requirement 2.4)
              const existing = fileMap.get(change.path);
              if (existing) {
                fileMap.set(change.path, {
                  ...existing,
                  content: change.content!,
                  is_executable: change.is_executable ?? existing.is_executable,
                  script_language: change.script_language ?? existing.script_language,
                  run_instructions_for_ai: change.run_instructions_for_ai ?? existing.run_instructions_for_ai,
                  created_at: now,
                });
              }
              break;
            }
            case 'delete':
              // Delete file (Requirement 2.5)
              fileMap.delete(change.path);
              break;
          }
        }
      }

      // Create files for new version (preserving previous version - Requirement 2.2)
      const newFiles = await repo.createFiles(
        Array.from(fileMap.values()).map((f) => ({
          skill_id: skill.id,
          version_id: newVersion.id,
          path: f.path,
          content: f.content,
          is_executable: f.is_executable,
          script_language: f.script_language,
          run_instructions_for_ai: f.run_instructions_for_ai,
          created_at: now,
        }))
      );

      return {
        ...updatedSkill,
        version: newVersion,
        files: newFiles.map((f) => {
          const { content: _, ...rest } = f;
          void _;
          return rest;
        }),
      };
    },


    /**
     * List skills with filtering and pagination
     * Requirements: 3.1, 3.2, 3.3, 3.4
     */
    async listSkills(options: ExtendedListSkillsOptions): Promise<SkillWithVersion[] | MinimalSkillResponse[]> {
      // Convert new parameters to existing options format
      const repoOptions: ListSkillsOptions = {
        // Use activeOnly if provided, otherwise check showInactive
        activeOnly: options.activeOnly ?? (options.showInactive !== true),
        limit: options.limit,
        offset: options.offset,
        query: options.query,
      };

      const skills = await repo.listSkills(repoOptions);

      // Return detailed format if requested (default for web UI)
      if (options.detailed !== false) {
        return skills.map((skill) => ({
          ...skill,
          // Ensure description doesn't exceed 1024 characters even in detailed response
          description:
            skill.description && skill.description.length > 1024
              ? skill.description.substring(0, 1024)
              : skill.description,
        }));
      }

      // Return minimal format only when explicitly requested (for MCP/AI clients)
      return skills.map((skill) => ({
        name: skill.name,
        // Ensure description doesn't exceed 1024 characters
        description:
          skill.description && skill.description.length > 1024
            ? skill.description.substring(0, 1024)
            : skill.description,
      }));
    },

    /**
     * Get skill details with optional version selection
     * Supports lookup by ID or name
     * Requirements: 4.1, 4.2, 4.3, 4.4
     */
    async getSkill(skillIdOrName: string, versionNumber?: number): Promise<SkillDetail> {
      // Find skill by ID first, then by name (Requirement 4.4)
      let skill = await repo.findSkillById(skillIdOrName);
      if (!skill) {
        // Try finding by name
        skill = await repo.findSkillByName(skillIdOrName);
      }
      if (!skill) {
        throw notFound('Skill');
      }
      const skillId = skill.id;

      // Get version (Requirement 4.2, 4.3)
      let version: SkillVersion | null;
      if (versionNumber !== undefined) {
        // Specific version requested (Requirement 4.2)
        version = await repo.findVersion(skillId, versionNumber);
        if (!version) {
          throw notFound(`Version ${versionNumber}`);
        }
      } else {
        // Default to latest version (Requirement 4.3)
        const latestVersionNumber = await repo.getLatestVersionNumber(skillId);
        if (latestVersionNumber === 0) {
          throw notFound('Version');
        }
        version = await repo.findVersion(skillId, latestVersionNumber);
        if (!version) {
          throw notFound('Version');
        }
      }

      // Get files for version
      const files = await repo.findFilesByVersionId(version.id);

      return {
        ...skill,
        version,
        files: files.map((f) => {
          const { content: _, ...rest } = f;
          void _;
          return rest;
        }),
      };
    },

    /**
     * Get a specific file from a skill version
     * Supports lookup by ID or name
     * Requirements: 5.1, 5.2, 5.3
     */
    async getFile(skillIdOrName: string, path: string, versionNumber?: number): Promise<SkillFile> {
      // Find skill by ID first, then by name
      let skill = await repo.findSkillById(skillIdOrName);
      if (!skill) {
        skill = await repo.findSkillByName(skillIdOrName);
      }
      if (!skill) {
        throw notFound('Skill');
      }
      const skillId = skill.id;

      // Get version (Requirement 5.3 - default to latest)
      let version: SkillVersion | null;
      if (versionNumber !== undefined) {
        version = await repo.findVersion(skillId, versionNumber);
        if (!version) {
          throw notFound(`Version ${versionNumber}`);
        }
      } else {
        const latestVersionNumber = await repo.getLatestVersionNumber(skillId);
        if (latestVersionNumber === 0) {
          throw notFound('Version');
        }
        version = await repo.findVersion(skillId, latestVersionNumber);
        if (!version) {
          throw notFound('Version');
        }
      }

      // Find file (Requirement 5.2)
      const file = await repo.findFile(version.id, path);
      if (!file) {
        throw notFound(`File "${path}"`);
      }

      return file;
    },

    /**
     * Update skill active status
     * Supports lookup by ID or name
     * Requirement: 7.1
     */
    async updateStatus(skillIdOrName: string, active: boolean): Promise<Skill> {
      let skill = await repo.findSkillById(skillIdOrName);
      if (!skill) {
        skill = await repo.findSkillByName(skillIdOrName);
      }
      if (!skill) {
        throw notFound('Skill');
      }

      const updated = await repo.updateSkill(skill.id, {
        active,
        updated_at: Date.now(),
      });

      return updated!;
    },
  };
}
