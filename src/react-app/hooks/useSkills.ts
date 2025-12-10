/**
 * Custom hooks for skill data fetching
 * Requirements: 3.1, 10.1, 10.2
 */

import { useState, useEffect, useCallback } from 'react';
import type { SkillWithVersion } from '../../shared/types';
import { fetchSkills, type ListSkillsParams } from '../lib/api';

interface UseSkillsState {
  skills: SkillWithVersion[];
  loading: boolean;
  error: string | null;
  count: number;
}

interface UseSkillsReturn extends UseSkillsState {
  refetch: () => void;
  setParams: (params: ListSkillsParams) => void;
}

/**
 * Hook for fetching and managing skills list
 */
export function useSkills(initialParams: ListSkillsParams = {}): UseSkillsReturn {
  const [params, setParams] = useState<ListSkillsParams>(initialParams);
  const [state, setState] = useState<UseSkillsState>({
    skills: [],
    loading: true,
    error: null,
    count: 0,
  });

  const loadSkills = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchSkills(params);
      setState({
        skills: data.skills,
        count: data.count,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load skills',
      }));
    }
  }, [params]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return {
    ...state,
    refetch: loadSkills,
    setParams,
  };
}
