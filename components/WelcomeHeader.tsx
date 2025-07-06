import React from 'react';
import { User } from '../types.ts';
import { KeyIcon } from './Icons.tsx';

interface WelcomeHeaderProps {
    user: User | null;
    onLogout: () => void;
    onClearApiKey: () => void;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ user, onLogout, onClearApiKey }) => {
    return (
        <div className="w-full flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 shadow-lg">
            <div>
                <span className="text-slate-400">
                    {user ? 'Benvenuto, ' : 'Stai giocando come Ospite'}
                </span>
                {user && <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-400 ml-1">{user.username}</span>}
            </div>
            <div className="flex items-center gap-4">
                 <button
                    onClick={onClearApiKey}
                    className="p-2 text-sm font-semibold rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
                    aria-label="Cambia API Key"
                >
                    <KeyIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors shadow-md hover:shadow-lg"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default WelcomeHeader;