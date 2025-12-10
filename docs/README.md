# Skill Manager Documentation

This folder contains the core product and technical documentation for Skill Manager.

## Documents

- **`prd.md` – Product Requirements Document (PRD)**
  Describes the problem, target users, scope, features, acceptance criteria, and success metrics.

- **`tdd.md` – Technical Design Document (TDD)**
  Describes the architecture, data model, API surface, constraints, and implementation phases for the MVP.

## Conventions

- **Requirement IDs**
  Functional requirements in the PRD use stable IDs:
  - `F-001` Skill Management
  - `F-002` File Management
  - `F-003` Version History
  - `F-004` Web UI

  The TDD references these IDs in relevant sections (e.g., database schema, MCP tools, REST API, Web UI) to keep PRD ↔ TDD aligned.

- **Dates**
  `Last Updated` fields use `YYYY-MM-DD`.

- **Change History**
  Each doc may include a `Change History` section that briefly records important edits over time.

## Reading Order

- Start with `prd.md` to understand **what** Skill Manager does and **why**.
- Then read `tdd.md` to understand **how** it is implemented.
