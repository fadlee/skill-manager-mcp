/**
 * Login Component - API key input for authentication
 */

import { useState } from 'react';
import { setApiKey } from '../lib/api';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [apiKey, setApiKeyValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setApiKey(apiKey.trim());
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 text-center m-0 mb-2">Skill Manager</h2>
        <p className="text-gray-600 text-center m-0 mb-6">Enter your API key to continue</p>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="apiKey" className="block mb-2 text-gray-900 font-medium">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder="Enter your API key"
              autoFocus
              className="w-full px-3 py-3 border border-gray-300 rounded text-base box-border focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full px-3 py-3 bg-blue-600 text-white border-none rounded text-base cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
