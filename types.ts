export interface Question {
  id?: string; // Opzionale, per l'identificazione nel DB
  argomento: string;
  domanda: string;
  risposte: string[];
  risposta_corretta: string;
}

export interface QuizQuestion extends Question {
  shuffledAnswers: string[];
}

// --- Tipi per la modalità Milionario ---

export interface MillionaireQuestion {
  domanda: string;
  risposte: string[];
  risposta_corretta: string;
}

export interface Lifelines {
  fiftyFifty: boolean;
  phoneAFriend: boolean;
  askTheAudience: boolean;
}

export interface Player {
  name: string;
  prize: number;
  currentQuestionIndex: number;
  lifelines: Lifelines;
  walkedAway: boolean;
  isFinished: boolean; // Indica se il turno del giocatore è terminato
}

// --- Tipi per la gestione Utenti ---
export interface User {
  id: string;
  username: string;
}

export interface SavedQuiz {
  id: string;
  name: string;
  createdAt: string;
  questions: Question[];
}

export interface UserStats {
  millionaireResults: Player[];
}
