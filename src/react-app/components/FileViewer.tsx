/**
 * File Viewer Component
 * Requirements: 11.3
 */

import type { SkillFile } from '../../shared/types';

interface FileViewerProps {
  file: SkillFile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Get language class for syntax highlighting hint
 */
function getLanguageClass(file: SkillFile): string {
  if (file.script_language) {
    return `language-${file.script_language}`;
  }

  // Infer from file extension
  const ext = file.path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    css: 'css',
    html: 'html',
  };

  return langMap[ext || ''] ? `language-${langMap[ext || '']}` : '';
}

/**
 * File Viewer Component
 */
export function FileViewer({ file, loading, error }: FileViewerProps) {
  if (loading) {
    return (
      <div className="file-viewer loading">
        <p>Loading file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-viewer error">
        <p>Error loading file: {error}</p>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  const languageClass = getLanguageClass(file);

  return (
    <div className="file-viewer">
      <div className="file-header">
        <span className="file-path">{file.path}</span>
        {file.is_executable && (
          <span className="executable-badge" title="Executable">
            ⚡ Executable
          </span>
        )}
        {file.script_language && (
          <span className="language-badge">{file.script_language}</span>
        )}
      </div>

      {file.run_instructions_for_ai && (
        <div className="run-instructions">
          <strong>AI Instructions:</strong>
          <p>{file.run_instructions_for_ai}</p>
        </div>
      )}

      <pre className={`file-content ${languageClass}`}>
        <code>{file.content}</code>
      </pre>
    </div>
  );
}
