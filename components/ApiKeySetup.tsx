import React, { useState } from 'react';
import { KeyIcon } from './Icons.tsx';

interface ApiKeySetupProps {
  onApiKeySave: (key: string) => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('La chiave API non può essere vuota.');
      return;
    }
    setError(null);
    onApiKeySave(apiKey);
  };

  return (
    <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-lg mx-auto w-full border border-slate-700">
      <div className="flex justify-center items-center mb-4">
          <KeyIcon className="w-8 h-8 text-indigo-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">Configura la tua API Key</h1>
      </div>
      <p className="text-slate-400 mb-6">
        Per utilizzare le funzionalità IA di questa applicazione, è necessaria una chiave API di Google Gemini.
      </p>

       <div className="text-left text-sm bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-6">
        <p className="text-slate-300">
            Puoi {' '}
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
            >
                ottenere una chiave API gratuita
            </a>
            {' '} dal Google AI Studio.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="password"
          placeholder="Incolla la tua chiave API qui"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          aria-label="Google Gemini API Key"
        />
        <button
          type="submit"
          className="w-full px-6 py-3 font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
        >
          Salva e Continua
        </button>
      </form>
      {error && <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
    </div>
  );
};

export default ApiKeySetup;