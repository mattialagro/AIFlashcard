import React from 'react';
import { KeyIcon } from './Icons.tsx';

interface PageHeaderProps {
    onBack: () => void;
    onClearApiKey: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ onBack, onClearApiKey }) => {
    return (
        <div className="w-full flex justify-between items-center">
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Torna al menu principale
            </button>
            <button
                onClick={onClearApiKey}
                className="p-2 text-sm font-semibold rounded-md text-slate-400 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
                aria-label="Cambia API Key"
            >
                <KeyIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default PageHeader;