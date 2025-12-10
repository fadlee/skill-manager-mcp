# Design Document - Skill Manager

## Overview

Skill Manager is a centralized HTTP MCP service for managing AI skills, deployed on Cloudflare Workers with D1 database storage. The system provides three interfaces: MCP tools for AI agents, REST API for programmatic access, and a React-based Web UI for developers.

The architecture follows a layered approach with clear separation between transport (MCP/REST/UI), service logic, and data persistence.

## Architecture

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
│                 │ (SkillService)  │                          │
│                 └────────┬────────┘                          │
│                          ▼                                   │
│                 ┌─────────────────┐                          │
│                 │ Repository Layer│                          │
│                 │  (SkillRepo)    │                          │
│                 └────────┬────────┘                          │
│                          ▼                                   │
│                 ┌─────────────────┐                          │
│                 │   Cloudflare D1 │                          │
│                 └─────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. MCP Server (`/mcp`)

Handles MCP protocol requests using Streamable HTTP Transport.

```typescript
// src/worker/routes/mcp.ts
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

// Tool handlers
type ToolHandler = (params: unknown, env: Env) => Promise<ToolResult>;

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
```

### 2. REST API (`/api/*`)

RESTful endpoints for web client consumption.

```typescript
// src/worker/routes/api.ts
interface APIResponse<T> {
  ok: true;
  data: T;
}

interface APIError {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'UNAUTHORIZED' | 'CONFLICT';
```

### 3. Service Layer

Business logic for skill operations.

```typescript
// src/worker/services/skill.service.ts
interface SkillService {
  createSkill(input: CreateSkillInput): Promise<SkillDetail>;
  updateSkill(input: UpdateSkillInput): Promise<SkillDetail>;
  listSkills(options: ListSkillsOptions): Promise<SkillWithVersion[]>;
  getSkill(skillId: string, version?: number): Promise<SkillDetail>;
  getFile(skillId: string, path: string, version?: number): Promise<SkillFile>;
  updateStatus(skillId: string, active: boolean): Promise<Skill>;
}

interface ListSkillsOptions {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
  query?: string;
}
```

### 4. Repository Layer

Data access abstraction over D1.

```typescript
// src/worker/repositories/skill.repo.ts
interface SkillRepository {
  // Skills
  createSkill(skill: Omit<Skill, 'id'>): Promise<Skill>;
  findSkillById(id: string): Promise<Skill | null>;
  findSkillByName(name: string): Promise<Skill | null>;
  listSkills(options: ListSkillsOptions): Promise<SkillWithVersion[]>;
  updateSkill(id: string, updates: Partial<Skill>): Promise<Skill>;
  
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
```

### 5. Validation Module

Input validation with constraint checking.

```typescript
// src/worker/lib/validation.ts
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface Validator {
  validateCreateSkill(input: CreateSkillInput): ValidationResult;
  validateUpdateSkill(input: UpdateSkillInput): ValidationResult;
  validateFile(file: FileInput): ValidationResult;
}

// Constraints
const CONSTRAINTS = {
  SKILL_NAME_MAX: 100,
  DESCRIPTION_MAX: 1000,
  FILE_PATH_MAX: 255,
  FILE_CONTENT_MAX: 200 * 1024, // 200KB
  FILES_PER_VERSION_MAX: 50,
  CHANGELOG_MAX: 2000,
} as const;
```

### 6. Authentication Middleware

API key validation for all endpoints.

```typescript
// src/worker/lib/auth.ts
interface AuthMiddleware {
  (c: Context, next: Next): Promise<Response | void>;
}
```

## Data Models

### Database Schema

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

### TypeScript Types

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

export interface CreateSkillInput {
  name: string;
  description?: string;
  files: FileInput[];
  changelog?: string;
}

export interface UpdateSkillInput {
  skill_id: string;
  description?: string;
  file_changes?: FileChange[];
  changelog?: string;
}

export interface FileInput {
  path: string;
  content: string;
  is_executable?: boolean;
  script_language?: string;
  run_instructions_for_ai?: string;
}

export interface FileChange extends Partial<FileInput> {
  type: 'add' | 'update' | 'delete';
  path: string;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the acceptance criteria analysis, the following correctness properties must be verified through property-based testing:

### Property 1: Skill creation produces version 1
*For any* valid skill name and file set, creating a skill SHALL result in a skill with version_number equal to 1.
**Validates: Requirements 1.1**

### Property 2: Duplicate skill names rejected
*For any* existing skill name, attempting to create another skill with the same name SHALL result in a CONFLICT error.
**Validates: Requirements 1.2**

### Property 3: File content round-trip
*For any* skill with files, creating the skill and then retrieving each file SHALL return content identical to the original input.
**Validates: Requirements 1.3, 5.1**

### Property 4: Version increment on update
*For any* skill at version N, calling update SHALL create a new version with version_number equal to N + 1.
**Validates: Requirements 2.1**

### Property 5: Previous versions preserved
*For any* skill with multiple versions, updating the skill SHALL NOT modify the content of any previous version.
**Validates: Requirements 2.2**

### Property 6: File changes applied correctly
*For any* update with file changes (add/update/delete), the new version SHALL contain exactly the expected files: original files plus additions, minus deletions, with updates applied.
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 7: Non-existent resource returns NOT_FOUND
*For any* non-existent skill ID, file path, or version number, the corresponding get operation SHALL return a NOT_FOUND error.
**Validates: Requirements 2.6, 4.4, 5.2**

### Property 8: List returns required fields
*For any* set of skills in the database, listing skills SHALL return objects containing name, description, active, and latest_version fields.
**Validates: Requirements 3.1**

### Property 9: Active-only filtering
*For any* mix of active and inactive skills, listing with active_only=true SHALL return only skills where active=true.
**Validates: Requirements 3.2, 7.2**

### Property 10: Pagination respects limits
*For any* limit and offset values, the returned skill list SHALL contain at most `limit` items.
**Validates: Requirements 3.3**

### Property 11: Search filters by name
*For any* search query string, all returned skills SHALL have names containing that query string (case-insensitive).
**Validates: Requirements 3.4**

### Property 12: Default to latest version
*For any* skill with multiple versions, requesting without a version number SHALL return the version with the highest version_number.
**Validates: Requirements 4.3, 5.3**

### Property 13: Versions ordered descending
*For any* skill with multiple versions, listing versions SHALL return them ordered by version_number in descending order.
**Validates: Requirements 6.2**

### Property 14: Changelog persisted
*For any* version created with a changelog, retrieving that version SHALL return the same changelog text.
**Validates: Requirements 6.3**

### Property 15: Status update persists
*For any* skill, updating its active status and then retrieving it SHALL return the updated status value.
**Validates: Requirements 7.1**

### Property 16: Authentication required
*For any* API request without a valid Authorization header, the system SHALL return a 401 UNAUTHORIZED response.
**Validates: Requirements 8.1, 8.2**

### Property 17: Validation constraints enforced
*For any* input exceeding defined constraints (name > 100 chars, description > 1000 chars, file content > 200KB, path > 255 chars, changelog > 2000 chars, files > 50), the system SHALL reject with VALIDATION_ERROR.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 18: Serialization round-trip
*For any* valid Skill object, serializing to JSON and deserializing back SHALL produce an equivalent object.
**Validates: Requirements 12.1, 12.2**

## Error Handling

### Error Types

```typescript
// src/worker/lib/errors.ts
type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'UNAUTHORIZED' | 'CONFLICT';

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Factory functions
const notFound = (resource: string) => new AppError('NOT_FOUND', `${resource} not found`, 404);
const conflict = (message: string) => new AppError('CONFLICT', message, 409);
const validationError = (message: string) => new AppError('VALIDATION_ERROR', message, 400);
const unauthorized = () => new AppError('UNAUTHORIZED', 'Invalid or missing API key', 401);
const dbError = (message: string) => new AppError('DB_ERROR', message, 500);
```

### Error Response Format

```typescript
// MCP error response
{
  jsonrpc: '2.0',
  id: requestId,
  error: {
    code: -32000, // Application error
    message: 'Skill not found',
    data: { code: 'NOT_FOUND' }
  }
}

// REST API error response
{
  ok: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Skill not found'
  }
}
```

### Error Handling Middleware

```typescript
// Global error handler for Hono
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      ok: false,
      error: { code: err.code, message: err.message }
    }, err.status);
  }
  
  console.error('Unexpected error:', err);
  return c.json({
    ok: false,
    error: { code: 'DB_ERROR', message: 'Internal server error' }
  }, 500);
});
```

## Testing Strategy

### Property-Based Testing Library

**Library:** [fast-check](https://github.com/dubzzz/fast-check) - A TypeScript property-based testing library.

**Configuration:**
- Minimum 100 iterations per property test
- Seed logging for reproducibility
- Shrinking enabled for minimal failing examples

### Unit Tests

Unit tests cover specific examples and edge cases:

- Repository CRUD operations with mock D1
- Service layer business logic
- Validation functions with boundary values
- Error handling paths
- MCP protocol parsing

### Property-Based Tests

Each correctness property maps to a property-based test:

```typescript
// Example: Property 3 - File content round-trip
// **Feature: skill-manager, Property 3: File content round-trip**
test.prop([validSkillArb, validFilesArb])('file content round-trip', async (skillInput, files) => {
  const created = await service.createSkill({ ...skillInput, files });
  
  for (const file of files) {
    const retrieved = await service.getFile(created.id, file.path);
    expect(retrieved.content).toBe(file.content);
  }
});
```

### Test Organization

```
src/
├── worker/
│   ├── __tests__/
│   │   ├── services/
│   │   │   └── skill.service.test.ts
│   │   ├── repositories/
│   │   │   └── skill.repo.test.ts
│   │   ├── routes/
│   │   │   ├── api.test.ts
│   │   │   └── mcp.test.ts
│   │   ├── lib/
│   │   │   └── validation.test.ts
│   │   └── properties/
│   │       └── skill.properties.test.ts  # Property-based tests
```

### Test Commands

```bash
# Run all tests
bun test

# Run property tests only
bun test --grep "property"

# Run with coverage
bun test --coverage
```
