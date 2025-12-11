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
    <div className="login-container">
      <div className="login-card">
        <h2>Skill Manager</h2>
        <p className="login-subtitle">Enter your API key to continue</p>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder="Enter your API key"
              autoFocus
            />
          </div>
          
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
