import React, { useState, useCallback, ChangeEvent, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Question, QuizQuestion, User, SavedQuiz } from '../types.ts';
import { UploadIcon, CheckCircleIcon, XCircleIcon, TrophyIcon, SparklesIcon, TrashIcon } from './Icons.tsx';
import { saveQuizForUser, getQuizzesForUser, deleteQuizForUser } from '../services/storageService.ts';

type GameState = 'upload' | 'playing' | 'results';
type AnswerStatus = 'correct' | 'incorrect' | 'unanswered';

interface FlashcardModeProps {
    user: User | null;
    apiKey: string | null;
}

// --- Helper Functions ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};


// --- UI Components ---

interface UploadScreenProps {
  onFileLoad: (questions: Question[], topic?: string) => void;
  setError: (error: string | null) => void;
  error: string | null;
  onGenerateQuiz: (topic: string, instructions: string, numQuestions: number) => Promise<void>;
  isGeneratingQuiz: boolean;
  user: User | null;
  savedQuizzes: SavedQuiz[];
  onStartSavedQuiz: (questions: Question[]) => void;
  onDeleteQuiz: (quizId: string) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onFileLoad, error, setError, onGenerateQuiz, isGeneratingQuiz, user, savedQuizzes, onStartSavedQuiz, onDeleteQuiz }) => {
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File | undefined) => {
    if (!file) return;
    
    if(file.type !== 'application/json'){
      setError('Per favore, carica un file in formato .json.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Il file non può essere letto.");
        }
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
            throw new Error("Formato JSON non valido. Il file deve contenere un array principale di domande.");
        }

        for (let i = 0; i < data.length; i++) {
            const q = data[i];
            const questionNumber = i + 1;

            if (!q.domanda || typeof q.domanda !== 'string' || q.domanda.trim() === '') {
                throw new Error(`Domanda #${questionNumber}: la proprietà "domanda" è mancante, non è una stringa o è vuota.`);
            }
            if (!q.risposte || !Array.isArray(q.risposte) || q.risposte.length < 2) {
                throw new Error(`Domanda #${questionNumber}: la proprietà "risposte" deve essere un array con almeno due opzioni.`);
            }
            if (q.risposta_corretta === undefined || q.risposta_corretta === null) {
                throw new Error(`Domanda #${questionNumber}: la proprietà "risposta_corretta" è mancante.`);
            }
            if (!q.risposte.includes(q.risposta_corretta)) {
                throw new Error(`Domanda #${questionNumber}: la "risposta_corretta" ("${q.risposta_corretta}") non è presente nell'elenco delle "risposte".`);
            }
        }
        const quizTopic = (data[0] as Question)?.argomento || "Quiz Caricato";
        onFileLoad(data as Question[], quizTopic);
      } catch (err) {
        if (err instanceof Error) {
            setError(`Errore nel caricamento del file: ${err.message}`);
        } else {
            setError("Si è verificato un errore sconosciuto.");
        }
      }
    };
    reader.onerror = () => {
        setError("Impossibile leggere il file.");
    };
    reader.readAsText(file);
  };
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };
  
  const handleGenerateClick = (e: React.FormEvent) => {
    e.preventDefault();
    if(!topic.trim()) {
        setError("Per favore, inserisci un argomento per generare il quiz.");
        return;
    }
    onGenerateQuiz(topic, instructions, numQuestions);
  }

  return (
    <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-2xl mx-auto border border-slate-700">
      <h1 className="text-4xl font-bold text-white mb-2">Quiz Flashcards</h1>
      <p className="text-slate-400 mb-8">Carica un file JSON, generane uno con l'IA o carica un quiz salvato.</p>
      
      {user && savedQuizzes.length > 0 && (
          <div className="mb-8 p-6 border border-slate-700 rounded-lg bg-slate-900/50 text-left">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">I Miei Quiz Salvati</h2>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {savedQuizzes.map(quiz => (
                      <div key={quiz.id} className="flex items-center gap-2 group">
                          <button 
                              onClick={() => onStartSavedQuiz(quiz.questions)}
                              className="w-full text-left p-3 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors flex justify-between items-center flex-grow"
                          >
                              <span className="font-semibold text-white truncate">{quiz.name}</span>
                              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                          </button>
                           <button
                                onClick={() => onDeleteQuiz(quiz.id)}
                                className="p-2 rounded-md bg-slate-700 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                                aria-label={`Elimina quiz ${quiz.name}`}
                           >
                                <TrashIcon className="w-5 h-5"/>
                           </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="mb-8 p-6 border border-slate-700 rounded-lg bg-slate-900/50">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 mr-2 text-indigo-400" />
            Crea con l'IA
        </h2>
        <form onSubmit={handleGenerateClick}>
            <div className="space-y-4">
                <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Es: La storia di Roma"
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    aria-label="Argomento del quiz"
                />
                 <textarea 
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Istruzioni opzionali (es: 'concentrati sul periodo repubblicano')"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    aria-label="Istruzioni aggiuntive"
                />
                 <div>
                    <label htmlFor="num-questions" className="block text-sm font-medium text-slate-300 mb-2 text-left">Numero di domande</label>
                    <input 
                        id="num-questions"
                        type="number" 
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                        min="1"
                        max="20"
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        aria-label="Numero di domande da generare"
                    />
                 </div>
            </div>
            <button 
                type="submit"
                disabled={isGeneratingQuiz}
                className="mt-4 cursor-pointer group w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 disabled:bg-indigo-800 disabled:cursor-not-allowed"
            >
                {isGeneratingQuiz ? 'Generazione in corso...' : 'Genera Quiz'}
            </button>
        </form>
      </div>

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-slate-600"></div>
        <span className="flex-shrink mx-4 text-slate-400">O</span>
        <div className="flex-grow border-t border-slate-600"></div>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mt-5 p-8 border-2 border-dashed rounded-lg transition-colors duration-300 flex flex-col items-center justify-center text-center ${isDragging ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 bg-slate-900/50'}`}
      >
        <UploadIcon className="w-10 h-10 text-slate-500 mb-4" />
        <p className="font-semibold text-slate-300 mb-2">Trascina e rilascia il tuo file JSON qui</p>
        <p className="text-slate-500 text-sm mb-4">o, in alternativa</p>
        <label
          htmlFor="file-upload"
          className="cursor-pointer group inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-all"
        >
          Seleziona un File
        </label>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept=".json"
          onChange={handleFileChange}
        />
      </div>

      <div className="mt-8 text-left text-slate-500 text-sm p-4 border border-slate-700 rounded-lg bg-slate-900/50">
        <h3 className="font-semibold text-slate-300 mb-2">Formato JSON atteso:</h3>
        <pre className="whitespace-pre-wrap text-xs">
{`[
  {
    "argomento": "...",
    "domanda": "...",
    "risposte": ["...", "..."],
    "risposta_corretta": "..."
  }
]`}
        </pre>
      </div>

      {error && <p className="mt-6 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
    </div>
  );
};

interface ProgressBarProps {
    statuses: AnswerStatus[];
    currentIndex: number;
}
const ProgressBar: React.FC<ProgressBarProps> = ({ statuses, currentIndex }) => {
    return (
        <div className="progress-bar">
            {statuses.map((status, index) => {
                let bgColor = 'bg-slate-600'; // Default for unanswered
                if (status === 'correct') bgColor = 'bg-green-500';
                if (status === 'incorrect') bgColor = 'bg-red-500';
                
                const scale = index === currentIndex ? 'scale-110' : 'scale-100';
                const shadow = index === currentIndex ? 'shadow-lg shadow-white/20' : '';
                
                return (
                    <div 
                        key={index}
                        className={`progress-segment ${bgColor} ${scale} ${shadow} transform transition-all duration-300`}
                    />
                );
            })}
        </div>
    );
};

interface QuizCardProps {
  question: QuizQuestion;
  onAnswerSelect: (answer: string) => void;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  feedback: 'correct' | 'incorrect' | null;
  onNextQuestion: () => void;
  onGetExplanation: () => void;
  explanation: string | null;
  isFetchingExplanation: boolean;
  answerStatuses: AnswerStatus[];
  elapsedTime: number;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswerSelect, questionNumber, totalQuestions, selectedAnswer, feedback, onNextQuestion, onGetExplanation, explanation, isFetchingExplanation, answerStatuses, elapsedTime }) => {
  
  const getButtonClass = (answer: string) => {
    if (!selectedAnswer) {
      return "bg-slate-700 hover:bg-slate-600";
    }
    if (answer === selectedAnswer) {
      return feedback === 'correct' ? 'bg-green-500' : 'bg-red-500';
    }
    if (answer === question.risposta_corretta) {
      return 'bg-green-500';
    }
    return 'bg-slate-700 opacity-50';
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-700">
      <ProgressBar statuses={answerStatuses} currentIndex={questionNumber - 1} />
      <div className="relative flex justify-between items-start mb-6">
        <span className="text-sm font-semibold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">{question.argomento}</span>
        <div className="absolute top-0 right-0 flex flex-col items-end">
          <span className="text-sm font-medium text-slate-400">{`Domanda ${questionNumber} / ${totalQuestions}`}</span>
          <span className="text-lg font-mono text-white mt-1">{formatTime(elapsedTime)}</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-8 mt-4">{question.domanda}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.shuffledAnswers.map((answer, index) => (
          <button
            key={index}
            onClick={() => onAnswerSelect(answer)}
            disabled={!!selectedAnswer}
            className={`w-full p-4 rounded-lg text-left text-white font-medium transition-all duration-300 ${getButtonClass(answer)} disabled:cursor-not-allowed`}
          >
            {answer}
          </button>
        ))}
      </div>
       {feedback && (
            <div className={`mt-6 flex items-center justify-center p-3 rounded-lg ${feedback === 'correct' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {feedback === 'correct' ? <CheckCircleIcon className="w-6 h-6 mr-2" /> : <XCircleIcon className="w-6 h-6 mr-2" />}
                <span className="font-semibold">{feedback === 'correct' ? 'Corretto!' : 'Sbagliato!'}</span>
            </div>
        )}
      
       {selectedAnswer && (
        <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={onGetExplanation}
                    disabled={isFetchingExplanation || !!explanation}
                    className="w-full flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {isFetchingExplanation ? 'Caricamento...' : 'Approfondisci'}
                </button>
                 <button
                    onClick={onNextQuestion}
                    className="w-full flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Prossima Domanda
                </button>
            </div>
            {explanation && (
                <div className="mt-4 p-4 bg-slate-900/70 rounded-lg border border-slate-700 markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
                </div>
            )}
        </div>
       )}
    </div>
  );
};


interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  totalTime: number;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, totalQuestions, onRestart, totalTime }) => {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-lg mx-auto border border-slate-700">
      <TrophyIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
      <h1 className="text-4xl font-bold text-white mb-2">Quiz Completato!</h1>
      <p className="text-slate-400 mb-6">Ecco il tuo risultato finale.</p>
      <div className="bg-slate-900/50 p-6 rounded-lg mb-8 divide-y divide-slate-700">
        <div className="py-3">
            <p className="text-5xl font-bold text-white">{score} <span className="text-2xl text-slate-400">/ {totalQuestions}</span></p>
            <p className="text-lg font-medium text-indigo-400 mt-2">Corrette ({percentage}%)</p>
        </div>
        <div className="py-3">
             <p className="text-3xl font-bold text-white">{formatTime(totalTime)}</p>
             <p className="text-sm font-medium text-slate-400 mt-1">Tempo Totale</p>
        </div>
      </div>
      <div className="mt-8">
        <button
            onClick={onRestart}
            className="w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-all"
        >
            Gioca Ancora
        </button>
      </div>
    </div>
  );
};


// --- Main Component for this mode ---

const FlashcardMode: React.FC<FlashcardModeProps> = ({ user, apiKey }) => {
  const [gameState, setGameState] = useState<GameState>('upload');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isFetchingExplanation, setIsFetchingExplanation] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [answerStatuses, setAnswerStatuses] = useState<AnswerStatus[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  
  const ai = useMemo(() => {
    if (!apiKey) return null;
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI", e);
      return null;
    }
  }, [apiKey]);

  const refreshSavedQuizzes = useCallback(() => {
    if (user) {
        setSavedQuizzes(getQuizzesForUser(user.id));
    } else {
        setSavedQuizzes([]);
    }
  }, [user]);

  useEffect(() => {
    refreshSavedQuizzes();
  }, [refreshSavedQuizzes]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
        timerRef.current = window.setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }

    return () => {
        if(timerRef.current) clearInterval(timerRef.current);
    }
  }, [isTimerRunning]);


  const startQuiz = useCallback((loadedQuestions: Question[]) => {
    if (loadedQuestions.length === 0) {
      setError("Il quiz selezionato non contiene domande.");
      return;
    }

    const shuffledQuestions = shuffleArray(loadedQuestions);
    const questionsWithShuffledAnswers: QuizQuestion[] = shuffledQuestions.map(q => ({
      ...q,
      shuffledAnswers: shuffleArray(q.risposte),
    }));

    setQuizQuestions(questionsWithShuffledAnswers);
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setExplanation(null);
    setError(null);
    setAnswerStatuses(Array(questionsWithShuffledAnswers.length).fill('unanswered'));
    setElapsedTime(0);
    setIsTimerRunning(true);
  }, []);
  
  const handleFileLoad = useCallback((loadedQuestions: Question[], topic?: string) => {
    if (loadedQuestions.length === 0) {
        setError("Il file JSON non contiene domande valide.");
        return;
    }
     if (user) {
        saveQuizForUser(user.id, loadedQuestions, topic || "Quiz Caricato");
        refreshSavedQuizzes();
    }
    startQuiz(loadedQuestions);
  }, [user, startQuiz, refreshSavedQuizzes]);


  const handleAnswerSelect = useCallback((answer: string) => {
    if (selectedAnswer) return;

    const isCorrect = answer === quizQuestions[currentQuestionIndex].risposta_corretta;
    setSelectedAnswer(answer);
    
    setAnswerStatuses(prev => {
        const newStatuses = [...prev];
        newStatuses[currentQuestionIndex] = isCorrect ? 'correct' : 'incorrect';
        return newStatuses;
    });

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
    
    if (currentQuestionIndex === quizQuestions.length - 1) {
        setIsTimerRunning(false);
    }

  }, [currentQuestionIndex, quizQuestions, selectedAnswer]);
  
  const handleNextQuestion = useCallback(() => {
     if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setFeedback(null);
        setExplanation(null);
      } else {
        setIsTimerRunning(false);
        setGameState('results');
      }
  }, [currentQuestionIndex, quizQuestions.length]);

  const handleRestart = useCallback(() => {
    setGameState('upload');
    setQuizQuestions([]);
    setError(null);
    setIsTimerRunning(false);
    setElapsedTime(0);
  }, []);

  const handleGetExplanation = useCallback(async () => {
    if (!selectedAnswer) return;
    setIsFetchingExplanation(true);
    setExplanation(null);
    
    if (!ai) {
        setExplanation("Funzione non disponibile. Per favore, configura una chiave API valida.");
        setIsFetchingExplanation(false);
        return;
    }
    
    try {
        const question = quizQuestions[currentQuestionIndex];
        const isCorrect = selectedAnswer === question.risposta_corretta;

        const prompt = `Sei un assistente per quiz. Spiega brevemente perché la risposta "${selectedAnswer}" alla domanda "${question.domanda}" è ${isCorrect ? 'corretta' : 'sbagliata'}. La risposta corretta è "${question.risposta_corretta}". Rispondi in italiano. Usa il markdown per formattare la risposta (es. grassetto, elenchi puntati) per renderla più chiara. Non iniziare la risposta con "certo" o frasi simili, vai dritto al punto.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
        });

        setExplanation(response.text ?? "");

    } catch(err) {
        setExplanation("Impossibile generare una spiegazione. Verifica la tua chiave API e la connessione di rete.");
        console.error(err);
    } finally {
        setIsFetchingExplanation(false);
    }
  }, [selectedAnswer, currentQuestionIndex, quizQuestions, ai]);
  
  const handleGenerateQuiz = useCallback(async (topic: string, instructions: string, numQuestions: number) => {
    setIsGeneratingQuiz(true);
    setError(null);

    if (!ai) {
        setError("Impossibile generare il quiz. Per favore, configura una chiave API valida.");
        setIsGeneratingQuiz(false);
        return;
    }

    try {
        const prompt = `Sei un generatore di quiz. Crea un quiz in formato JSON basato su questo argomento: "${topic}".
Istruzioni aggiuntive: "${instructions || 'Nessuna'}".
Il JSON deve essere un array di ${numQuestions} oggetti.
Ogni oggetto deve avere esattamente questa struttura: { "argomento": string, "domanda": string, "risposte": string[], "risposta_corretta": string }.
L'array "risposte" deve contenere 4 opzioni, inclusa la risposta corretta.
L'argomento deve essere lo stesso per tutte le domande e corrispondere al topic fornito.
Fornisci solo l'array JSON, senza testo, commenti o markdown.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });
        
        if (!response.text) {
            throw new Error("La risposta dell'IA non contiene testo.");
        }
        let jsonStr = response.text.trim();
        const fenceRegex = /```(\w*)?\s*\n?(.*?)\n?\s*```/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        const parsedData = JSON.parse(jsonStr) as Question[];

        if (!Array.isArray(parsedData) || parsedData.length === 0 || parsedData.some(q => !q.domanda || !q.risposte || !q.risposta_corretta)) {
           throw new Error("L'IA ha generato un formato JSON non valido.");
        }
        
        if (user) {
            saveQuizForUser(user.id, parsedData, topic);
            refreshSavedQuizzes();
        }

        startQuiz(parsedData);

    } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            setError(`Errore nella generazione del quiz: ${err.message}. Controlla la tua chiave API.`);
        } else {
            setError("Si è verificato un errore sconosciuto. Controlla la tua chiave API e la connessione di rete.");
        }
    } finally {
        setIsGeneratingQuiz(false);
    }
  }, [startQuiz, user, refreshSavedQuizzes, ai]);

  const handleDeleteQuiz = useCallback((quizId: string) => {
      if (user) {
          deleteQuizForUser(user.id, quizId);
          refreshSavedQuizzes();
      }
  }, [user, refreshSavedQuizzes]);


  const renderContent = () => {
    switch (gameState) {
      case 'playing':
        const currentQuestion = quizQuestions[currentQuestionIndex];
        return currentQuestion ? (
          <QuizCard
            question={currentQuestion}
            onAnswerSelect={handleAnswerSelect}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quizQuestions.length}
            selectedAnswer={selectedAnswer}
            feedback={feedback}
            onNextQuestion={handleNextQuestion}
            onGetExplanation={handleGetExplanation}
            explanation={explanation}
            isFetchingExplanation={isFetchingExplanation}
            answerStatuses={answerStatuses}
            elapsedTime={elapsedTime}
          />
        ) : null;
      case 'results':
        return (
            <ResultsScreen 
                score={score} 
                totalQuestions={quizQuestions.length} 
                onRestart={handleRestart} 
                totalTime={elapsedTime}
            />
        );
      case 'upload':
      default:
        return (
            <UploadScreen 
                onFileLoad={handleFileLoad}
                error={error}
                setError={setError}
                onGenerateQuiz={handleGenerateQuiz}
                isGeneratingQuiz={isGeneratingQuiz}
                user={user}
                savedQuizzes={savedQuizzes}
                onStartSavedQuiz={startQuiz}
                onDeleteQuiz={handleDeleteQuiz}
            />
        );
    }
  };

  return <div className="relative w-full flex justify-center items-start">{renderContent()}</div>;
};

export default FlashcardMode;