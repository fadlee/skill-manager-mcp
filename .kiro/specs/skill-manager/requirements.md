# Requirements Document

## Introduction

Skill Manager is a centralized HTTP MCP service for managing AI skills. It enables AI agents to create, store, and manage reusable skills with automatic versioning, while providing developers with a web interface for viewing and monitoring. The system runs on Cloudflare Workers with D1 database storage.

## Glossary

- **Skill**: A named collection of files representing a reusable capability for AI agents
- **Version**: An immutable snapshot of a skill at a point in time, identified by an integer
- **File**: A text file within a skill version, identified by its path
- **MCP**: Model Context Protocol - a standard protocol for AI agent tool communication
- **D1**: Cloudflare's serverless SQLite database
- **Changelog**: A description of changes made in a specific version

## Requirements

### Requirement 1: Skill Creation

**User Story:** As an AI agent, I want to create new skills with files, so that I can store reusable capabilities for future use.

#### Acceptance Criteria

1. WHEN an AI agent calls the `skill.create` MCP tool with a valid name and files THEN the Skill Manager SHALL create a new skill with version 1 and return the skill ID
2. WHEN an AI agent attempts to create a skill with a name that already exists THEN the Skill Manager SHALL reject the request with a CONFLICT error
3. WHEN an AI agent creates a skill THEN the Skill Manager SHALL store all provided files with their paths and content
4. WHEN a skill is created THEN the Skill Manager SHALL record the creation timestamp and creator type as 'ai'
5. IF a skill name exceeds 100 characters or is empty THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR

### Requirement 2: Skill Update

**User Story:** As an AI agent, I want to update existing skills, so that I can improve and evolve capabilities over time.

#### Acceptance Criteria

1. WHEN an AI agent calls the `skill.update` MCP tool with a valid skill ID THEN the Skill Manager SHALL create a new version with incremented version number
2. WHEN a skill is updated THEN the Skill Manager SHALL preserve all previous versions unchanged
3. WHEN file changes include 'add' operations THEN the Skill Manager SHALL add new files to the version
4. WHEN file changes include 'update' operations THEN the Skill Manager SHALL modify existing file content in the new version
5. WHEN file changes include 'delete' operations THEN the Skill Manager SHALL exclude the specified files from the new version
6. WHEN an AI agent attempts to update a non-existent skill THEN the Skill Manager SHALL reject the request with a NOT_FOUND error

### Requirement 3: Skill Listing

**User Story:** As an AI agent or developer, I want to list all available skills, so that I can discover what capabilities exist.

#### Acceptance Criteria

1. WHEN a user calls the `skill.list` MCP tool or GET `/api/skills` endpoint THEN the Skill Manager SHALL return a list of skills with name, description, active status, and latest version number
2. WHEN the `active_only` parameter is true THEN the Skill Manager SHALL return only active skills
3. WHEN pagination parameters are provided THEN the Skill Manager SHALL return results within the specified limit and offset
4. WHEN a search query is provided THEN the Skill Manager SHALL filter skills by name containing the query string

### Requirement 4: Skill Retrieval

**User Story:** As an AI agent or developer, I want to get detailed information about a skill, so that I can understand its contents and history.

#### Acceptance Criteria

1. WHEN a user calls the `skill.get` MCP tool or GET `/api/skills/:id` endpoint THEN the Skill Manager SHALL return skill details including metadata and file list
2. WHEN a version number is specified THEN the Skill Manager SHALL return details for that specific version
3. WHEN no version number is specified THEN the Skill Manager SHALL return details for the latest version
4. WHEN a user requests a non-existent skill THEN the Skill Manager SHALL return a NOT_FOUND error

### Requirement 5: File Retrieval

**User Story:** As an AI agent or developer, I want to retrieve individual file contents from a skill, so that I can use or inspect specific files.

#### Acceptance Criteria

1. WHEN a user calls the `skill.get_file` MCP tool or GET `/api/skills/:id/versions/:version/files/*path` endpoint THEN the Skill Manager SHALL return the file content
2. WHEN a file path does not exist in the specified version THEN the Skill Manager SHALL return a NOT_FOUND error
3. WHEN no version is specified THEN the Skill Manager SHALL return the file from the latest version

### Requirement 6: Version History

**User Story:** As a developer, I want to view the version history of a skill, so that I can track changes over time.

#### Acceptance Criteria

1. WHEN a user calls GET `/api/skills/:id/versions` endpoint THEN the Skill Manager SHALL return all versions with version number, changelog, created_at, and created_by
2. WHEN versions are listed THEN the Skill Manager SHALL order them by version number descending
3. WHEN a version is created THEN the Skill Manager SHALL store the changelog if provided

### Requirement 7: Skill Status Management

**User Story:** As a developer, I want to toggle skill active/inactive status, so that I can control which skills are available.

#### Acceptance Criteria

1. WHEN a user calls PATCH `/api/skills/:id` with active status THEN the Skill Manager SHALL update the skill's active flag
2. WHEN a skill is deactivated THEN the Skill Manager SHALL exclude it from default list queries

### Requirement 8: Authentication

**User Story:** As a system administrator, I want all API endpoints protected by authentication, so that only authorized users can access the system.

#### Acceptance Criteria

1. WHEN a request lacks a valid Authorization header THEN the Skill Manager SHALL reject the request with a 401 UNAUTHORIZED error
2. WHEN a request includes a valid Bearer token matching the MCP_API_KEY THEN the Skill Manager SHALL process the request

### Requirement 9: Input Validation

**User Story:** As a system administrator, I want all inputs validated against constraints, so that the system maintains data integrity.

#### Acceptance Criteria

1. IF a file content exceeds 200KB THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR
2. IF a version contains more than 50 files THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR
3. IF a file path exceeds 255 characters THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR
4. IF a changelog exceeds 2000 characters THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR
5. IF a description exceeds 1000 characters THEN the Skill Manager SHALL reject the request with a VALIDATION_ERROR

### Requirement 10: Web UI - Skill List

**User Story:** As a developer, I want to view all skills in a web interface, so that I can browse available capabilities.

#### Acceptance Criteria

1. WHEN a user visits the skill list page THEN the Web UI SHALL display all skills with name, status, and latest version
2. WHEN a user clicks on a skill THEN the Web UI SHALL navigate to the skill detail page

### Requirement 11: Web UI - Skill Detail

**User Story:** As a developer, I want to view skill details in a web interface, so that I can inspect skill contents and history.

#### Acceptance Criteria

1. WHEN a user visits the skill detail page THEN the Web UI SHALL display skill metadata, version history, and file list
2. WHEN a user selects a version THEN the Web UI SHALL display files for that version
3. WHEN a user clicks on a file THEN the Web UI SHALL display the file content

### Requirement 12: Data Serialization

**User Story:** As a system component, I want skills and versions serialized to JSON for API responses, so that clients can consume the data.

#### Acceptance Criteria

1. WHEN the Skill Manager serializes a skill THEN the output SHALL include id, name, description, active, created_at, and updated_at fields
2. WHEN the Skill Manager deserializes a skill from the database THEN the result SHALL match the original skill data
