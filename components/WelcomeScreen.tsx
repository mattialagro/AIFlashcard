import React from 'react';
import { GameMode } from '../App';

interface WelcomeScreenProps {
  onSelectMode: (mode: 'flashcards' | 'millionaire') => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectMode }) => {
  return (
    <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-lg mx-auto border border-slate-700 animate-fade-in">
      <h1 className="text-4xl font-bold text-white mb-2">Benvenuto!</h1>
      <p className="text-slate-400 mb-8">Scegli una modalità di gioco per iniziare.</p>
      <div className="flex flex-col space-y-4">
        <button
          onClick={() => onSelectMode('flashcards')}
          className="w-full px-6 py-4 text-lg font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
        >
          Flashcard Classiche
        </button>
        <button
          onClick={() => onSelectMode('millionaire')}
          className="w-full px-6 py-4 text-lg font-semibold rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-all duration-300 transform hover:scale-105"
        >
          Chi vuol essere Milionario?
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
