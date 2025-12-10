/**
 * Custom hooks for skill detail data fetching
 * Requirements: 4.1, 5.1, 6.1, 11.1, 11.2, 11.3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const mountedRef = useRef(true);

  const loadSkill = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchSkill(skillId, version);
      if (mountedRef.current) {
        setState({ skill: data, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          skill: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load skill',
        });
      }
    }
  }, [skillId, version]);

  useEffect(() => {
    mountedRef.current = true;
    loadSkill();
    return () => {
      mountedRef.current = false;
    };
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
  const mountedRef = useRef(true);

  const loadVersions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchSkillVersions(skillId);
      if (mountedRef.current) {
        setState({ versions: data.versions, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          versions: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load versions',
        });
      }
    }
  }, [skillId]);

  useEffect(() => {
    mountedRef.current = true;
    loadVersions();
    return () => {
      mountedRef.current = false;
    };
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
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchSkillFile(skillId, version, filePath)
      .then((data) => {
        if (!cancelled) {
          setState({ file: data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            file: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load file',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skillId, version, filePath]);

  return state;
}
