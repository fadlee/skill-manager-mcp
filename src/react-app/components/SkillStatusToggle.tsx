/**
 * Skill Status Toggle Component
 * Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface SkillStatusToggleProps {
  skillId: string;
  currentStatus: boolean;
  onStatusChange: (newStatus: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Reusable toggle component for skill active/inactive status
 */
export function SkillStatusToggle({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = 'medium'
}: SkillStatusToggleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Update optimistic status when currentStatus prop changes
  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

  const handleToggle = useCallback(async () => {
    if (disabled || isToggling) return;

    const newStatus = !optimisticStatus;

    // Optimistic update
    setOptimisticStatus(newStatus);
    setIsToggling(true);
    setError(null);

    try {
      await onStatusChange(newStatus);
      // Success - optimistic update was correct
    } catch (err) {
      // Error - rollback optimistic update
      setOptimisticStatus(currentStatus);
      setError(err instanceof Error ? err.message : 'Failed to update skill status');
    } finally {
      setIsToggling(false);
    }
  }, [disabled, isToggling, optimisticStatus, currentStatus, onStatusChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleToggle();
  }, [handleToggle]);

  // Size-based styling
  const sizeClasses = {
    small: {
      container: 'w-11 h-6 p-0.5',
      slider: 'w-5 h-5',
      translate: optimisticStatus ? 'translate-x-5' : 'translate-x-0',
      text: 'text-xs',
      spinner: 'w-3 h-3'
    },
    medium: {
      container: 'w-14 h-8 p-1',
      slider: 'w-6 h-6',
      translate: optimisticStatus ? 'translate-x-6' : 'translate-x-0',
      text: 'text-sm',
      spinner: 'w-4 h-4'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Toggle Switch */}
      <div className="flex items-center gap-2">
        <button
          ref={toggleRef}
          type="button"
          role="switch"
          aria-checked={optimisticStatus}
          aria-label={`Toggle skill status. Currently ${optimisticStatus ? 'active' : 'inactive'}`}
          disabled={disabled || isToggling}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`
            relative inline-flex items-center ${classes.container} rounded-full transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${optimisticStatus
              ? 'bg-green-500 hover:bg-green-600 shadow-lg'
              : 'bg-gray-300 hover:bg-gray-400'
            }
            ${disabled || isToggling ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Slider */}
          <span
            className={`
              inline-block ${classes.slider} bg-white rounded-full shadow-lg transform transition-all duration-300 ease-in-out
              ${classes.translate}
              flex items-center justify-center
              ${optimisticStatus ? 'shadow-green-200' : 'shadow-gray-200'}
            `}
          >
            {/* Loading spinner */}
            {isToggling && (
              <div className={`${classes.spinner} border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin`} />
            )}
          </span>
        </button>

        {/* Status Text */}
        <span className={`
          ${classes.text} font-medium
          ${optimisticStatus ? 'text-green-700' : 'text-gray-600'}
        `}>
          {optimisticStatus ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col gap-1">
          <div className={`${classes.text} text-red-600 max-w-xs`}>
            {error}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className={`
              ${classes.text} text-blue-600 hover:text-blue-800 hover:underline
              bg-none border-none cursor-pointer p-0 text-left
            `}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}