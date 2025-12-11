/**
 * ZIP Parser Service for extracting skill folders from ZIP files
 * Requirements: 1.2, 1.5, 6.3
 */

import { unzipSync } from 'fflate';
import { isBinary } from '../lib/file-type';

/**
 * Represents a single entry in a parsed ZIP file
 */
export interface ZipEntry {
  path: string;
  content: Uint8Array;
  isDirectory: boolean;
}

/**
 * Result of parsing a ZIP file
 */
export interface ParsedZip {
  files: ZipEntry[];
  totalSize: number;
}

/**
 * Represents an extracted file from a skill folder
 */
export interface ExtractedFile {
  path: string;           // relative path within skill folder
  content: string;        // text content (decoded)
  isBinary: boolean;      // true if binary file (content will be empty)
}

/**
 * Represents a skill folder extracted from a ZIP
 */
export interface SkillFolder {
  name: string;
  files: ExtractedFile[];
}

/**
 * Parse a ZIP file buffer and extract its contents
 * @param buffer - ArrayBuffer containing the ZIP file data
 * @returns ParsedZip with all entries and total size
 * @throws Error if the buffer is not a valid ZIP file
 */
export function parseZip(buffer: ArrayBuffer): ParsedZip {
  const uint8Array = new Uint8Array(buffer);
  
  // fflate.unzipSync returns an object with path keys and Uint8Array values
  const unzipped = unzipSync(uint8Array);
  
  const files: ZipEntry[] = [];
  let totalSize = 0;
  
  for (const [path, content] of Object.entries(unzipped)) {
    const isDirectory = path.endsWith('/');
    totalSize += content.length;
    
    files.push({
      path,
      content,
      isDirectory,
    });
  }
  
  return { files, totalSize };
}


/**
 * Extract skill folders from a parsed ZIP
 * Each root-level folder is treated as a separate skill
 * @param zip - ParsedZip result from parseZip
 * @returns Array of SkillFolder objects
 */
export function extractSkillFolders(zip: ParsedZip): SkillFolder[] {
  // Group files by their root folder
  const folderMap = new Map<string, ExtractedFile[]>();
  
  for (const entry of zip.files) {
    // Skip directory entries themselves
    if (entry.isDirectory) continue;
    
    // Get the root folder name (first path segment)
    const pathParts = entry.path.split('/');
    if (pathParts.length < 2) {
      // File at root level of ZIP, not in a folder - skip
      continue;
    }
    
    const rootFolder = pathParts[0];
    // Get relative path within the skill folder (excluding root folder name)
    const relativePath = pathParts.slice(1).join('/');
    
    if (!folderMap.has(rootFolder)) {
      folderMap.set(rootFolder, []);
    }
    
    // Check if file is binary
    const fileisBinary = isBinary(entry.content);
    
    // Decode text content or leave empty for binary
    let textContent = '';
    if (!fileisBinary) {
      textContent = decodeTextContent(entry.content);
    }
    
    folderMap.get(rootFolder)!.push({
      path: relativePath,
      content: textContent,
      isBinary: fileisBinary,
    });
  }
  
  // Convert map to array of SkillFolder objects
  const skillFolders: SkillFolder[] = [];
  for (const [name, files] of folderMap) {
    skillFolders.push({ name, files });
  }
  
  return skillFolders;
}

/**
 * Decode Uint8Array content to string (UTF-8)
 * @param content - Uint8Array of file content
 * @returns Decoded string
 */
function decodeTextContent(content: Uint8Array): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(content);
}

/**
 * Create a ZipParserService instance (factory function for consistency)
 */
export function createZipParserService() {
  return {
    parseZip,
    extractSkillFolders,
  };
}

export type ZipParserService = ReturnType<typeof createZipParserService>;
