/**
 * File Editor Component
 */

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { SkillFile } from '../../shared/types';

interface FileEditorProps {
    file: SkillFile;
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
}

/**
 * Get language for Monaco editor
 */
function getLanguage(file: SkillFile): string {
    if (file.script_language) {
        return file.script_language;
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
        sh: 'shell',
        bash: 'shell',
        sql: 'sql',
        css: 'css',
        html: 'html',
    };

    return langMap[ext || ''] || 'plaintext';
}

export function FileEditor({ file, onSave, onCancel }: FileEditorProps) {
    const [content, setContent] = useState(file.content);
    const [saving, setSaving] = useState(false);

    // Update content when file changes
    useEffect(() => {
        setContent(file.content);
    }, [file.id, file.content]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(content);
        } finally {
            setSaving(false);
        }
    };

    const language = getLanguage(file);

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-medium flex items-center gap-2">
                    {file.path}
                    <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        Editing
                    </span>
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white border-none rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage={language}
                    language={language}
                    value={content}
                    onChange={(value) => setContent(value || '')}
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                        wordWrap: 'on',
                    }}
                />
            </div>
        </div>
    );
}
