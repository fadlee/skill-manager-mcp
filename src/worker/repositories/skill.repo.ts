/**
 * Skill Repository - Data access layer for skills, versions, and files
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1
 */

import type {
  Skill,
  SkillVersion,
  SkillFile,
  SkillWithVersion,
  ListSkillsOptions,
} from '../../shared/types';

/**
 * Repository interface for skill data access
 */
export interface SkillRepository {
  // Skills
  createSkill(skill: Omit<Skill, 'id'>): Promise<Skill>;
  findSkillById(id: string): Promise<Skill | null>;
  findSkillByName(name: string): Promise<Skill | null>;
  listSkills(options: ListSkillsOptions): Promise<SkillWithVersion[]>;
  updateSkill(id: string, updates: Partial<Pick<Skill, 'name' | 'description' | 'active' | 'updated_at'>>): Promise<Skill | null>;

  // Versions
  createVersion(version: Omit<SkillVersion, 'id'>): Promise<SkillVersion>;
  findVersionsBySkillId(skillId: string): Promise<SkillVersion[]>;
  findVersion(skillId: string, versionNumber: number): Promise<SkillVersion | null>;
  getLatestVersionNumber(skillId: string): Promise<number>;

  // Files
  createFiles(files: Omit<SkillFile, 'id'>[]): Promise<SkillFile[]>;
  findFilesByVersionId(versionId: string): Promise<SkillFile[]>;
  findFile(versionId: string, path: string): Promise<SkillFile | null>;
}

/**
 * Generate a unique ID using crypto.randomUUID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * D1 implementation of SkillRepository
 */
export function createSkillRepository(db: D1Database): SkillRepository {
  return {
    // =========================================================================
    // Skills
    // =========================================================================

    async createSkill(skill: Omit<Skill, 'id'>): Promise<Skill> {
      const id = generateId();
      const newSkill: Skill = { id, ...skill };

      await db
        .prepare(
          `INSERT INTO skills (id, name, description, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          newSkill.id,
          newSkill.name,
          newSkill.description,
          newSkill.active ? 1 : 0,
          newSkill.created_at,
          newSkill.updated_at
        )
        .run();

      return newSkill;
    },

    async findSkillById(id: string): Promise<Skill | null> {
      const result = await db
        .prepare('SELECT * FROM skills WHERE id = ?')
        .bind(id)
        .first<{
          id: string;
          name: string;
          description: string | null;
          active: number;
          created_at: number;
          updated_at: number;
        }>();

      if (!result) return null;

      return {
        ...result,
        active: result.active === 1,
      };
    },

    async findSkillByName(name: string): Promise<Skill | null> {
      const result = await db
        .prepare('SELECT * FROM skills WHERE name = ?')
        .bind(name)
        .first<{
          id: string;
          name: string;
          description: string | null;
          active: number;
          created_at: number;
          updated_at: number;
        }>();

      if (!result) return null;

      return {
        ...result,
        active: result.active === 1,
      };
    },

    async listSkills(options: ListSkillsOptions): Promise<SkillWithVersion[]> {
      const { activeOnly, limit = 50, offset = 0, query } = options;

      let sql = `
        SELECT 
          s.*,
          COALESCE(MAX(v.version_number), 0) as latest_version
        FROM skills s
        LEFT JOIN skill_versions v ON s.id = v.skill_id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (activeOnly) {
        sql += ' AND s.active = 1';
      }

      if (query) {
        sql += ' AND s.name LIKE ?';
        params.push(`%${query}%`);
      }

      sql += ' GROUP BY s.id ORDER BY s.updated_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(sql);
      const results = await stmt.bind(...params).all<{
        id: string;
        name: string;
        description: string | null;
        active: number;
        created_at: number;
        updated_at: number;
        latest_version: number;
      }>();

      return (results.results || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        active: row.active === 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
        latest_version: row.latest_version,
      }));
    },

    async updateSkill(
      id: string,
      updates: Partial<Pick<Skill, 'name' | 'description' | 'active' | 'updated_at'>>
    ): Promise<Skill | null> {
      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.active !== undefined) {
        fields.push('active = ?');
        values.push(updates.active ? 1 : 0);
      }
      if (updates.updated_at !== undefined) {
        fields.push('updated_at = ?');
        values.push(updates.updated_at);
      }

      if (fields.length === 0) {
        return this.findSkillById(id);
      }

      values.push(id);

      await db
        .prepare(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      return this.findSkillById(id);
    },

    // =========================================================================
    // Versions
    // =========================================================================

    async createVersion(version: Omit<SkillVersion, 'id'>): Promise<SkillVersion> {
      const id = generateId();
      const newVersion: SkillVersion = { id, ...version };

      await db
        .prepare(
          `INSERT INTO skill_versions (id, skill_id, version_number, changelog, created_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          newVersion.id,
          newVersion.skill_id,
          newVersion.version_number,
          newVersion.changelog,
          newVersion.created_at,
          newVersion.created_by
        )
        .run();

      return newVersion;
    },

    async findVersionsBySkillId(skillId: string): Promise<SkillVersion[]> {
      const results = await db
        .prepare(
          'SELECT * FROM skill_versions WHERE skill_id = ? ORDER BY version_number DESC'
        )
        .bind(skillId)
        .all<SkillVersion>();

      return results.results || [];
    },

    async findVersion(skillId: string, versionNumber: number): Promise<SkillVersion | null> {
      const result = await db
        .prepare(
          'SELECT * FROM skill_versions WHERE skill_id = ? AND version_number = ?'
        )
        .bind(skillId, versionNumber)
        .first<SkillVersion>();

      return result || null;
    },

    async getLatestVersionNumber(skillId: string): Promise<number> {
      const result = await db
        .prepare(
          'SELECT MAX(version_number) as max_version FROM skill_versions WHERE skill_id = ?'
        )
        .bind(skillId)
        .first<{ max_version: number | null }>();

      return result?.max_version ?? 0;
    },

    // =========================================================================
    // Files
    // =========================================================================

    async createFiles(files: Omit<SkillFile, 'id'>[]): Promise<SkillFile[]> {
      if (files.length === 0) return [];

      const createdFiles: SkillFile[] = [];

      // Use batch for better performance
      const statements = files.map((file) => {
        const id = generateId();
        const newFile: SkillFile = { id, ...file };
        createdFiles.push(newFile);

        return db
          .prepare(
            `INSERT INTO skill_files (id, skill_id, version_id, path, content, is_executable, script_language, run_instructions_for_ai, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newFile.id,
            newFile.skill_id,
            newFile.version_id,
            newFile.path,
            newFile.content,
            newFile.is_executable ? 1 : 0,
            newFile.script_language,
            newFile.run_instructions_for_ai,
            newFile.created_at
          );
      });

      await db.batch(statements);

      return createdFiles;
    },

    async findFilesByVersionId(versionId: string): Promise<SkillFile[]> {
      const results = await db
        .prepare('SELECT * FROM skill_files WHERE version_id = ? ORDER BY path')
        .bind(versionId)
        .all<{
          id: string;
          skill_id: string;
          version_id: string;
          path: string;
          content: string;
          is_executable: number;
          script_language: string | null;
          run_instructions_for_ai: string | null;
          created_at: number;
        }>();

      return (results.results || []).map((row) => ({
        ...row,
        is_executable: row.is_executable === 1,
      }));
    },

    async findFile(versionId: string, path: string): Promise<SkillFile | null> {
      const result = await db
        .prepare('SELECT * FROM skill_files WHERE version_id = ? AND path = ?')
        .bind(versionId, path)
        .first<{
          id: string;
          skill_id: string;
          version_id: string;
          path: string;
          content: string;
          is_executable: number;
          script_language: string | null;
          run_instructions_for_ai: string | null;
          created_at: number;
        }>();

      if (!result) return null;

      return {
        ...result,
        is_executable: result.is_executable === 1,
      };
    },
  };
}
