/**
 * Custom hook for skill status toggle functionality
 * Requirements: 1.2, 1.3, 2.2, 2.3, 4.5
 */

import { useState, useCallback, useRef } from 'react';
import { updateSkillStatus } from '../lib/api';
import type { SkillWithVersion } from '../../shared/types';

interface UseSkillStatusToggleReturn {
  isToggling: boolean;
  error: string | null;
  toggleStatus: (skillId: string, currentStatus: boolean) => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook that manages skill status toggle operations with optimistic updates,
 * debouncing, error handling, and proper cleanup
 */
export function useSkillStatusToggle(): UseSkillStatusToggleReturn {
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for debouncing and cleanup
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toggleStatus = useCallback(async (skillId: string, currentStatus: boolean) => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Debounce the actual API call by 300ms
    return new Promise<void>((resolve, reject) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        // Check if this request was cancelled
        if (abortController.signal.aborted) {
          reject(new Error('Request cancelled'));
          return;
        }

        setIsToggling(true);
        setError(null);

        try {
          const newStatus = !currentStatus;
          
          // Make API call with timeout protection
          const timeoutPromise = new Promise<never>((_, timeoutReject) => {
            setTimeout(() => {
              timeoutReject(new Error('Request timed out. Please try again.'));
            }, 10000); // 10 second timeout
          });

          const apiPromise = updateSkillStatus(skillId, newStatus);

          // Race between API call and timeout
          await Promise.race([apiPromise, timeoutPromise]);

          // Check if request was cancelled during API call
          if (abortController.signal.aborted) {
            reject(new Error('Request cancelled'));
            return;
          }

          resolve();
        } catch (err) {
          // Don't set error if request was cancelled
          if (!abortController.signal.aborted) {
            let errorMessage = 'Failed to update skill status';
            
            if (err instanceof Error) {
              if (err.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
              } else if (err.message.includes('network') || err.message.includes('fetch')) {
                errorMessage = 'Connection failed. Please check your internet connection.';
              } else if (err.message.includes('unauthorized') || err.message.includes('401')) {
                errorMessage = 'You are not authorized to perform this action.';
              } else if (err.message.includes('forbidden') || err.message.includes('403')) {
                errorMessage = 'Access denied. You do not have permission to modify this skill.';
              } else if (err.message.includes('not found') || err.message.includes('404')) {
                errorMessage = 'Skill not found. It may have been deleted.';
              } else if (err.message.includes('conflict') || err.message.includes('409')) {
                errorMessage = 'Skill was modified by another user. Please refresh and try again.';
              } else if (err.message.includes('server') || err.message.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
              } else {
                errorMessage = err.message;
              }
            }
            
            // Log error for debugging (only in development)
            if (process.env.NODE_ENV === 'development') {
              console.error('Skill status toggle error:', {
                skillId,
                currentStatus,
                newStatus,
                error: err,
                timestamp: new Date().toISOString()
              });
            }
            
            setError(errorMessage);
            reject(err);
          } else {
            reject(new Error('Request cancelled'));
          }
        } finally {
          // Only update loading state if request wasn't cancelled
          if (!abortController.signal.aborted) {
            setIsToggling(false);
          }
          
          // Clean up this controller reference if it's still the current one
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
          }
        }
      }, 300); // 300ms debounce
    });
  }, []);

  return {
    isToggling,
    error,
    toggleStatus,
    clearError,
  };
}

/**
 * Enhanced version of useSkillStatusToggle that integrates with a skill state updater
 * This version handles optimistic updates and rollback automatically
 */
export function useSkillStatusToggleWithOptimisticUpdate(
  onSkillUpdate: (skillId: string, updatedSkill: Partial<SkillWithVersion>) => void,
  onSkillUpdateRollback: (skillId: string) => void
) {
  const { isToggling, error, toggleStatus: baseToggleStatus, clearError } = useSkillStatusToggle();

  const toggleStatus = useCallback(async (skillId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic update
    onSkillUpdate(skillId, { active: newStatus });

    try {
      await baseToggleStatus(skillId, currentStatus);
      // Success - optimistic update was correct, no need to update again
    } catch (err) {
      // Error - rollback optimistic update
      onSkillUpdateRollback(skillId);
      throw err; // Re-throw to let component handle error display
    }
  }, [baseToggleStatus, onSkillUpdate, onSkillUpdateRollback]);

  return {
    isToggling,
    error,
    toggleStatus,
    clearError,
  };
}