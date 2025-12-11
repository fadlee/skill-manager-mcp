/**
 * Skill Manager App
 * Requirements: 10.1, 10.2, 11.1
 */

import { useState } from 'react';
import { SkillList } from './pages/SkillList';
import { SkillDetail } from './pages/SkillDetail';
import { Login } from './components/Login';
import { isAuthenticated, clearApiKey } from './lib/api';

type View = { type: 'list' } | { type: 'detail'; skillId: string };

function App() {
  const [view, setView] = useState<View>({ type: 'list' });
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  const handleLogin = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    clearApiKey();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 m-0">Skill Manager</h1>
        <button 
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 transition-colors"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>
      <main className="p-4">
        {view.type === 'list' ? (
          <SkillList onSelectSkill={(skillId) => setView({ type: 'detail', skillId })} />
        ) : (
          <SkillDetail
            skillId={view.skillId}
            onBack={() => setView({ type: 'list' })}
          />
        )}
      </main>
    </div>
  );
}

export default App;
