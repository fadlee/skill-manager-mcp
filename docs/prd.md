# Product Requirements Document - Skill Manager

## Overview

**Product Name:** Skill Manager  
**Version:** 1.0 (MVP)  
**Last Updated:** 2025-12-10

## Problem Statement

AI agents (like Claude, ChatGPT) need a centralized way to create, store, and manage reusable skills. Currently, skills are scattered across local files with no version history, making it difficult to:

- Track skill evolution over time
- Share skills across different AI sessions
- Maintain consistent skill quality
- Enable AI to self-improve skills programmatically

## Target Users

1. **AI Agents (Primary)** - Create and update skills via MCP protocol
2. **Developers (Secondary)** - View, manage, and monitor skills via Web UI

## Scope

### In Scope (MVP)

- Skill CRUD operations via MCP and REST API
- Automatic integer-based versioning
- File management within skills
- Changelog tracking per version
- Basic Web UI for viewing skills
- Single-tenant deployment on Cloudflare Workers

### Out of Scope (Future)

- Multi-tenant support
- Skill marketplace/sharing
- Skill execution runtime
- Real-time collaboration
- OAuth/SSO authentication

## Features

### 1. Skill Management

**Description:** Create, read, update, and list skills with automatic versioning.

**Acceptance Criteria:**
- [ ] AI can create a new skill via MCP `skill.create` tool
- [ ] AI can update an existing skill via MCP `skill.update` tool
- [ ] AI can list all skills via MCP `skill.list` tool
- [ ] AI can get skill details via MCP `skill.get` tool
- [ ] Each create/update automatically increments version number
- [ ] Skill names must be unique

### 2. File Management

**Description:** Manage files within each skill version.

**Acceptance Criteria:**
- [ ] Skills can contain multiple files with paths (e.g., `src/main.ts`)
- [ ] Files can be marked as executable with runtime instructions
- [ ] AI can retrieve individual file content via MCP `skill.get_file` tool
- [ ] Each version stores a complete snapshot of all files

### 3. Version History

**Description:** Track all changes to skills over time.

**Acceptance Criteria:**
- [ ] Every skill starts at version 1
- [ ] Every update creates a new version (previous + 1)
- [ ] Each version stores: changelog, created_at, created_by (ai/human)
- [ ] Previous versions are preserved and accessible
- [ ] No manual version number input allowed

### 4. Web UI

**Description:** Browser interface for viewing and managing skills.

**Acceptance Criteria:**
- [ ] List all skills with name, status, latest version
- [ ] View skill details and version history
- [ ] View file contents within a version
- [ ] Toggle skill active/inactive status

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Skill creation success rate | > 95% | MCP calls resulting in successful skill creation |
| API response time (p95) | < 500ms | Time from request to response |
| Version integrity | 100% | No version number gaps or duplicates |
| UI page load time | < 2s | Time to interactive |

## MVP Checklist

### MCP Tools
- [ ] `skill.create` - Create new skill with files
- [ ] `skill.update` - Update skill (edit/add files, metadata)
- [ ] `skill.list` - List all skills
- [ ] `skill.get` - Get skill details with file list
- [ ] `skill.get_file` - Get individual file content

### REST API
- [ ] `GET /api/skills` - List skills
- [ ] `GET /api/skills/:id` - Get skill details
- [ ] `GET /api/skills/:id/versions` - List versions
- [ ] `GET /api/skills/:id/versions/:version/files/:path` - Get file

### Web UI
- [ ] Skill list page
- [ ] Skill detail page with version history
- [ ] File viewer
