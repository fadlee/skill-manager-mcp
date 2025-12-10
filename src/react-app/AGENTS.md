# AGENTS.md - React Frontend

> React frontend for Skill Manager Web UI (F-004)

## Package Identity

- **Purpose:** Browser interface for viewing and managing AI skills
- **Framework:** React 19 + Vite 6
- **Styling:** CSS (vanilla, planned: TailwindCSS or similar)

## Setup & Run

```bash
# From project root
bun install
bun run dev      # Dev server with HMR
bun run build    # Production build
bun run lint     # ESLint
```

## Patterns & Conventions

### File Organization

```
src/react-app/
├── components/    # Reusable UI components (planned)
├── pages/         # Page components (planned)
├── hooks/         # Custom React hooks (planned)
├── lib/           # Utilities, API client (planned)
├── assets/        # Static assets (images, SVGs)
├── App.tsx        # Root component
├── main.tsx       # Entry point
└── *.css          # Stylesheets
```

### Component Patterns

- ✅ **DO:** Use functional components with hooks
- ✅ **DO:** Colocate component styles (CSS modules or inline)
- ✅ **DO:** Use `useState`, `useEffect` for state management
- ❌ **DON'T:** Use class components
- ❌ **DON'T:** Hardcode API URLs (use relative paths like `/api/`)

### API Calls

- ✅ **DO:** Use `fetch()` with relative paths: `fetch('/api/skills')`
- ✅ **DO:** Handle loading and error states
- See example in `App.tsx` lines 48-52 for API call pattern

### Naming

- **Components:** PascalCase (`SkillList.tsx`, `FileViewer.tsx`)
- **Hooks:** camelCase with `use` prefix (`useSkills.ts`)
- **Utilities:** camelCase (`formatDate.ts`)

## Touch Points / Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, routing entry |
| `main.tsx` | React DOM entry point |
| `index.css` | Global styles |
| `App.css` | App-level styles |

## JIT Index Hints

```bash
# Find React components
rg -n "export (default )?function" src/react-app/

# Find hooks
rg -n "export (const\|function) use" src/react-app/

# Find all TSX files
find src/react-app -name "*.tsx"

# Find CSS files
find src/react-app -name "*.css"
```

## Common Gotchas

- API calls go through Hono backend at `/api/*` - no CORS needed
- Assets in `assets/` are bundled by Vite
- Public assets in `/public/` are served as-is

## Pre-PR Checks

```bash
bun run lint && bun run build
```
