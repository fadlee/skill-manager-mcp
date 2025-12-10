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

/**
 * API response type
 */
type ApiResult<T> = APIResponse<T> | APIError;

/**
 * Fetch wrapper with error handling
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

  const queryString = searchParams.toString();
  const path = queryString ? `/skills?${queryString}` : '/skills';

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
