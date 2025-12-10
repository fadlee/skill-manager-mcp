# AGENTS.md - Skill Manager

> AI coding agent guidance. Sub-packages have their own AGENTS.md files.

## Project Snapshot

- **Type:** Single Cloudflare Workers project (React + Hono)
- **Stack:** TypeScript, React 19, Hono, Vite 6, Cloudflare Workers, D1
- **Package Manager:** Bun
- **Purpose:** Centralized HTTP MCP service for managing AI skills

## Root Setup Commands

```bash
# Install dependencies
bun install

# Run dev server (frontend + worker)
bun run dev

# Build for production
bun run build

# Type check
bun run check

# Lint
bun run lint

# Deploy to Cloudflare
bun run deploy
```

## Universal Conventions

- **TypeScript:** Strict mode enabled
- **Code Style:** ESLint + Prettier (implicit via ESLint)
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `docs:`, etc.)
- **Imports:** Use relative paths within packages
- **Naming:** camelCase for variables/functions, PascalCase for components/types

## Security & Secrets

- **Never commit** API keys or tokens to the repository
- Secrets go in Cloudflare Workers secrets (via `wrangler secret put`)
- Environment variables defined in `wrangler.json` (non-sensitive only)
- MCP API key: `MCP_API_KEY` environment variable

## JIT Index (what to open, not what to paste)

### Package Structure

| Path | Description | Details |
|------|-------------|---------|
| `src/react-app/` | React frontend | [see src/react-app/AGENTS.md](src/react-app/AGENTS.md) |
| `src/worker/` | Hono backend (Workers) | [see src/worker/AGENTS.md](src/worker/AGENTS.md) |
| `src/shared/` | Shared types (planned) | Types shared between frontend/backend |
| `docs/` | Documentation | PRD (`prd.md`), TDD (`tdd.md`) |

### Quick Find Commands

```bash
# Search for a function
rg -n "functionName" src/

# Find React components
rg -n "export (default )?function" src/react-app/

# Find API routes
rg -n "app\.(get|post|put|patch|delete)" src/worker/

# Find TypeScript interfaces
rg -n "^export (interface|type)" src/

# Find all TODO/FIXME
rg -n "TODO|FIXME" src/
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.json` | Cloudflare Workers config |
| `vite.config.ts` | Vite build config |
| `tsconfig.json` | TypeScript config (references sub-configs) |
| `eslint.config.js` | ESLint rules |

## Definition of Done

Before creating a PR:

```bash
bun run check  # TypeScript + build + dry-run deploy
bun run lint   # ESLint
```

- [ ] All type checks pass
- [ ] Build succeeds
- [ ] No lint errors
- [ ] Conventional commit message used
