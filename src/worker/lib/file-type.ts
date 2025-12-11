/**
 * File type detection utilities for ZIP upload processing
 * Requirements: 6.1, 6.2, 6.3
 */

/**
 * Mapping of executable file extensions to their script languages
 */
const EXECUTABLE_EXTENSIONS: Record<string, string> = {
  '.py': 'python',
  '.sh': 'bash',
  '.js': 'javascript',
  '.ts': 'typescript',
};

/**
 * Check if a file path has an executable extension
 * @param path - File path to check
 * @returns true if the file has an executable extension
 */
export function isExecutable(path: string): boolean {
  const ext = getExtension(path);
  return ext !== null && ext in EXECUTABLE_EXTENSIONS;
}

/**
 * Get the script language for a file based on its extension
 * @param path - File path to check
 * @returns Script language string or null if not an executable file
 */
export function getScriptLanguage(path: string): string | null {
  const ext = getExtension(path);
  if (ext === null) return null;
  return EXECUTABLE_EXTENSIONS[ext] ?? null;
}

/**
 * Extract file extension from a path (lowercase)
 * @param path - File path
 * @returns Extension including dot (e.g., '.ts') or null if no extension
 */
function getExtension(path: string): string | null {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  
  // No dot, or dot is before the last path separator (hidden file in directory)
  if (lastDot === -1 || lastDot < lastSlash) {
    return null;
  }
  
  return path.slice(lastDot).toLowerCase();
}

/**
 * Check if content appears to be binary (non-text) data
 * Uses heuristic: checks for null bytes and high ratio of non-printable characters
 * @param content - Uint8Array of file content
 * @returns true if the content appears to be binary
 */
export function isBinary(content: Uint8Array): boolean {
  // Empty files are considered text
  if (content.length === 0) return false;
  
  // Check first 8KB for binary indicators (sufficient for detection)
  const checkLength = Math.min(content.length, 8192);
  let nonPrintableCount = 0;
  
  for (let i = 0; i < checkLength; i++) {
    const byte = content[i];
    
    // Null byte is a strong indicator of binary content
    if (byte === 0) return true;
    
    // Count non-printable characters (excluding common whitespace)
    // Printable ASCII: 32-126, plus tab (9), newline (10), carriage return (13)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintableCount++;
    }
    if (byte > 126 && byte < 160) {
      // Control characters in extended ASCII
      nonPrintableCount++;
    }
  }
  
  // If more than 10% non-printable, consider it binary
  return nonPrintableCount / checkLength > 0.1;
}
