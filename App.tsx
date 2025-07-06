import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen.tsx';
import FlashcardMode from './components/FlashcardMode.tsx';
import MillionaireHost from './components/MillionaireHost.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import WelcomeHeader from './components/WelcomeHeader.tsx';
import PageHeader from './components/PageHeader.tsx';
import ApiKeySetup from './components/ApiKeySetup.tsx';
import { User } from './types.ts';
import { getCurrentUser, clearCurrentUser, getApiKey, saveApiKey, clearApiKey } from './services/storageService.ts';

export type GameMode = 'welcome' | 'flashcards' | 'millionaire' | 'auth';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('auth');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setMode('welcome');
    }

    const storedApiKey = getApiKey();
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);
  
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setMode('welcome');
  };

  const handlePlayAsGuest = () => {
    setIsGuest(true);
    setCurrentUser(null);
    setMode('welcome');
  };

  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setIsGuest(false);
    setMode('auth');
  };

  const handleBackToMenu = () => {
    setMode('welcome');
  };

  const handleApiKeySave = (key: string) => {
    saveApiKey(key);
    setApiKey(key);
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKey(null);
  }

  const renderMode = () => {
    switch (mode) {
      case 'flashcards':
        return <FlashcardMode user={currentUser} apiKey={apiKey} />;
      case 'millionaire':
        return <MillionaireHost user={currentUser} apiKey={apiKey} />;
      case 'welcome':
      default:
        return <WelcomeScreen onSelectMode={setMode} />;
    }
  };
  
  if (!apiKey) {
    return (
      <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
        <main className="w-full flex-grow flex items-center justify-center">
            <ApiKeySetup onApiKeySave={handleApiKeySave} />
        </main>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
        <main className="w-full flex-grow flex items-center justify-center">
          <AuthScreen onLogin={handleLogin} onPlayAsGuest={handlePlayAsGuest} />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center p-4">
      <header className="w-full max-w-6xl mx-auto mb-8">
        {mode === 'welcome' ? (
          <WelcomeHeader user={currentUser} onLogout={handleLogout} onClearApiKey={handleClearApiKey} />
        ) : (
          <PageHeader onBack={handleBackToMenu} onClearApiKey={handleClearApiKey} />
        )}
      </header>
      <main className="w-full flex-grow flex items-center justify-center">
        {renderMode()}
      </main>
    </div>
  );
};

export default App;