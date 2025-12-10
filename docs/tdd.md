# Technical Design Document - Skill Manager

**Version:** 1.1 (MVP)
**Last Updated:** 2025-12-10

## 1. Overview

This document defines the technical implementation for Skill Manager - a centralized HTTP MCP service for managing AI skills. It maps to PRD requirement IDs F-001 (Skill Management), F-002 (File Management), F-003 (Version History), and F-004 (Web UI).

**Stack:**
- Runtime: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Frontend: React + Vite
- Backend: Hono
- Protocol: MCP (Streamable HTTP Transport)

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web UI    │  │  REST API   │  │     MCP Server      │  │
│  │  (React)    │  │  (/api/*)   │  │      (/mcp)         │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          ▼                                   │
│                 ┌─────────────────┐                          │
│                 │  Service Layer  │                          │
│                 └────────┬────────┘                          │
│                          ▼                                   │
│                 ┌─────────────────┐                          │
│                 │ Repository Layer│                          │
│                 └────────┬────────┘                          │
│                          ▼                                   │
│                 ┌─────────────────┐                          │
│                 │   Cloudflare D1 │                          │
│                 └─────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 3. Directory Structure

```
src/
├── react-app/              # Frontend (React)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
├── worker/                 # Backend (Hono on Workers)
│   ├── index.ts            # Main entry, route registration
│   ├── routes/
│   │   ├── api.ts          # REST API routes (/api/*)
│   │   └── mcp.ts          # MCP handler (/mcp)
│   ├── services/
│   │   └── skill.service.ts
│   ├── repositories/
│   │   └── skill.repo.ts
│   ├── types/
│   │   └── index.ts
│   └── lib/
│       ├── mcp.ts          # MCP protocol helpers
│       └── utils.ts
└── shared/                 # Shared types between frontend/backend
    └── types.ts
```

## 4. Database Schema

### 4.1 Tables

```sql
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
```

### 4.2 Versioning Logic

```typescript
async function getNextVersion(db: D1Database, skillId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM skill_versions WHERE skill_id = ?')
    .bind(skillId)
    .first<{ next: number }>();
  return result?.next ?? 1;
}
```

## 5. TypeScript Interfaces

```typescript
// src/shared/types.ts

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: number;
  updated_at: number;
}

export interface SkillVersion {
  id: string;
  skill_id: string;
  version_number: number;
  changelog: string | null;
  created_at: number;
  created_by: 'ai' | 'human';
}

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

export interface SkillWithVersion extends Skill {
  latest_version: number;
}

export interface SkillDetail extends Skill {
  version: SkillVersion;
  files: Omit<SkillFile, 'content'>[];
}

// MCP Tool Input Types
export interface CreateSkillInput {
  name: string;
  description?: string;
  files: {
    path: string;
    content: string;
    is_executable?: boolean;
    script_language?: string;
    run_instructions_for_ai?: string;
  }[];
  changelog?: string;
}

export interface UpdateSkillInput {
  skill_id: string;
  description?: string;
  file_changes?: {
    type: 'add' | 'update' | 'delete';
    path: string;
    content?: string;
    is_executable?: boolean;
    script_language?: string;
    run_instructions_for_ai?: string;
  }[];
  changelog?: string;
}
```

## 6. MCP Implementation

### 6.1 Protocol

Using **Streamable HTTP Transport** (MCP 2025-03-26 spec):

- Endpoint: `POST /mcp`
- Content-Type: `application/json`
- Auth: `Authorization: Bearer <MCP_API_KEY>`

### 6.2 Tool Definitions

```typescript
const MCP_TOOLS = [
  {
    name: 'skill.create',
    description: 'Create a new skill with initial files',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Unique skill name' },
        description: { type: 'string', description: 'Skill description' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
              is_executable: { type: 'boolean' },
              script_language: { type: 'string' },
              run_instructions_for_ai: { type: 'string' }
            },
            required: ['path', 'content']
          }
        },
        changelog: { type: 'string' }
      },
      required: ['name', 'files']
    }
  },
  {
    name: 'skill.update',
    description: 'Update an existing skill (creates new version)',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'Skill ID or name' },
        description: { type: 'string' },
        file_changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['add', 'update', 'delete'] },
              path: { type: 'string' },
              content: { type: 'string' },
              is_executable: { type: 'boolean' },
              script_language: { type: 'string' },
              run_instructions_for_ai: { type: 'string' }
            },
            required: ['type', 'path']
          }
        },
        changelog: { type: 'string' }
      },
      required: ['skill_id']
    }
  },
  {
    name: 'skill.list',
    description: 'List all available skills',
    inputSchema: {
      type: 'object',
      properties: {
        active_only: { type: 'boolean', default: true },
        limit: { type: 'number', default: 50 },
        offset: { type: 'number', default: 0 }
      }
    }
  },
  {
    name: 'skill.get',
    description: 'Get skill details with file list',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'Skill ID or name' },
        version_number: { type: 'number', description: 'Version (default: latest)' }
      },
      required: ['skill_id']
    }
  },
  {
    name: 'skill.get_file',
    description: 'Get file content from a skill',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string' },
        path: { type: 'string' },
        version_number: { type: 'number' }
      },
      required: ['skill_id', 'path']
    }
  }
];
```

### 6.3 Response Format

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND | VALIDATION_ERROR | DB_ERROR | UNAUTHORIZED",
    "message": "Human-readable error message"
  }
}
```

## 7. REST API Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET | `/api/skills` | List skills | 200, 401 |
| GET | `/api/skills/:id` | Get skill detail | 200, 404, 401 |
| GET | `/api/skills/:id/versions` | List versions | 200, 404, 401 |
| GET | `/api/skills/:id/versions/:version` | Get version detail | 200, 404, 401 |
| GET | `/api/skills/:id/versions/:version/files/*path` | Get file content | 200, 404, 401 |
| PATCH | `/api/skills/:id` | Update skill status | 200, 404, 401 |

### Query Parameters

**GET /api/skills:**
- `active_only` (boolean, default: true)
- `limit` (number, default: 50, max: 100)
- `offset` (number, default: 0)
- `q` (string, search by name)

## 8. Authentication

### MVP (Simple)

Static API key via environment variable:

```typescript
// wrangler.json
{
  "vars": {
    "MCP_API_KEY": "your-secret-key"
  }
}

// Middleware
const authMiddleware = (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== c.env.MCP_API_KEY) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
  }

  return next();
};
```

### Future Improvements
- JWT tokens with expiration
- Cloudflare Access integration
- Per-skill permissions

## 9. Error Handling

```typescript
// Error codes
type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'UNAUTHORIZED' | 'CONFLICT';

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

// Usage
throw new AppError('NOT_FOUND', 'Skill not found', 404);
throw new AppError('CONFLICT', 'Skill name already exists', 409);
throw new AppError('VALIDATION_ERROR', 'File content exceeds 200KB limit', 400);
```

## 10. Constraints & Limits

| Constraint | Limit |
|------------|-------|
| Skill name length | 1-100 characters |
| Description length | 0-1000 characters |
| File path length | 1-255 characters |
| File content size | Max 200KB per file |
| Files per version | Max 50 files |
| Changelog length | Max 2000 characters |

## 11. Implementation Phases

### Phase 1: Foundation
- [ ] Setup D1 database and migrations
- [ ] Implement repository layer (CRUD operations)
- [ ] Implement service layer (versioning logic)
- [ ] Basic error handling

### Phase 2: MCP Server
- [ ] Implement `/mcp` endpoint
- [ ] Implement all 5 MCP tools
- [ ] Add authentication middleware
- [ ] Test with MCP client

### Phase 3: REST API
- [ ] Implement `/api/*` endpoints
- [ ] Add pagination support
- [ ] Add search functionality

### Phase 4: Web UI
- [ ] Skill list page
- [ ] Skill detail page
- [ ] Version history view
- [ ] File viewer component

### Phase 5: Polish
- [ ] Input validation
- [ ] Error messages
- [ ] Loading states
- [ ] Basic styling

## 12. Testing Strategy

- **Unit tests**
  - Repositories and services for skills, versions, and files (F-001, F-002, F-003).
  - Validation and error handling for key flows.

- **Integration tests**
  - MCP tools (`skill.create`, `skill.update`, `skill.list`, `skill.get`, `skill.get_file`) implementing F-001–F-003.
  - REST API endpoints (`/api/skills`, `/api/skills/:id`, version/file routes) implementing F-001–F-003.

- **End-to-end tests (optional for MVP)**
  - Web UI flows for listing skills, viewing details and versions, and viewing files (F-004).

## 13. Deployment & Operations

- **Environments**
  - Local development via Cloudflare Workers tooling.
  - At least one deployed environment (e.g., `production`) on Cloudflare Workers + D1.

- **Database migrations**
  - Migrations applied to D1 before or during deploy, using a repeatable process (for example, Wrangler/D1 migrations).

- **Logging & monitoring**
  - Application logs for all error responses (including MCP and REST APIs).
  - Basic request logging (status codes, latencies) for observability.

- **Failures & recovery**
  - In case of deployment rollback, schema changes should remain compatible with existing data where possible.

## 14. Change History

| Date       | Version | Description                                | Author |
|------------|---------|--------------------------------------------|--------|
| 2025-12-10 | 1.0     | Initial TDD draft                           | Human  |
| 2025-12-10 | 1.1     | Added PRD mapping, testing, ops, change log | AI     |
