/**
 * Skill Manager App
 * Requirements: 10.1, 10.2, 11.1
 */

import { useState } from 'react';
import { SkillList } from './pages/SkillList';
import { SkillDetail } from './pages/SkillDetail';
import './App.css';
import './styles/skills.css';

type View = { type: 'list' } | { type: 'detail'; skillId: string };

function App() {
  const [view, setView] = useState<View>({ type: 'list' });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Skill Manager</h1>
      </header>
      <main className="app-main">
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
