-- Migration: Create upload_sessions table for ZIP upload flow
-- Requirements: 1.7, 5.7

-- Upload sessions table (temporary storage for parsed ZIP data)
CREATE TABLE upload_sessions (
  id TEXT PRIMARY KEY,
  skills_data TEXT NOT NULL,  -- JSON stringified SkillFolder[]
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_expires ON upload_sessions(expires_at);
