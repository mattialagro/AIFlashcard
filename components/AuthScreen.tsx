import React, { useState } from 'react';
import { User } from '../types.ts';
import { registerUser, loginUser } from '../services/storageService.ts';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onPlayAsGuest: () => void;
}

type AuthMode = 'choice' | 'login' | 'register';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onPlayAsGuest }) => {
  const [mode, setMode] = useState<AuthMode>('choice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Username e password non possono essere vuoti.');
      return;
    }
    try {
      const newUser = registerUser(username, password);
      onLogin(newUser);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Si è verificato un errore sconosciuto.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = loginUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Credenziali non valide.');
      }
    } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Si è verificato un errore sconosciuto.');
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'login':
        return (
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <h2 className="text-2xl font-bold text-white text-center">Login</h2>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full px-6 py-3 font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              Accedi
            </button>
            <button onClick={() => setMode('choice')} className="w-full text-center text-sm text-slate-400 hover:text-white mt-2">
              Indietro
            </button>
          </form>
        );
      case 'register':
        return (
          <form onSubmit={handleRegister} className="w-full space-y-4">
            <h2 className="text-2xl font-bold text-white text-center">Registrati</h2>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full px-6 py-3 font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              Registrati
            </button>
             <button onClick={() => setMode('choice')} className="w-full text-center text-sm text-slate-400 hover:text-white mt-2">
              Indietro
            </button>
          </form>
        );
      case 'choice':
      default:
        return (
          <div className="w-full flex flex-col space-y-4">
            <button
              onClick={() => setMode('login')}
              className="w-full px-6 py-4 text-lg font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className="w-full px-6 py-4 text-lg font-semibold rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-all"
            >
              Registrati
            </button>
             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-600"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-sm">O</span>
                <div className="flex-grow border-t border-slate-600"></div>
            </div>
            <button
              onClick={onPlayAsGuest}
              className="w-full px-6 py-3 text-md font-semibold rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all"
            >
              Continua come Ospite
            </button>
          </div>
        );
    }
  };

  return (
    <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-sm mx-auto w-full border border-slate-700">
      <h1 className="text-4xl font-bold text-white mb-2">AI Quiz Suite</h1>
      <p className="text-slate-400 mb-8">Accedi per salvare i tuoi progressi o gioca come ospite.</p>
      {renderContent()}
      {error && <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
    </div>
  );
};

export default AuthScreen;