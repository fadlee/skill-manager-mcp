/**
 * Skill Detail Page Component
 * Requirements: 11.1, 11.2
 */

import { useState, useCallback } from 'react';
import { useSkill, useSkillFile } from '../hooks/useSkill';
import { useSkillStatusToggle } from '../hooks/useSkillStatusToggle';
import { FileViewer } from '../components/FileViewer';
import { FileEditor } from '../components/FileEditor';
import { SkillStatusToggle } from '../components/SkillStatusToggle';
import { updateSkill as apiUpdateSkill } from '../lib/api';

interface SkillDetailProps {
  skillId: string;
  onBack: () => void;
}

/**
 * Version selector component
 */
function VersionSelector({
  currentVersion,
  onVersionChange,
}: {
  currentVersion: number;
  onVersionChange: (version: number) => void;
}) {
  return (
    <div className="mb-4">
      <label htmlFor="version-select" className="mr-2 text-gray-700">Version:</label>
      <select
        id="version-select"
        value={currentVersion}
        onChange={(e) => onVersionChange(parseInt(e.target.value, 10))}
        className="px-2 py-1 border border-gray-300 rounded text-base"
      >
        {/* Generate options for versions 1 to current */}
        {Array.from({ length: currentVersion }, (_, i) => currentVersion - i).map(
          (v) => (
            <option key={v} value={v}>
              v{v}
            </option>
          )
        )}
      </select>
    </div>
  );
}

/**
 * File list component
 */
function FileList({
  files,
  selectedPath,
  onSelectFile,
}: {
  files: Array<{ path: string; is_executable: boolean }>;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 lg:max-h-96 lg:overflow-y-auto">
      <h4 className="text-gray-900 m-0 mb-4">Files</h4>
      <ul className="list-none p-0 m-0">
        {files.map((file) => (
          <li
            key={file.path}
            className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedPath === file.path
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset`}
            onClick={() => onSelectFile(file.path)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFile(file.path)}
            role="button"
            tabIndex={0}
          >
            <span className="mr-2">{file.is_executable ? '⚡' : '📄'}</span>
            <span className="text-sm break-all">{file.path}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


/**
 * Skill metadata display
 */
function SkillMetadata({
  skill,
  onStatusChange,
}: {
  skill: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    version: { version_number: number; changelog: string | null; created_at: number };
  };
  onStatusChange: (newStatus: boolean) => Promise<void>;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{skill.name}</h2>
        <SkillStatusToggle
          skillId={skill.id}
          currentStatus={skill.active}
          onStatusChange={onStatusChange}
          size="small"
        />
      </div>
      {skill.description && <p className="text-gray-600 my-3">{skill.description}</p>}
      {skill.version.changelog && (
        <div className="bg-gray-50 px-3 py-3 rounded my-3 text-sm">
          <strong className="block mb-1">Changelog:</strong> {skill.version.changelog}
        </div>
      )}
      <div className="text-sm text-gray-500">
        <span>Created: {new Date(skill.version.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

/**
 * Skill Detail Page
 */
export function SkillDetail({ skillId, onBack }: SkillDetailProps) {
  const { skill, loading, error, setVersion, updateSkill } = useSkill(skillId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toggleStatus } = useSkillStatusToggle();

  const { file, loading: fileLoading, error: fileError } = useSkillFile(
    skillId,
    skill?.version.version_number ?? 1,
    selectedFile
  );

  const handleStatusChange = useCallback(async (newStatus: boolean) => {
    if (!skill) return;

    // Optimistic update
    updateSkill({ active: newStatus });

    try {
      await toggleStatus(skillId, skill.active);
      // Success - optimistic update was correct
    } catch (err) {
      // Error - rollback optimistic update
      updateSkill({ active: skill.active });
      throw err; // Re-throw to let SkillStatusToggle handle error display
    }
  }, [skill, updateSkill, toggleStatus, skillId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (content: string) => {
    if (!skill || !selectedFile) return;

    try {
      const newSkill = await apiUpdateSkill(skill.id, {
        description: skill.description || undefined,
        file_changes: [
          {
            type: 'update',
            path: selectedFile,
            content: content,
          },
        ],
        changelog: `Updated ${selectedFile}`,
      });

      // Update local state to new skill
      updateSkill(newSkill);
      // Switch to new version
      setVersion(newSkill.version.version_number);
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save', err);
      alert('Failed to save changes: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p>Loading skill...</p>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="text-center py-12">
        <p>Error: {error || 'Skill not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <button
        className="bg-none border-none text-blue-600 cursor-pointer text-base py-2 px-0 mb-4 hover:underline"
        onClick={onBack}
      >
        ← Back to Skills
      </button>

      <SkillMetadata skill={skill} onStatusChange={handleStatusChange} />

      <VersionSelector
        currentVersion={skill.version.version_number}
        onVersionChange={setVersion}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 min-h-96">
        {/* On mobile, file list will be above file viewer */}
        <FileList
          files={skill.files}
          selectedPath={selectedFile}
          onSelectFile={(path) => {
            if (path !== selectedFile) {
              setSelectedFile(path);
              setIsEditing(false); // Exit edit mode when switching files
            }
          }}
        />

        <div className="file-viewer-container min-w-0">
          {selectedFile ? (
            isEditing && file ? (
              <FileEditor
                file={file}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            ) : (
              <FileViewer
                file={file}
                loading={fileLoading}
                error={fileError}
                onEdit={handleEdit}
              />
            )
          ) : (
            <div className="flex items-center justify-center min-h-48 text-gray-500 bg-gray-50 rounded-lg">
              <p>Select a file to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
