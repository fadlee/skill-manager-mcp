/**
 * MCP Server Route Handler
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1
 */

import { Hono } from 'hono';
import type { SkillService } from '../services/skill.service';
import type { CreateSkillInput, UpdateSkillInput, ListSkillsOptions } from '../../shared/types';
import { isAppError } from '../lib/errors';

/**
 * MCP JSON-RPC request structure
 */
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response structure
 */
interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * MCP tool result structure
 */
interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Tool definitions for MCP
 */
const TOOL_DEFINITIONS = [
  {
    name: 'skill_create',
    description: 'Create a new skill with files. IMPORTANT: Always include a SKILL.md file as the primary documentation. Put reference files (docs, examples, data) in references/ folder.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Unique name for the skill (kebab-case recommended)' },
        description: { type: 'string', description: 'Brief description of the skill' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path. Use SKILL.md for main doc, references/ folder for reference files (e.g., references/api-docs.md)' },
              content: { type: 'string', description: 'File content' },
              is_executable: { type: 'boolean', description: 'Whether the file is executable' },
              script_language: { type: 'string', description: 'Script language if executable (e.g., python, bash, javascript)' },
              run_instructions_for_ai: { type: 'string', description: 'Instructions for AI to run the script' },
            },
            required: ['path', 'content'],
          },
          description: 'Files to include. Structure: SKILL.md (main doc), references/ (reference files), scripts/ (executable scripts).',
        },
        changelog: { type: 'string', description: 'Changelog for this version' },
      },
      required: ['name', 'files'],
    },
  },
  {
    name: 'skill_update',
    description: 'Update an existing skill, creating a new version',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'ID of the skill to update' },
        description: { type: 'string', description: 'New description for the skill' },
        file_changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['add', 'update', 'delete'], description: 'Type of change' },
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content (required for add/update)' },
              is_executable: { type: 'boolean', description: 'Whether the file is executable' },
              script_language: { type: 'string', description: 'Script language if executable' },
              run_instructions_for_ai: { type: 'string', description: 'Instructions for AI to run the script' },
            },
            required: ['type', 'path'],
          },
          description: 'File changes to apply',
        },
        changelog: { type: 'string', description: 'Changelog for this version' },
      },
      required: ['skill_id'],
    },
  },
  {
    name: 'skill_list',
    description: 'List all skills with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        active_only: { type: 'boolean', description: 'Only return active skills' },
        limit: { type: 'number', description: 'Maximum number of results' },
        offset: { type: 'number', description: 'Number of results to skip' },
        query: { type: 'string', description: 'Search query for skill name' },
      },
    },
  },
  {
    name: 'skill_get',
    description: 'Get detailed information about a skill',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'ID of the skill' },
        version: { type: 'number', description: 'Specific version number (defaults to latest)' },
      },
      required: ['skill_id'],
    },
  },
  {
    name: 'skill_get_file',
    description: 'Get the content of a specific file from a skill',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'ID of the skill' },
        path: { type: 'string', description: 'Path of the file' },
        version: { type: 'number', description: 'Specific version number (defaults to latest)' },
      },
      required: ['skill_id', 'path'],
    },
  },
];


/**
 * Create success tool result
 */
function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Create error tool result
 */
function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/**
 * Create MCP success response
 */
function mcpSuccess(id: string | number, result: unknown): MCPResponse {
  return { jsonrpc: '2.0', id, result };
}

/**
 * Create MCP error response
 */
function mcpError(id: string | number, code: number, message: string, data?: unknown): MCPResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

/**
 * MCP error codes
 */
const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  APPLICATION_ERROR: -32000,
};

/**
 * Create MCP routes
 */
export function createMCPRoutes(service: SkillService) {
  const app = new Hono<{ Bindings: Env }>();

  app.post('/mcp', async (c) => {
    let request: MCPRequest;
    
    try {
      request = await c.req.json<MCPRequest>();
    } catch {
      return c.json(mcpError(0, MCP_ERROR_CODES.PARSE_ERROR, 'Parse error'));
    }

    // Validate JSON-RPC structure
    if (request.jsonrpc !== '2.0' || !request.method || request.id === undefined) {
      return c.json(mcpError(request?.id ?? 0, MCP_ERROR_CODES.INVALID_REQUEST, 'Invalid request'));
    }

    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return c.json(mcpSuccess(id, {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'skill-manager', version: '1.0.0' },
          }));

        case 'tools/list':
          return c.json(mcpSuccess(id, { tools: TOOL_DEFINITIONS }));

        case 'tools/call':
          return c.json(await handleToolCall(id, params, service));

        default:
          return c.json(mcpError(id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`));
      }
    } catch (error) {
      console.error('MCP error:', error);
      if (isAppError(error)) {
        return c.json(mcpError(id, MCP_ERROR_CODES.APPLICATION_ERROR, error.message, { code: error.code }));
      }
      return c.json(mcpError(id, MCP_ERROR_CODES.INTERNAL_ERROR, 'Internal error'));
    }
  });

  return app;
}


/**
 * Handle MCP tool calls
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1, 5.1
 */
async function handleToolCall(
  id: string | number,
  params: Record<string, unknown> | undefined,
  service: SkillService
): Promise<MCPResponse> {
  if (!params || typeof params.name !== 'string') {
    return mcpError(id, MCP_ERROR_CODES.INVALID_PARAMS, 'Missing tool name');
  }

  const toolName = params.name;
  const args = (params.arguments as Record<string, unknown>) || {};

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'skill_create':
        result = await handleSkillCreate(args, service);
        break;

      case 'skill_update':
        result = await handleSkillUpdate(args, service);
        break;

      case 'skill_list':
        result = await handleSkillList(args, service);
        break;

      case 'skill_get':
        result = await handleSkillGet(args, service);
        break;

      case 'skill_get_file':
        result = await handleSkillGetFile(args, service);
        break;

      default:
        return mcpError(id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool: ${toolName}`);
    }

    return mcpSuccess(id, result);
  } catch (error) {
    if (isAppError(error)) {
      return mcpSuccess(id, errorResult(`${error.code}: ${error.message}`));
    }
    throw error;
  }
}

/**
 * Handle skill.create tool
 */
async function handleSkillCreate(
  args: Record<string, unknown>,
  service: SkillService
): Promise<ToolResult> {
  const input: CreateSkillInput = {
    name: args.name as string,
    description: args.description as string | undefined,
    files: (args.files as CreateSkillInput['files']) || [],
    changelog: args.changelog as string | undefined,
  };

  const skill = await service.createSkill(input);
  return successResult({
    message: `Skill "${skill.name}" created successfully`,
    skill_id: skill.id,
    version: skill.version.version_number,
    files: skill.files.map(f => f.path),
  });
}

/**
 * Handle skill.update tool
 */
async function handleSkillUpdate(
  args: Record<string, unknown>,
  service: SkillService
): Promise<ToolResult> {
  const input: UpdateSkillInput = {
    skill_id: args.skill_id as string,
    description: args.description as string | undefined,
    file_changes: args.file_changes as UpdateSkillInput['file_changes'],
    changelog: args.changelog as string | undefined,
  };

  const skill = await service.updateSkill(input);
  return successResult({
    message: `Skill "${skill.name}" updated to version ${skill.version.version_number}`,
    skill_id: skill.id,
    version: skill.version.version_number,
    files: skill.files.map(f => f.path),
  });
}


/**
 * Handle skill.list tool
 */
async function handleSkillList(
  args: Record<string, unknown>,
  service: SkillService
): Promise<ToolResult> {
  const options: ListSkillsOptions = {
    activeOnly: args.active_only as boolean | undefined,
    limit: args.limit as number | undefined,
    offset: args.offset as number | undefined,
    query: args.query as string | undefined,
  };

  const skills = await service.listSkills(options);
  return successResult({
    count: skills.length,
    skills: skills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      active: s.active,
      latest_version: s.latest_version,
    })),
  });
}

/**
 * Handle skill.get tool
 */
async function handleSkillGet(
  args: Record<string, unknown>,
  service: SkillService
): Promise<ToolResult> {
  const skillId = args.skill_id as string;
  const version = args.version as number | undefined;

  const skill = await service.getSkill(skillId, version);
  return successResult({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    active: skill.active,
    version: {
      number: skill.version.version_number,
      changelog: skill.version.changelog,
      created_at: skill.version.created_at,
      created_by: skill.version.created_by,
    },
    files: skill.files.map((f) => ({
      path: f.path,
      is_executable: f.is_executable,
      script_language: f.script_language,
    })),
  });
}

/**
 * Handle skill.get_file tool
 */
async function handleSkillGetFile(
  args: Record<string, unknown>,
  service: SkillService
): Promise<ToolResult> {
  const skillId = args.skill_id as string;
  const path = args.path as string;
  const version = args.version as number | undefined;

  const file = await service.getFile(skillId, path, version);
  return successResult({
    path: file.path,
    content: file.content,
    is_executable: file.is_executable,
    script_language: file.script_language,
    run_instructions_for_ai: file.run_instructions_for_ai,
  });
}