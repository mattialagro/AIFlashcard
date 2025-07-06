import { User, Question, SavedQuiz, UserStats, Player } from '../types.ts';

// --- Chiavi per localStorage ---
const USERS_KEY = 'ai_quiz_users';
const CURRENT_USER_KEY = 'ai_quiz_current_user';
const QUIZZES_KEY_PREFIX = 'ai_quiz_quizzes_';
const STATS_KEY_PREFIX = 'ai_quiz_stats_';
const API_KEY_STORAGE_KEY = 'ai_quiz_api_key';


// --- Funzioni di Utilità per Storage ---
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToStorage = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};

// --- Gestione Chiave API ---
export const saveApiKey = (key: string): void => {
    saveToStorage(API_KEY_STORAGE_KEY, key);
};

export const getApiKey = (): string | null => {
    return getFromStorage<string | null>(API_KEY_STORAGE_KEY, null);
};

export const clearApiKey = (): void => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
};


// --- Gestione Utenti ---

// NOTA: In un'app reale, non salvare mai le password in chiaro! 
// Questo è solo per simulazione. Usa hashing (es. bcrypt).
type StoredUser = User & { passwordHash: string };

export const registerUser = (username: string, password: string): User => {
    const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username già esistente.');
    }
    const newUser: StoredUser = {
        id: new Date().toISOString() + Math.random(),
        username,
        passwordHash: password // Simulazione, NON FARE IN PRODUZIONE
    };
    users.push(newUser);
    saveToStorage(USERS_KEY, users);
    
    const userToReturn: User = { id: newUser.id, username: newUser.username };
    saveToStorage(CURRENT_USER_KEY, userToReturn);
    
    return userToReturn;
};

export const loginUser = (username: string, password: string): User | null => {
    const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password);
    if (foundUser) {
        const userToReturn: User = { id: foundUser.id, username: foundUser.username };
        saveToStorage(CURRENT_USER_KEY, userToReturn);
        return userToReturn;
    }
    return null;
};

export const getCurrentUser = (): User | null => {
    return getFromStorage<User | null>(CURRENT_USER_KEY, null);
};

export const clearCurrentUser = (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

// --- Gestione Quiz ---

export const saveQuizForUser = (userId: string, questions: Question[], name: string): void => {
    const quizzes = getQuizzesForUser(userId);
    const existingQuizIndex = quizzes.findIndex(q => q.name.trim().toLowerCase() === name.trim().toLowerCase());

    if (existingQuizIndex !== -1) {
        // Quiz con lo stesso nome trovato. Aggiorniamolo e spostiamolo in cima.
        const updatedQuiz = {
            ...quizzes[existingQuizIndex],
            questions: questions,
            createdAt: new Date().toISOString(), // Aggiorna la data
        };
        quizzes.splice(existingQuizIndex, 1); // Rimuovi il vecchio
        quizzes.unshift(updatedQuiz); // Aggiungi la versione aggiornata in cima
    } else {
        // Nessun quiz con questo nome, creane uno nuovo.
        const newQuiz: SavedQuiz = {
            id: new Date().toISOString() + Math.random(),
            name,
            createdAt: new Date().toISOString(),
            questions,
        };
        quizzes.unshift(newQuiz);
    }
    saveToStorage(QUIZZES_KEY_PREFIX + userId, quizzes);
};

export const getQuizzesForUser = (userId: string): SavedQuiz[] => {
    return getFromStorage<SavedQuiz[]>(QUIZZES_KEY_PREFIX + userId, []);
};

export const deleteQuizForUser = (userId: string, quizId: string): void => {
    let quizzes = getQuizzesForUser(userId);
    quizzes = quizzes.filter(q => q.id !== quizId);
    saveToStorage(QUIZZES_KEY_PREFIX + userId, quizzes);
};

// --- Gestione Statistiche ---

export const saveStatsForUser = (userId: string, stats: { millionaireResults: Player[] }): void => {
    const existingStats = getStatsForUser(userId);
    
    // Unisci i nuovi risultati con quelli esistenti
    const updatedResults = [
        ...stats.millionaireResults, 
        ...existingStats.millionaireResults
    ].slice(0, 20); // Mantieni solo gli ultimi 20 risultati

    const newStats: UserStats = {
        ...existingStats,
        millionaireResults: updatedResults
    };
    
    saveToStorage(STATS_KEY_PREFIX + userId, newStats);
};

export const getStatsForUser = (userId: string): UserStats => {
    return getFromStorage<UserStats>(STATS_KEY_PREFIX + userId, { millionaireResults: [] });
};