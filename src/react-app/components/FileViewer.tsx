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
      <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center min-h-48 text-gray-600">
        <p>Loading file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center min-h-48 text-gray-600">
        <p>Error loading file: {error}</p>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  const languageClass = getLanguageClass(file);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="font-medium flex-1">{file.path}</span>
        {file.is_executable && (
          <span 
            className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800"
            title="Executable"
          >
            ⚡ Executable
          </span>
        )}
        {file.script_language && (
          <span className="text-xs px-2 py-1 rounded bg-gray-200">
            {file.script_language}
          </span>
        )}
      </div>

      {file.run_instructions_for_ai && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 text-sm">
          <strong className="block mb-1">AI Instructions:</strong>
          <p className="m-0">{file.run_instructions_for_ai}</p>
        </div>
      )}

      <pre className={`m-0 p-4 overflow-x-auto font-mono text-sm leading-6 bg-gray-50 ${languageClass}`}>
        <code>{file.content}</code>
      </pre>
    </div>
  );
}
