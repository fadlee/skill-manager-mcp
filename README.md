# Skill Manager

A centralized HTTP MCP service for managing AI skills. Enables AI agents to create, store, and manage reusable skills with automatic versioning, while providing developers with a web interface for viewing and monitoring.

## Tech Stack

- [**React 19**](https://react.dev/) - UI for viewing and managing skills
- [**Tailwind CSS v4**](https://tailwindcss.com/) - Utility-first CSS framework
- [**Vite 6**](https://vite.dev/) - Build tooling and development server
- [**Hono**](https://hono.dev/) - Backend framework for API and MCP routes
- [**Cloudflare Workers**](https://developers.cloudflare.com/workers/) - Edge computing platform
- [**Cloudflare D1**](https://developers.cloudflare.com/d1/) - SQLite database

## Features

- 🤖 MCP (Model Context Protocol) server for AI agent integration
- 📦 **ZIP Upload** - Upload multiple skills at once via web UI
- 📝 Skill versioning with file management
- 🌐 REST API for programmatic access
- 💻 Web UI for browsing and viewing skills
- 🔐 API key authentication for write operations
- ⚡ Deployed on Cloudflare's global edge network

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or Node.js
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Installation

```bash
bun install
```

### Database Setup

Create and apply D1 migrations:

```bash
# For local development
wrangler d1 migrations apply skill-manager-db --local

# For production
wrangler d1 migrations apply skill-manager-db
```

### Configuration

Set the MCP API key for authentication:

```bash
# For production (as a secret)
wrangler secret put MCP_API_KEY

# For local development, add to wrangler.json:
# "vars": { "MCP_API_KEY": "your-api-key" }
```

### Development

```bash
bun run dev
```

Access the Web UI at [http://localhost:5173](http://localhost:5173)

**Default API Key:** `asdf1234` (for local development)

### Production

```bash
bun run build
bun run deploy
```

## MCP Integration

The Skill Manager exposes an MCP server at `/mcp` for AI agent integration.

### MCP Configuration

Add to your MCP client configuration (e.g., Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "skill-manager": {
      "url": "https://your-worker.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### Available MCP Tools

#### skill.create
Create a new skill with files.

```json
{
  "name": "skill.create",
  "arguments": {
    "name": "my-skill",
    "description": "A useful skill",
    "files": [
      {
        "path": "main.py",
        "content": "print('Hello')",
        "is_executable": true,
        "script_language": "python"
      }
    ],
    "changelog": "Initial version"
  }
}
```

#### skill.update
Update an existing skill (creates a new version).

```json
{
  "name": "skill.update",
  "arguments": {
    "skill_id": "uuid-here",
    "description": "Updated description",
    "file_changes": [
      { "type": "add", "path": "new-file.txt", "content": "content" },
      { "type": "update", "path": "main.py", "content": "updated content" },
      { "type": "delete", "path": "old-file.txt" }
    ],
    "changelog": "Added new feature"
  }
}
```

#### skill.list
List all skills with optional filtering.

```json
{
  "name": "skill.list",
  "arguments": {
    "active_only": true,
    "limit": 10,
    "offset": 0,
    "query": "search term"
  }
}
```

#### skill.get
Get detailed information about a skill.

```json
{
  "name": "skill.get",
  "arguments": {
    "skill_id": "uuid-here",
    "version": 1
  }
}
```

#### skill.get_file
Get the content of a specific file.

```json
{
  "name": "skill.get_file",
  "arguments": {
    "skill_id": "uuid-here",
    "path": "main.py",
    "version": 1
  }
}
```

### Testing MCP with curl

```bash
# Initialize
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# List tools
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Create a skill
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"skill.create",
      "arguments":{
        "name":"hello-world",
        "description":"A simple hello world skill",
        "files":[{"path":"main.py","content":"print(\"Hello, World!\")"}]
      }
    }
  }'
```

## ZIP Upload Feature

Upload multiple skills at once using ZIP files through the web UI.

### ZIP Structure

Each root-level folder in the ZIP represents a skill:

```
skills.zip
├── my-first-skill/
│   ├── SKILL.md          # Required: skill documentation
│   ├── main.py           # Executable files auto-detected
│   └── utils.js
├── another-skill/
│   ├── SKILL.md
│   ├── README.md
│   └── scripts/
│       └── setup.sh
└── data-processor/
    ├── SKILL.md
    └── processor.py
```

### Upload Process

1. **Parse**: Upload ZIP → System extracts and validates skills → Preview with validation status
2. **Select**: Choose which skills to import (invalid skills are disabled)
3. **Import**: Selected skills are created/updated in the database

### Validation Rules

- ZIP file max size: **10MB**
- Each skill folder must contain **SKILL.md**
- Max **50 files** per skill
- Max **200KB** per file
- Executable files (`.py`, `.sh`, `.js`, `.ts`) are auto-detected
- Binary files are skipped with warnings

### API Usage

```bash
# Step 1: Parse ZIP
curl -X POST https://your-worker.workers.dev/api/skills/upload/parse \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@skills.zip"

# Response: { session_id, skills: [{ name, valid, errors, file_count }] }

# Step 2: Import selected skills
curl -X POST https://your-worker.workers.dev/api/skills/upload/process \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid-from-parse",
    "selected_skills": ["my-first-skill", "data-processor"]
  }'

# Response: { total, successful, failed, results: [...] }
```

## REST API

### Public Endpoints (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/skills` | List skills |
| GET | `/api/skills/:id` | Get skill details |
| GET | `/api/skills/:id/versions` | Get version history |
| GET | `/api/skills/:id/versions/:v/files/*` | Get file content |

### Protected Endpoints (requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/skills/:id` | Update skill status |
| POST | `/api/skills/upload/parse` | Parse ZIP file and preview skills |
| POST | `/api/skills/upload/process` | Import selected skills from ZIP |
| POST | `/mcp` | MCP protocol endpoint |

### Query Parameters

- `active_only=true` - Filter to active skills only
- `limit=50` - Maximum results (max 100)
- `offset=0` - Pagination offset
- `query=search` - Search by skill name
- `version=1` - Specific version number

## Project Structure

```
├── src/
│   ├── react-app/       # React frontend
│   │   ├── components/  # UI components (Login, SkillUpload, etc.)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # API client with auth
│   │   ├── pages/       # Page components
│   │   └── styles/      # CSS styles
│   ├── shared/          # Shared types
│   └── worker/          # Cloudflare Worker backend
│       ├── lib/         # Utilities (auth, validation, upload-validation)
│       ├── repositories/# Data access layer
│       ├── routes/      # MCP, API, and upload routes
│       └── services/    # Business logic (skill, upload, session, zip-parser)
├── migrations/          # D1 database migrations (skills + upload_sessions)
└── wrangler.json        # Cloudflare configuration
```

## Commands

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run check    # Type check + build + dry-run deploy
bun run lint     # Run ESLint
bun run deploy   # Deploy to Cloudflare
```

## License

MIT
