/**
 * Custom hooks for skill detail data fetching
 * Requirements: 4.1, 5.1, 6.1, 11.1, 11.2, 11.3
 */

import { useState, useEffect, useCallback } from 'react';
import type { SkillDetail, SkillFile, SkillVersion } from '../../shared/types';
import { fetchSkill, fetchSkillVersions, fetchSkillFile } from '../lib/api';

// ============================================================================
// useSkill - Fetch skill details
// ============================================================================

interface UseSkillState {
  skill: SkillDetail | null;
  loading: boolean;
  error: string | null;
}

interface UseSkillReturn extends UseSkillState {
  refetch: () => void;
  setVersion: (version: number) => void;
}

export function useSkill(skillId: string, initialVersion?: number): UseSkillReturn {
  const [version, setVersion] = useState<number | undefined>(initialVersion);
  const [state, setState] = useState<UseSkillState>({
    skill: null,
    loading: true,
    error: null,
  });

  const loadSkill = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchSkill(skillId, version);
      setState({ skill: data, loading: false, error: null });
    } catch (err) {
      setState({
        skill: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load skill',
      });
    }
  }, [skillId, version]);

  useEffect(() => {
    loadSkill();
  }, [loadSkill]);

  return { ...state, refetch: loadSkill, setVersion };
}

// ============================================================================
// useSkillVersions - Fetch version history
// ============================================================================

interface UseSkillVersionsState {
  versions: SkillVersion[];
  loading: boolean;
  error: string | null;
}

export function useSkillVersions(skillId: string): UseSkillVersionsState & { refetch: () => void } {
  const [state, setState] = useState<UseSkillVersionsState>({
    versions: [],
    loading: true,
    error: null,
  });

  const loadVersions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchSkillVersions(skillId);
      setState({ versions: data.versions, loading: false, error: null });
    } catch (err) {
      setState({
        versions: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load versions',
      });
    }
  }, [skillId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return { ...state, refetch: loadVersions };
}

// ============================================================================
// useSkillFile - Fetch file content
// ============================================================================

interface UseSkillFileState {
  file: SkillFile | null;
  loading: boolean;
  error: string | null;
}

export function useSkillFile(
  skillId: string,
  version: number,
  filePath: string | null
): UseSkillFileState {
  const [state, setState] = useState<UseSkillFileState>({
    file: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!filePath) {
      setState({ file: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchSkillFile(skillId, version, filePath)
      .then((data) => setState({ file: data, loading: false, error: null }))
      .catch((err) =>
        setState({
          file: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load file',
        })
      );
  }, [skillId, version, filePath]);

  return state;
}
