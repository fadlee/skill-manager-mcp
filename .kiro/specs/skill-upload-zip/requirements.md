# Requirements Document

## Introduction

Skill Upload ZIP adalah fitur yang memungkinkan user untuk mengupload skill melalui Web UI dengan format ZIP file. Fitur ini mendukung upload satu atau lebih skill dalam satu file ZIP, di mana setiap folder di root ZIP merepresentasikan satu skill. Setelah upload, user dapat melihat preview isi ZIP dan memilih skill mana saja yang ingin diproses sebelum sistem menyimpan ke database.

## Glossary

- **Skill**: Koleksi file yang merepresentasikan kemampuan reusable untuk AI agent
- **ZIP File**: File arsip terkompresi yang berisi satu atau lebih skill
- **Skill Folder**: Folder di root level ZIP yang merepresentasikan satu skill
- **SKILL.md**: File dokumentasi utama yang wajib ada di setiap skill folder
- **Upload Result**: Hasil proses upload yang berisi status sukses/gagal untuk setiap skill
- **Batch Upload**: Proses upload multiple skill dalam satu operasi
- **Preview**: Tampilan isi ZIP sebelum diproses, menampilkan daftar skill yang terdeteksi
- **Upload Session**: Session sementara yang menyimpan ZIP yang sudah diupload untuk diproses

## Requirements

### Requirement 1: ZIP File Upload and Preview

**User Story:** As a developer, I want to upload a ZIP file and preview its contents, so that I can select which skills to import.

#### Acceptance Criteria

1. WHEN a user selects a ZIP file via the upload interface THEN the Web UI SHALL accept the file and send it to the server for parsing
2. WHEN a ZIP file is uploaded THEN the Skill Manager SHALL parse the ZIP contents and return a preview of detected skill folders
3. IF a ZIP file exceeds 10MB THEN the Skill Manager SHALL reject the upload with a VALIDATION_ERROR
4. IF a ZIP file contains no valid skill folders THEN the Skill Manager SHALL return an empty preview with a warning message
5. WHEN parsing ZIP contents THEN the Skill Manager SHALL extract folder name as skill name for each root-level folder
6. WHEN returning preview THEN the Skill Manager SHALL include validation status for each skill folder (valid/invalid with reason)
7. WHEN a ZIP is successfully parsed THEN the Skill Manager SHALL store the ZIP temporarily and return a session ID for subsequent processing

### Requirement 2: Skill Folder Structure Validation

**User Story:** As a developer, I want the system to validate skill folder structure, so that only properly formatted skills are imported.

#### Acceptance Criteria

1. WHEN validating a skill folder THEN the Skill Manager SHALL require a SKILL.md file at the folder root
2. IF a skill folder lacks SKILL.md THEN the Skill Manager SHALL mark that skill as failed with descriptive error
3. WHEN processing skill files THEN the Skill Manager SHALL preserve the relative path structure within the skill folder
4. IF any file in a skill folder exceeds 200KB THEN the Skill Manager SHALL mark that skill as failed with VALIDATION_ERROR
5. IF a skill folder contains more than 50 files THEN the Skill Manager SHALL mark that skill as failed with VALIDATION_ERROR

### Requirement 3: Skill Selection and Processing

**User Story:** As a developer, I want to select which skills to import from the preview, so that I have control over what gets added.

#### Acceptance Criteria

1. WHEN preview is displayed THEN the Web UI SHALL show checkboxes for each detected skill folder
2. WHEN a skill folder is invalid THEN the Web UI SHALL disable its checkbox and show the validation error
3. WHEN user clicks "Import Selected" THEN the Web UI SHALL send the session ID and list of selected skill names to the server
4. WHEN processing selected skills THEN the Skill Manager SHALL only process skills that were selected by the user
5. WHEN a skill name already exists THEN the Skill Manager SHALL create a new version instead of failing
6. WHEN all selected skills are processed THEN the Skill Manager SHALL return a summary with success/failure status for each skill
7. WHEN creating skills from upload THEN the Skill Manager SHALL set created_by as 'human'

### Requirement 4: Upload Progress and Feedback

**User Story:** As a developer, I want to see upload progress and results, so that I know which skills were successfully imported.

#### Acceptance Criteria

1. WHEN ZIP is being parsed THEN the Web UI SHALL display a loading indicator with "Parsing ZIP..." message
2. WHEN skills are being imported THEN the Web UI SHALL display a loading indicator with "Importing skills..." message
3. WHEN import completes THEN the Web UI SHALL display a result summary showing successful and failed skills
4. WHEN a skill fails during import THEN the Web UI SHALL display the specific error message for that skill
5. WHEN import succeeds THEN the Web UI SHALL provide option to navigate to the uploaded skills
6. WHEN displaying results THEN the Web UI SHALL show skill name, status (success/failed), and version number for successful imports

### Requirement 5: Upload API Endpoints

**User Story:** As a system component, I want dedicated API endpoints for ZIP upload and processing, so that the web UI can implement the two-step flow.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/skills/upload/parse` with multipart form data THEN the Skill Manager SHALL parse the ZIP and return preview
2. WHEN a POST request is made to `/api/skills/upload/process` with session ID and selected skills THEN the Skill Manager SHALL import the selected skills
3. WHEN any upload endpoint receives a request THEN the Skill Manager SHALL validate the Authorization header
4. IF the uploaded file is not a valid ZIP THEN the Skill Manager SHALL return VALIDATION_ERROR with descriptive message
5. WHEN returning parse results THEN the API SHALL include session_id and array of skill previews with name, valid status, file count, and validation errors
6. WHEN returning process results THEN the API SHALL include array of skill results with name, status, skill_id (if successful), version, and error (if failed)
7. WHEN a session expires or is not found THEN the Skill Manager SHALL return NOT_FOUND error

### Requirement 6: File Type Detection

**User Story:** As a developer, I want the system to detect executable files, so that script files are properly marked.

#### Acceptance Criteria

1. WHEN processing files with extensions .py, .sh, .js, .ts THEN the Skill Manager SHALL mark them as executable
2. WHEN a file is marked executable THEN the Skill Manager SHALL infer script_language from file extension
3. WHEN processing non-text files THEN the Skill Manager SHALL skip binary files and log a warning

</content>
