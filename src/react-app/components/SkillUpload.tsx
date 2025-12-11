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
    <div className="bg-white rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 m-0">Upload Skills</h3>
        {onClose && (
          <button 
            className="bg-none border-none text-2xl text-gray-600 cursor-pointer px-2 py-1 leading-none hover:text-gray-900"
            onClick={onClose} 
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Importing skills...</p>
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
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">📦</span>
        <p className="text-lg text-gray-900 m-0">Drop ZIP file here or click to browse</p>
        <span className="text-sm text-gray-500">Supports ZIP files up to 10MB</span>
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center text-gray-600 text-sm">
        <span>
          {skills.length} skill(s) found, {validCount} valid
        </span>
        <div className="flex gap-4">
          <button onClick={selectAll} className="text-blue-600 hover:underline cursor-pointer text-sm p-0 bg-none border-none">
            Select all
          </button>
          <button onClick={selectNone} className="text-blue-600 hover:underline cursor-pointer text-sm p-0 bg-none border-none">
            Select none
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className={`border rounded px-4 py-3 ${
              !skill.valid 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSkills.has(skill.name)}
                onChange={() => toggleSkill(skill.name)}
                disabled={!skill.valid}
                className="w-4 h-4"
              />
              <span className="font-medium text-gray-900">{skill.name}</span>
            </label>
            <span className="float-right text-gray-500 text-sm">{skill.file_count} files</span>
            {skill.description && (
              <p className="text-gray-600 text-sm mt-2 ml-6 mb-0">{skill.description}</p>
            )}
            {!skill.valid && (
              <div className="mt-2 ml-6">
                {skill.errors.map((err, i) => (
                  <span key={i} className="block text-red-600 text-sm">
                    {err}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-2">
        <button 
          onClick={onCancel} 
          className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onImport}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-blue-600 text-white border-none rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900 m-0 mb-2">Import Complete</h4>
        <p className="text-gray-600 m-0">
          {result.successful} of {result.total} skill(s) imported successfully
        </p>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {result.results.map((item) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 px-4 py-3 rounded flex-wrap ${
              item.status === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <span className={`font-bold ${
              item.status === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {item.status === 'success' ? '✓' : '✗'}
            </span>
            <span className="font-medium flex-1">{item.name}</span>
            {item.status === 'success' && (
              <span className="text-sm text-green-700">
                v{item.version} {item.is_new ? '(new)' : '(updated)'}
              </span>
            )}
            {item.status === 'failed' && item.error && (
              <span className="w-full mt-1 text-red-700 text-sm">{item.error}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3 mt-2">
        {onUploadMore && (
          <button 
            onClick={onUploadMore} 
            className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Upload More
          </button>
        )}
        {onClose && (
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-blue-600 text-white border-none rounded hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
