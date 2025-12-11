/**
 * API client for Skill Manager
 * Requirements: 3.1, 4.1, 5.1, 6.1, 10.1, 11.1
 */

import type {
  SkillWithVersion,
  SkillDetail,
  SkillFile,
  SkillVersion,
  APIResponse,
  APIError,
} from '../../shared/types';

const API_BASE = '/api';
const API_KEY_STORAGE_KEY = 'skill_manager_api_key';

/**
 * API response type
 */
type ApiResult<T> = APIResponse<T> | APIError;

// ============================================================================
// Auth utilities
// ============================================================================

/**
 * Get API key from localStorage
 */
export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Set API key in localStorage
 */
export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

/**
 * Remove API key from localStorage
 */
export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Check if user is authenticated (has API key)
 */
export function isAuthenticated(): boolean {
  return !!getApiKey();
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }
  return {};
}

/**
 * Fetch wrapper with error handling and auth
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  const data = (await response.json()) as ApiResult<T>;

  if (!data.ok) {
    throw new Error(data.error.message);
  }

  return data.data;
}

/**
 * List skills options
 */
export interface ListSkillsParams {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
  query?: string;
}

/**
 * List skills response
 */
export interface ListSkillsResponse {
  skills: SkillWithVersion[];
  count: number;
}

/**
 * Fetch skills list
 */
export async function fetchSkills(params: ListSkillsParams = {}): Promise<ListSkillsResponse> {
  const searchParams = new URLSearchParams();
  if (params.activeOnly) searchParams.set('active_only', 'true');
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.query) searchParams.set('query', params.query);
  searchParams.set('detailed', 'true'); // Always request detailed format for web UI

  const queryString = searchParams.toString();
  const path = `/skills?${queryString}`;

  return apiFetch<ListSkillsResponse>(path);
}

/**
 * Fetch skill details
 */
export async function fetchSkill(skillId: string, version?: number): Promise<SkillDetail> {
  const path = version ? `/skills/${skillId}?version=${version}` : `/skills/${skillId}`;
  return apiFetch<SkillDetail>(path);
}

/**
 * Fetch skill versions
 */
export async function fetchSkillVersions(
  skillId: string
): Promise<{ versions: SkillVersion[] }> {
  return apiFetch<{ versions: SkillVersion[] }>(`/skills/${skillId}/versions`);
}

/**
 * Fetch file content
 */
export async function fetchSkillFile(
  skillId: string,
  version: number,
  filePath: string
): Promise<SkillFile> {
  return apiFetch<SkillFile>(`/skills/${skillId}/versions/${version}/files/${filePath}`);
}

/**
 * Update skill status
 */
export async function updateSkillStatus(
  skillId: string,
  active: boolean
): Promise<SkillWithVersion> {
  return apiFetch<SkillWithVersion>(`/skills/${skillId}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}


// ============================================================================
// Upload API Types and Functions
// Requirements: 5.1, 5.2
// ============================================================================

/**
 * Skill preview from ZIP parsing
 */
export interface SkillPreview {
  name: string;
  valid: boolean;
  file_count: number;
  errors: string[];
  description?: string;
}

/**
 * Result of parsing a ZIP file
 */
export interface ParseResult {
  session_id: string;
  skills: SkillPreview[];
  expires_at: number;
}

/**
 * Result of importing a single skill
 */
export interface SkillImportResult {
  name: string;
  status: 'success' | 'failed';
  skill_id?: string;
  version?: number;
  error?: string;
  is_new?: boolean;
}

/**
 * Result of processing selected skills
 */
export interface ProcessResult {
  total: number;
  successful: number;
  failed: number;
  results: SkillImportResult[];
}

/**
 * Parse ZIP file and get preview
 * Requirements: 5.1
 */
export async function parseZipUpload(file: File): Promise<ParseResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/skills/upload/parse`, {
    method: 'POST',
    body: formData,
    headers: {
      ...getAuthHeaders(),
      // Don't set Content-Type header - browser will set it with boundary for multipart
    },
  });

  const data = (await response.json()) as ApiResult<ParseResult>;

  if (!data.ok) {
    throw new Error(data.error.message);
  }

  return data.data;
}

/**
 * Process selected skills from session
 * Requirements: 5.2
 */
export async function processSkillUpload(
  sessionId: string,
  selectedSkills: string[]
): Promise<ProcessResult> {
  return apiFetch<ProcessResult>('/skills/upload/process', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      selected_skills: selectedSkills,
    }),
  });
}
