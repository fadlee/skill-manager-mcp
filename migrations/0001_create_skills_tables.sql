-- Migration: Create skills, skill_versions, and skill_files tables
-- Requirements: 1.1, 2.1, 6.1

-- Skills table
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_active ON skills(active);

-- Skill versions table
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  changelog TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('ai', 'human')),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_versions_skill_version ON skill_versions(skill_id, version_number);

-- Skill files table
CREATE TABLE skill_files (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  is_executable INTEGER NOT NULL DEFAULT 0,
  script_language TEXT,
  run_instructions_for_ai TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES skill_versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_files_version ON skill_files(version_id);
CREATE UNIQUE INDEX idx_files_version_path ON skill_files(version_id, path);
