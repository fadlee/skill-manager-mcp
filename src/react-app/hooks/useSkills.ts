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
  updateSkill: (skillId: string, updates: Partial<SkillWithVersion>) => void;
  rollbackSkill: (skillId: string) => void;
  filteredSkills: SkillWithVersion[];
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
  
  // Store original skills for rollback functionality
  const [originalSkills, setOriginalSkills] = useState<Map<string, SkillWithVersion>>(new Map());

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
      
      // Update original skills map for rollback functionality
      const skillsMap = new Map<string, SkillWithVersion>();
      data.skills.forEach(skill => skillsMap.set(skill.id, { ...skill }));
      setOriginalSkills(skillsMap);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load skills',
      }));
    }
  }, [params]);

  const updateSkill = useCallback((skillId: string, updates: Partial<SkillWithVersion>) => {
    setState(prev => {
      const updatedSkills = prev.skills.map(skill => 
        skill.id === skillId ? { ...skill, ...updates } : skill
      );
      
      return {
        ...prev,
        skills: updatedSkills,
      };
    });
  }, []);

  const rollbackSkill = useCallback((skillId: string) => {
    const originalSkill = originalSkills.get(skillId);
    if (originalSkill) {
      setState(prev => {
        const restoredSkills = prev.skills.map(skill => 
          skill.id === skillId ? { ...originalSkill } : skill
        );
        
        return {
          ...prev,
          skills: restoredSkills,
        };
      });
    }
  }, [originalSkills]);

  // No need for frontend filtering since backend already handles activeOnly filtering
  const filteredSkills = state.skills;

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return {
    ...state,
    refetch: loadSkills,
    setParams,
    updateSkill,
    rollbackSkill,
    filteredSkills,
  };
}
