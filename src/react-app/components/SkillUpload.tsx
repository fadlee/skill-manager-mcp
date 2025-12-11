/**
 * Skill Upload Component - ZIP file upload with preview and selection
 * Requirements: 1.1, 4.1, 4.2
 */

import { useState, useRef, useCallback } from 'react';
import type { ParseResult, ProcessResult, SkillPreview } from '../lib/api';
import { parseZipUpload, processSkillUpload } from '../lib/api';

type UploadStep = 'select-file' | 'preview' | 'importing' | 'complete';

interface SkillUploadProps {
  onUploadComplete?: (result: ProcessResult) => void;
  onClose?: () => void;
}

/**
 * Main upload component with state machine
 */
export function SkillUpload({ onUploadComplete, onClose }: SkillUploadProps) {
  const [step, setStep] = useState<UploadStep>('select-file');
  const [error, setError] = useState<string>();
  const [parseResult, setParseResult] = useState<ParseResult>();
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [processResult, setProcessResult] = useState<ProcessResult>();

  const handleFileSelect = useCallback(async (file: File) => {
    setError(undefined);
    setStep('preview');

    try {
      const result = await parseZipUpload(file);
      setParseResult(result);

      // Auto-select all valid skills
      const validSkills = result.skills
        .filter((s) => s.valid)
        .map((s) => s.name);
      setSelectedSkills(new Set(validSkills));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse ZIP');
      setStep('select-file');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult || selectedSkills.size === 0) return;

    setError(undefined);
    setStep('importing');

    try {
      const result = await processSkillUpload(
        parseResult.session_id,
        Array.from(selectedSkills)
      );
      setProcessResult(result);
      setStep('complete');
      onUploadComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import skills');
      setStep('preview');
    }
  }, [parseResult, selectedSkills, onUploadComplete]);

  const handleReset = useCallback(() => {
    setStep('select-file');
    setError(undefined);
    setParseResult(undefined);
    setSelectedSkills(new Set());
    setProcessResult(undefined);
  }, []);

  return (
    <div className="skill-upload">
      <div className="upload-header">
        <h3>Upload Skills</h3>
        {onClose && (
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}

      {step === 'select-file' && (
        <FileDropZone onFileSelect={handleFileSelect} />
      )}

      {step === 'preview' && parseResult && (
        <SkillPreviewList
          skills={parseResult.skills}
          selectedSkills={selectedSkills}
          onSelectionChange={setSelectedSkills}
          onImport={handleImport}
          onCancel={handleReset}
        />
      )}

      {step === 'importing' && (
        <div className="upload-loading">
          <div className="spinner" />
          <p>Importing skills...</p>
        </div>
      )}

      {step === 'complete' && processResult && (
        <SkillImportResult
          result={processResult}
          onUploadMore={handleReset}
          onClose={onClose}
        />
      )}
    </div>
  );
}


/**
 * File drop zone component
 * Requirements: 1.1, 4.1
 */
interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
}

function FileDropZone({ onFileSelect }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.zip')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="drop-zone-content">
        <span className="drop-icon">📦</span>
        <p>Drop ZIP file here or click to browse</p>
        <span className="drop-hint">Supports ZIP files up to 10MB</span>
      </div>
    </div>
  );
}

/**
 * Skill preview list with checkboxes
 * Requirements: 3.1, 3.2
 */
interface SkillPreviewListProps {
  skills: SkillPreview[];
  selectedSkills: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onImport: () => void;
  onCancel: () => void;
}

function SkillPreviewList({
  skills,
  selectedSkills,
  onSelectionChange,
  onImport,
  onCancel,
}: SkillPreviewListProps) {
  const validCount = skills.filter((s) => s.valid).length;
  const selectedCount = selectedSkills.size;

  const toggleSkill = (name: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    onSelectionChange(newSelected);
  };

  const selectAll = () => {
    const validSkills = skills.filter((s) => s.valid).map((s) => s.name);
    onSelectionChange(new Set(validSkills));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  return (
    <div className="skill-preview-list">
      <div className="preview-header">
        <span>
          {skills.length} skill(s) found, {validCount} valid
        </span>
        <div className="selection-actions">
          <button onClick={selectAll} className="link-button">
            Select all
          </button>
          <button onClick={selectNone} className="link-button">
            Select none
          </button>
        </div>
      </div>

      <div className="preview-items">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className={`preview-item ${!skill.valid ? 'invalid' : ''}`}
          >
            <label className="preview-checkbox">
              <input
                type="checkbox"
                checked={selectedSkills.has(skill.name)}
                onChange={() => toggleSkill(skill.name)}
                disabled={!skill.valid}
              />
              <span className="skill-name">{skill.name}</span>
            </label>
            <span className="file-count">{skill.file_count} files</span>
            {skill.description && (
              <p className="skill-description">{skill.description}</p>
            )}
            {!skill.valid && (
              <div className="validation-errors">
                {skill.errors.map((err, i) => (
                  <span key={i} className="error-message">
                    {err}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="preview-actions">
        <button onClick={onCancel} className="secondary-button">
          Cancel
        </button>
        <button
          onClick={onImport}
          className="primary-button"
          disabled={selectedCount === 0}
        >
          Import {selectedCount} skill(s)
        </button>
      </div>
    </div>
  );
}


/**
 * Import result display
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
interface SkillImportResultProps {
  result: ProcessResult;
  onUploadMore?: () => void;
  onClose?: () => void;
}

function SkillImportResult({
  result,
  onUploadMore,
  onClose,
}: SkillImportResultProps) {
  return (
    <div className="import-result">
      <div className="result-summary">
        <h4>Import Complete</h4>
        <p>
          {result.successful} of {result.total} skill(s) imported successfully
        </p>
      </div>

      <div className="result-items">
        {result.results.map((item) => (
          <div
            key={item.name}
            className={`result-item ${item.status === 'success' ? 'success' : 'failed'}`}
          >
            <span className="status-icon">
              {item.status === 'success' ? '✓' : '✗'}
            </span>
            <span className="skill-name">{item.name}</span>
            {item.status === 'success' && (
              <span className="version-badge">
                v{item.version} {item.is_new ? '(new)' : '(updated)'}
              </span>
            )}
            {item.status === 'failed' && item.error && (
              <span className="error-message">{item.error}</span>
            )}
          </div>
        ))}
      </div>

      <div className="result-actions">
        {onUploadMore && (
          <button onClick={onUploadMore} className="secondary-button">
            Upload More
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="primary-button">
            Done
          </button>
        )}
      </div>
    </div>
  );
}
