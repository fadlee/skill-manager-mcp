/**
 * Skill Detail Page Component
 * Requirements: 11.1, 11.2
 */

import { useState } from 'react';
import { useSkill, useSkillFile } from '../hooks/useSkill';
import { FileViewer } from '../components/FileViewer';

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
    <div className="version-selector">
      <label htmlFor="version-select">Version:</label>
      <select
        id="version-select"
        value={currentVersion}
        onChange={(e) => onVersionChange(parseInt(e.target.value, 10))}
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
    <div className="file-list">
      <h4>Files</h4>
      <ul>
        {files.map((file) => (
          <li
            key={file.path}
            className={`file-item ${selectedPath === file.path ? 'selected' : ''}`}
            onClick={() => onSelectFile(file.path)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFile(file.path)}
            role="button"
            tabIndex={0}
          >
            <span className="file-icon">{file.is_executable ? '⚡' : '📄'}</span>
            <span className="file-path">{file.path}</span>
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
}: {
  skill: {
    name: string;
    description: string | null;
    active: boolean;
    version: { version_number: number; changelog: string | null; created_at: number };
  };
}) {
  return (
    <div className="skill-metadata">
      <h2>{skill.name}</h2>
      <span className={`skill-status ${skill.active ? 'active' : 'inactive'}`}>
        {skill.active ? 'Active' : 'Inactive'}
      </span>
      {skill.description && <p className="description">{skill.description}</p>}
      {skill.version.changelog && (
        <div className="changelog">
          <strong>Changelog:</strong> {skill.version.changelog}
        </div>
      )}
      <div className="version-info">
        <span>Created: {new Date(skill.version.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

/**
 * Skill Detail Page
 */
export function SkillDetail({ skillId, onBack }: SkillDetailProps) {
  const { skill, loading, error, setVersion } = useSkill(skillId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { file, loading: fileLoading, error: fileError } = useSkillFile(
    skillId,
    skill?.version.version_number ?? 1,
    selectedFile
  );

  if (loading) {
    return (
      <div className="skill-detail-loading">
        <p>Loading skill...</p>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="skill-detail-error">
        <p>Error: {error || 'Skill not found'}</p>
        <button onClick={onBack}>Back to list</button>
      </div>
    );
  }

  return (
    <div className="skill-detail">
      <button className="back-button" onClick={onBack}>
        ← Back to Skills
      </button>

      <SkillMetadata skill={skill} />

      <VersionSelector
        currentVersion={skill.version.version_number}
        onVersionChange={setVersion}
      />

      <div className="skill-content">
        <FileList
          files={skill.files}
          selectedPath={selectedFile}
          onSelectFile={setSelectedFile}
        />

        <div className="file-viewer-container">
          {selectedFile ? (
            <FileViewer file={file} loading={fileLoading} error={fileError} />
          ) : (
            <div className="no-file-selected">
              <p>Select a file to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
