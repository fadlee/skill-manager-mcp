# Design Document - Skill Upload ZIP

## Overview

Fitur Skill Upload ZIP memungkinkan developer untuk mengupload satu atau lebih skill melalui Web UI dalam format ZIP file dengan two-step flow:

1. **Parse Step**: User upload ZIP → Server parse dan return preview → User lihat daftar skill yang terdeteksi
2. **Process Step**: User pilih skill yang mau diimport → Server proses skill yang dipilih → User lihat hasil

Setiap folder di root level ZIP merepresentasikan satu skill. Sistem menyimpan ZIP sementara dalam session untuk memungkinkan user memilih skill sebelum diproses.

Fitur ini terintegrasi dengan arsitektur existing Skill Manager, menambahkan:
- Two upload endpoints di REST API (parse dan process)
- ZIP parsing service dengan session management
- Upload UI component dengan preview dan selection di React frontend

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Two-Step Upload Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Parse & Preview                                                     │
│  ┌─────────────┐     POST /api/skills/upload/parse                          │
│  │   Web UI    │ ──────────────────────────────────────┐                    │
│  │  (React)    │     multipart/form-data (ZIP)         │                    │
│  └─────────────┘                                       ▼                    │
│        ▲                                      ┌──────────────┐              │
│        │                                      │  Parse API   │              │
│        │                                      │   Handler    │              │
│        │                                      └──────┬───────┘              │
│        │                                             │                      │
│        │                                             ▼                      │
│        │                                      ┌──────────────┐              │
│        │                                      │  ZIP Parser  │              │
│        │                                      │   Service    │              │
│        │                                      └──────┬───────┘              │
│        │                                             │                      │
│        │         ┌───────────────────────────────────┼──────────┐           │
│        │         │ For each skill folder             │          │           │
│        │         ▼                                   ▼          │           │
│        │  ┌─────────────┐                    ┌─────────────┐    │           │
│        │  │  Validator  │                    │   Session   │    │           │
│        │  │  (preview)  │                    │   Store     │    │           │
│        │  └─────────────┘                    │  (KV/Memory)│    │           │
│        │         │                           └──────┬──────┘    │           │
│        │         └──────────────┬───────────────────┘           │           │
│        │                        ▼                               │           │
│        │                 ┌─────────────┐                        │           │
│        └─────────────────│   Preview   │◀───────────────────────┘           │
│           {session_id,   │   Response  │                                    │
│            skills: [...]}└─────────────┘                                    │
│                                                                              │
│  STEP 2: Process Selected                                                    │
│  ┌─────────────┐     POST /api/skills/upload/process                        │
│  │   Web UI    │ ──────────────────────────────────────┐                    │
│  │  (React)    │     {session_id, selected: [...]}     │                    │
│  └─────────────┘                                       ▼                    │
│        ▲                                      ┌──────────────┐              │
│        │                                      │ Process API  │              │
│        │                                      │   Handler    │              │
│        │                                      └──────┬───────┘              │
│        │                                             │                      │
│        │                    ┌─────────────────────────┘                     │
│        │                    │ Get ZIP from session                          │
│        │                    ▼                                               │
│        │             ┌─────────────┐                                        │
│        │             │   Session   │                                        │
│        │             │   Store     │                                        │
│        │             └──────┬──────┘                                        │
│        │                    │                                               │
│        │         ┌──────────┴──────────┐                                    │
│        │         │ For each selected   │                                    │
│        │         ▼                     ▼                                    │
│        │  ┌─────────────┐       ┌──────────┐                                │
│        │  │   Skill     │──────▶│   D1     │                                │
│        │  │   Service   │       │ Database │                                │
│        │  └─────────────┘       └──────────┘                                │
│        │         │                    │                                     │
│        │         └────────┬───────────┘                                     │
│        │                  ▼                                                 │
│        │           ┌─────────────┐                                          │
│        └───────────│   Import    │                                          │
│                    │   Result    │                                          │
│                    └─────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Upload API Handlers

Endpoints untuk parse dan process ZIP file.

```typescript
// src/worker/routes/upload.ts
interface UploadRoutes {
  // POST /api/skills/upload/parse - Parse ZIP and return preview
  handleParse(c: Context): Promise<Response>;
  
  // POST /api/skills/upload/process - Process selected skills
  handleProcess(c: Context): Promise<Response>;
}
```

### 2. ZIP Parser Service

Service untuk parsing dan ekstraksi ZIP file.

```typescript
// src/worker/services/zip-parser.service.ts
interface ZipParserService {
  parseZip(buffer: ArrayBuffer): Promise<ParsedZip>;
  extractSkillFolders(zip: ParsedZip): SkillFolder[];
}

interface ParsedZip {
  files: ZipEntry[];
  totalSize: number;
}

interface ZipEntry {
  path: string;
  content: Uint8Array;
  isDirectory: boolean;
}

interface SkillFolder {
  name: string;
  files: ExtractedFile[];
}

interface ExtractedFile {
  path: string;           // relative path within skill folder
  content: string;        // text content
  isBinary: boolean;      // true if binary file (skipped)
}
```

### 3. Upload Service

Service untuk orchestrating upload process dengan two-step flow.

```typescript
// src/worker/services/upload.service.ts
interface UploadService {
  // Step 1: Parse ZIP and create session
  parseZip(buffer: ArrayBuffer): Promise<ParseResult>;
  
  // Step 2: Process selected skills from session
  processSelected(sessionId: string, selectedSkills: string[]): Promise<ProcessResult>;
}

interface ParseResult {
  session_id: string;
  skills: SkillPreview[];
  expires_at: number;     // session expiry timestamp
}

interface SkillPreview {
  name: string;
  valid: boolean;
  file_count: number;
  errors: string[];       // validation errors if invalid
  description?: string;   // from SKILL.md if available
}

interface ProcessResult {
  total: number;
  successful: number;
  failed: number;
  results: SkillImportResult[];
}

interface SkillImportResult {
  name: string;
  status: 'success' | 'failed';
  skill_id?: string;      // present if success
  version?: number;       // present if success
  error?: string;         // present if failed
  is_new?: boolean;       // true if new skill, false if new version
}
```

### 3.1 Session Store

Temporary storage untuk ZIP data antar parse dan process steps.

```typescript
// src/worker/services/session.service.ts
interface SessionStore {
  // Store parsed ZIP data with TTL
  create(data: SessionData): Promise<string>;  // returns session_id
  
  // Retrieve session data
  get(sessionId: string): Promise<SessionData | null>;
  
  // Delete session after processing
  delete(sessionId: string): Promise<void>;
}

interface SessionData {
  skills: SkillFolder[];
  created_at: number;
  expires_at: number;
}

// Session TTL: 10 minutes
const SESSION_TTL = 10 * 60 * 1000;
```

### 4. Skill Folder Validator

Validates skill folder structure.

```typescript
// src/worker/lib/upload-validation.ts
interface SkillFolderValidator {
  validate(folder: SkillFolder): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### 5. File Type Detector

Detects file types and executable status.

```typescript
// src/worker/lib/file-type.ts
interface FileTypeDetector {
  isExecutable(path: string): boolean;
  getScriptLanguage(path: string): string | null;
  isBinary(content: Uint8Array): boolean;
}

const EXECUTABLE_EXTENSIONS: Record<string, string> = {
  '.py': 'python',
  '.sh': 'bash',
  '.js': 'javascript',
  '.ts': 'typescript',
};
```

### 6. Upload UI Components

React components untuk upload interface dengan preview dan selection.

```typescript
// src/react-app/components/SkillUpload.tsx
interface SkillUploadProps {
  onUploadComplete?: (result: ProcessResult) => void;
}

type UploadStep = 'select-file' | 'preview' | 'importing' | 'complete';

interface UploadState {
  step: UploadStep;
  error?: string;
  
  // Preview state
  sessionId?: string;
  skills?: SkillPreview[];
  selectedSkills: Set<string>;
  
  // Result state
  result?: ProcessResult;
}

// src/react-app/components/SkillPreviewList.tsx
interface SkillPreviewListProps {
  skills: SkillPreview[];
  selectedSkills: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

// src/react-app/components/SkillImportResult.tsx
interface SkillImportResultProps {
  result: ProcessResult;
  onNavigateToSkill?: (skillId: string) => void;
  onUploadMore?: () => void;
}
```

## Data Models

### API Request/Response

```typescript
// ============================================
// Step 1: Parse API
// ============================================

// Request: POST /api/skills/upload/parse
// Content-Type: multipart/form-data
// Field: "file" - ZIP file

// Response
interface ParseResponse {
  ok: true;
  data: ParseResult;
}

// ============================================
// Step 2: Process API
// ============================================

// Request: POST /api/skills/upload/process
// Content-Type: application/json
interface ProcessRequest {
  session_id: string;
  selected_skills: string[];  // skill names to import
}

// Response
interface ProcessResponse {
  ok: true;
  data: ProcessResult;
}

// ============================================
// Error Response (both endpoints)
// ============================================
interface UploadErrorResponse {
  ok: false;
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND';
    message: string;
  };
}
```

### Constraints

```typescript
const UPLOAD_CONSTRAINTS = {
  MAX_ZIP_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_FILE_SIZE: 200 * 1024,       // 200KB (existing)
  MAX_FILES_PER_SKILL: 50,         // existing
  REQUIRED_FILE: 'SKILL.md',
} as const;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ZIP parsing identifies skill folders and extracts names
*For any* valid ZIP file containing folders at root level, parsing the ZIP SHALL correctly identify each root-level folder as a skill and extract the folder name as the skill name.
**Validates: Requirements 1.2, 1.5**

### Property 2: Preview includes validation status
*For any* parsed ZIP, the preview response SHALL include validation status (valid/invalid) for each skill folder, with invalid skills containing descriptive error messages.
**Validates: Requirements 1.6, 2.1, 2.2**

### Property 3: Session persistence
*For any* successfully parsed ZIP, the system SHALL store the ZIP data in a session and return a valid session_id that can be used to retrieve the data within the TTL period.
**Validates: Requirements 1.7, 5.7**

### Property 4: Path structure preservation
*For any* skill folder with nested files, the stored file paths SHALL match the original relative paths within the skill folder (excluding the skill folder name prefix).
**Validates: Requirements 2.3**

### Property 5: Selection filtering
*For any* process request with selected skills, the system SHALL only process skills that are in the selected_skills array, ignoring other skills in the session.
**Validates: Requirements 3.4**

### Property 6: Existing skill creates new version
*For any* skill name that already exists in the database, processing a skill with that name SHALL create a new version of the existing skill instead of failing.
**Validates: Requirements 3.5**

### Property 7: Result summary completeness
*For any* process request, the result SHALL contain exactly one entry per selected skill, with each entry containing: name, status, and either (skill_id, version, is_new) for success or (error) for failure.
**Validates: Requirements 3.6, 5.6**

### Property 8: Human creator attribution
*For any* skill or version created via ZIP upload, the created_by field SHALL be set to 'human'.
**Validates: Requirements 3.7**

### Property 9: Executable file detection
*For any* file with extension .py, .sh, .js, or .ts, the file SHALL be marked as executable with the correct script_language inferred from the extension.
**Validates: Requirements 6.1, 6.2**

### Property 10: Binary file handling
*For any* binary file in a ZIP, the file SHALL be skipped and not included in the skill's file list.
**Validates: Requirements 6.3**

## Error Handling

### Error Types

```typescript
// Upload-specific errors
const uploadErrors = {
  ZIP_TOO_LARGE: 'ZIP file exceeds maximum size of 10MB',
  INVALID_ZIP: 'File is not a valid ZIP archive',
  NO_SKILLS_FOUND: 'ZIP contains no valid skill folders',
  MISSING_SKILL_MD: 'Skill folder must contain SKILL.md file',
  FILE_TOO_LARGE: 'File exceeds maximum size of 200KB',
  TOO_MANY_FILES: 'Skill contains more than 50 files',
};
```

### Error Response Format

```typescript
// API error response
{
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'ZIP file exceeds maximum size of 10MB'
  }
}

// Per-skill error in result
{
  name: 'my-skill',
  status: 'failed',
  error: 'Skill folder must contain SKILL.md file'
}
```

## Testing Strategy

### Property-Based Testing Library

**Library:** fast-check

**Configuration:**
- Minimum 100 iterations per property test
- Custom arbitraries for ZIP structures and skill folders

### Unit Tests

- ZIP parser with various ZIP structures
- Skill folder validator with edge cases
- File type detector with different extensions
- Upload service integration

### Property-Based Tests

```typescript
// Example: Property 1 - ZIP parsing
// **Feature: skill-upload-zip, Property 1: ZIP parsing identifies skill folders**
test.prop([validZipArb])('zip parsing identifies skill folders', async (zipStructure) => {
  const buffer = createZipBuffer(zipStructure);
  const result = await zipParser.parseZip(buffer);
  const folders = zipParser.extractSkillFolders(result);
  
  expect(folders.map(f => f.name).sort())
    .toEqual(zipStructure.rootFolders.sort());
});

// Example: Property 5 - Selection filtering
// **Feature: skill-upload-zip, Property 5: Selection filtering**
test.prop([sessionWithSkillsArb, selectedSubsetArb])('selection filtering', async (session, selected) => {
  const result = await uploadService.processSelected(session.id, selected);
  
  // Result should only contain selected skills
  expect(result.results.map(r => r.name).sort())
    .toEqual(selected.sort());
});

// Example: Property 6 - Existing skill creates new version
// **Feature: skill-upload-zip, Property 6: Existing skill creates new version**
test.prop([existingSkillArb, skillFolderArb])('existing skill creates new version', async (existing, folder) => {
  // Create existing skill first
  await skillService.createSkill({ name: existing.name, files: existing.files });
  
  // Upload ZIP with same name
  const session = await uploadService.parseZip(createZipWithFolder({ ...folder, name: existing.name }));
  const result = await uploadService.processSelected(session.session_id, [existing.name]);
  
  expect(result.results[0].status).toBe('success');
  expect(result.results[0].is_new).toBe(false);
  expect(result.results[0].version).toBeGreaterThan(1);
});
```

### Test Arbitraries

```typescript
// Arbitrary for valid ZIP structure
const validZipArb = fc.record({
  rootFolders: fc.array(fc.string().filter(s => s.length > 0 && !s.includes('/')), { minLength: 1, maxLength: 5 }),
  filesPerFolder: fc.integer({ min: 1, max: 10 }),
});

// Arbitrary for skill folder with/without SKILL.md
const skillFolderArb = fc.record({
  name: fc.string().filter(s => s.length > 0),
  hasSkillMd: fc.boolean(),
  files: fc.array(fileArb),
});

// Arbitrary for session with skills
const sessionWithSkillsArb = fc.record({
  id: fc.uuid(),
  skills: fc.array(skillFolderArb, { minLength: 1, maxLength: 5 }),
});

// Arbitrary for selected subset of skills
const selectedSubsetArb = fc.array(fc.string(), { minLength: 1 });
```
