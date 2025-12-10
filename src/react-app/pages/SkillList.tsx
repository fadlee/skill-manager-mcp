/**
 * Skill List Page Component
 * Requirements: 10.1, 10.2
 */

import { useSkills } from '../hooks/useSkills';
import type { SkillWithVersion } from '../../shared/types';

interface SkillListProps {
  onSelectSkill: (skillId: string) => void;
}

/**
 * Skill card component
 */
function SkillCard({
  skill,
  onClick,
}: {
  skill: SkillWithVersion;
  onClick: () => void;
}) {
  return (
    <div
      className="skill-card"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <div className="skill-card-header">
        <h3 className="skill-name">{skill.name}</h3>
        <span className={`skill-status ${skill.active ? 'active' : 'inactive'}`}>
          {skill.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      {skill.description && (
        <p className="skill-description">{skill.description}</p>
      )}
      <div className="skill-meta">
        <span className="skill-version">v{skill.latest_version}</span>
        <span className="skill-date">
          {new Date(skill.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="skill-list-loading">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skill-card skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line description" />
          <div className="skeleton-line meta" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error display
 */
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="skill-list-error">
      <p>Error: {message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="skill-list-empty">
      <p>No skills found</p>
      <p className="hint">Skills created by AI agents will appear here.</p>
    </div>
  );
}

/**
 * Skill List Page
 */
export function SkillList({ onSelectSkill }: SkillListProps) {
  const { skills, loading, error, refetch } = useSkills();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={refetch} />;
  }

  if (skills.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="skill-list">
      <h2>Skills</h2>
      <div className="skill-grid">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onClick={() => onSelectSkill(skill.id)}
          />
        ))}
      </div>
    </div>
  );
}
