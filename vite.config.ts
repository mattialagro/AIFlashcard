// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // <-- IMPORTA IL PLUGIN REACT
import path from 'path';

export default defineConfig(({ mode }) => {
    // Carica le variabili d'ambiente dal file .env
    const env = loadEnv(mode, process.cwd(), '');

    return {
      // PLUGINS: Aggiungi il plugin di React
      plugins: [react()],
      
      // BASE: Fondamentale per il deploy su GitHub Pages
      // Sostituisci 'AI_Flashcard' con il nome esatto del tuo repo
      base: '/AIFlashcard/', 
      
      // DEFINE: La tua configurazione per le variabili d'ambiente (è corretta)
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        // Nota: `process.env.API_KEY` è ridondante se usi già `process.env.GEMINI_API_KEY`
      },
      
      // RESOLVE: La tua configurazione per gli alias (è corretta)
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Consiglio: punta a './src' invece che a '.'
        }
      }
    };
});