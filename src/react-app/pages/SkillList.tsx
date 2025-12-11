/**
 * Skill List Page Component
 * Requirements: 10.1, 10.2
 */

import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import { SkillUpload } from '../components/SkillUpload';
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
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-900 m-0">{skill.name}</h3>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          skill.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {skill.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      {skill.description && (
        <p className="text-gray-600 text-sm my-2 line-clamp-2 overflow-hidden">{skill.description}</p>
      )}
      <div className="flex justify-between text-xs text-gray-500 mt-3">
        <span>v{skill.latest_version}</span>
        <span>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 pointer-events-none">
          <div className="h-5 bg-gray-200 rounded w-3/5 mb-3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-2/5 animate-pulse" />
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
    <div className="text-center py-12 text-gray-600">
      <p>Error: {message}</p>
      <button 
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-600">
      <p>No skills found</p>
      <p className="text-sm text-gray-500">Skills created by AI agents will appear here.</p>
    </div>
  );
}

/**
 * Skill List Page
 */
export function SkillList({ onSelectSkill }: SkillListProps) {
  const { skills, loading, error, refetch } = useSkills();
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = () => {
    refetch();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={refetch} />;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Skills</h2>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer text-sm hover:bg-blue-700 transition-colors"
          onClick={() => setShowUpload(true)}
        >
          <span>📦</span> Upload Skills
        </button>
      </div>

      {skills.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => onSelectSkill(skill.id)}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUpload(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-[90%] max-h-[90%] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SkillUpload
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
