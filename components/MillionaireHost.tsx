import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Player, MillionaireQuestion, User } from '../types.ts';
import { SparklesIcon, TrophyIcon, PhoneIcon, UsersIcon, CheckCircleIcon, XCircleIcon } from './Icons.tsx';
import { saveStatsForUser } from '../services/storageService.ts';

// --- Game Constants ---
const PRIZE_LADDER = [
    100, 200, 300, 500, 1000, // 1000 is a safe haven
    2000, 4000, 8000, 16000, 32000, // 32000 is a safe haven
    64000, 125000, 250000, 500000, 1000000
];
const SAFE_HAVENS = [0, 1000, 32000];
const TOTAL_QUESTIONS = 15;

type GameStage = 'setup' | 'playing' | 'results';
type LifelineType = 'fiftyFifty' | 'phoneAFriend' | 'askTheAudience';

// --- Type Definitions for Lifelines ---
type LifelineAudienceData = Record<string, number>;

type LifelineResult = {
    type: 'audience';
    data: LifelineAudienceData;
} | {
    type: 'phone' | 'error';
    data: string;
};

interface MillionaireHostProps {
    user: User | null;
    apiKey: string | null;
}

const MillionaireHost: React.FC<MillionaireHostProps> = ({ user, apiKey }) => {
    const [stage, setStage] = useState<GameStage>('setup');
    const [players, setPlayers] = useState<Player[]>([]);
    const [questions, setQuestions] = useState<MillionaireQuestion[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const ai = useMemo(() => {
        if (!apiKey) return null;
        try {
            return new GoogleGenAI({ apiKey });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI", e);
            return null;
        }
    }, [apiKey]);

    const generateMillionaireQuiz = useCallback(async (topic: string) => {
        setIsGenerating(true);
        setError(null);
        
        if (!ai) {
            setError("Impossibile generare il quiz. La chiave API non è configurata.");
            setIsGenerating(false);
            setStage('setup');
            return;
        }

        try {
            const prompt = `Sei un generatore di quiz per il gioco "Chi vuol essere milionario?". Crea un quiz di ${TOTAL_QUESTIONS} domande sul seguente argomento: "${topic}". Le domande devono avere difficoltà crescente. Fornisci solo l'array JSON, senza testo, commenti o markdown. Il JSON deve essere un array di ${TOTAL_QUESTIONS} oggetti. Ogni oggetto deve avere la struttura: { "domanda": string, "risposte": string[], "risposta_corretta": string }. L'array "risposte" deve contenere esattamente 4 opzioni. Assicurati che la risposta corretta sia una delle 4 opzioni.`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });
            
            if (!response.text) {
                throw new Error("Risposta dell'IA non valida o vuota.");
            }
            let jsonStr = response.text.trim();
            const fenceRegex = /```(\w*)?\s*\n?(.*?)\n?\s*```/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }

            const parsedData = JSON.parse(jsonStr);
            if (!Array.isArray(parsedData) || parsedData.length !== TOTAL_QUESTIONS) {
                throw new Error("L'IA ha generato un quiz con un numero di domande non valido.");
            }
            // Further validation can be added here
            setQuestions(parsedData);
            setStage('playing');

        } catch (err) {
            console.error(err);
            setError("Errore nella generazione del quiz. Controlla la tua chiave API e la connessione, poi riprova.");
            setStage('setup');
        } finally {
            setIsGenerating(false);
        }
    }, [ai]);

    const handleGameSetup = (num: number, names: string[], topic: string) => {
        const initialPlayers: Player[] = names.map(name => ({
            name,
            prize: 0,
            currentQuestionIndex: 0,
            lifelines: { fiftyFifty: true, phoneAFriend: true, askTheAudience: true },
            walkedAway: false,
            isFinished: false,
        }));
        setPlayers(initialPlayers);
        generateMillionaireQuiz(topic);
    };

    const handlePlayerFinished = (finalPrize: number, walkedAway: boolean = false) => {
        let allPlayersFinished = false;
        setPlayers(prev => {
            const newPlayers = [...prev];
            newPlayers[currentPlayerIndex] = {
                ...newPlayers[currentPlayerIndex],
                prize: finalPrize,
                walkedAway,
                isFinished: true
            };
            
            const nextPlayerIndex = newPlayers.findIndex((p, i) => i > currentPlayerIndex && !p.isFinished);
            
            if (nextPlayerIndex === -1) {
                allPlayersFinished = true;
            }
            return newPlayers;
        });

        const nextPlayerIndex = players.findIndex((p, i) => i > currentPlayerIndex && !p.isFinished);

        if (nextPlayerIndex !== -1) {
            setCurrentPlayerIndex(nextPlayerIndex);
        } else {
            // This is the end of the game for all players
            setStage('results');
             if(user) {
                // We need to read the latest state of players, so we use the functional update form of setPlayers
                setPlayers(currentPlayers => {
                    saveStatsForUser(user.id, { millionaireResults: currentPlayers });
                    return currentPlayers;
                });
            }
        }
    };

    if (isGenerating) {
        return (
            <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-lg mx-auto border border-slate-700">
                <SparklesIcon className="w-12 h-12 mx-auto text-teal-400 animate-pulse mb-4" />
                <h1 className="text-3xl font-bold text-white">Generazione del quiz in corso...</h1>
                <p className="text-slate-400 mt-2">L'IA sta preparando le tue domande!</p>
            </div>
        );
    }

    switch (stage) {
        case 'setup':
            return <SetupScreen onStart={handleGameSetup} error={error} user={user}/>;
        case 'playing':
            const currentPlayer = players[currentPlayerIndex];
            if (!currentPlayer || currentPlayer.isFinished) {
                 // This should not happen, but as a fallback
                if (players.every(p => p.isFinished)) setStage('results');
                return <div>Caricamento...</div>;
            }
            return (
                <GameScreen
                    key={currentPlayerIndex} // Force re-mount for each player
                    player={currentPlayer}
                    questions={questions}
                    onPlayerFinished={handlePlayerFinished}
                    ai={ai}
                />
            );
        case 'results':
            return <ResultsScreen players={players} onRestart={() => setStage('setup')} />;
        default:
            return <SetupScreen onStart={handleGameSetup} error={error} user={user} />;
    }
};

// --- Sub-components for MillionaireHost ---

const SetupScreen = ({ onStart, error, user }: { onStart: (num: number, names:string[], topic: string) => void, error: string | null, user: User | null }) => {
    const [numPlayers, setNumPlayers] = useState(1);
    const [playerNames, setPlayerNames] = useState([user?.username || 'Giocatore 1']);
    const [topic, setTopic] = useState('Cultura Generale');

    useEffect(() => {
        setPlayerNames(prev => {
            const newNames = [...prev];
            // Set first player name if user is logged in and it's a single player game
            if(numPlayers === 1 && user && newNames[0] !== user.username) {
                newNames[0] = user.username;
            }

            while (newNames.length < numPlayers) {
                newNames.push(`Giocatore ${newNames.length + 1}`);
            }
            return newNames.slice(0, numPlayers);
        });
    }, [numPlayers, user]);

    const handleNameChange = (index: number, name: string) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerNames.some(name => name.trim() === '') || topic.trim() === '') {
            alert("Per favore, compila tutti i nomi dei giocatori e l'argomento.");
            return;
        }
        onStart(numPlayers, playerNames, topic);
    };

    return (
        <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-2xl mx-auto border border-slate-700">
            <h1 className="text-4xl font-bold text-white mb-4">Chi vuol essere Milionario?</h1>
            <p className="text-slate-400 mb-8">Configura la tua partita.</p>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div>
                    <label htmlFor="numPlayers" className="block text-sm font-medium text-slate-300 mb-2">Numero di Giocatori</label>
                    <select id="numPlayers" value={numPlayers} onChange={e => setNumPlayers(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>

                <div className="space-y-3">
                    {playerNames.map((name, index) => (
                        <div key={index}>
                            <label htmlFor={`player${index}`} className="block text-sm font-medium text-slate-300 mb-1">{`Nome Giocatore ${index + 1}`}</label>
                            <input
                                type="text"
                                id={`player${index}`}
                                value={name}
                                onChange={e => handleNameChange(index, e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>
                
                 <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">Argomento del Quiz</label>
                     <input
                        type="text"
                        id="topic"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                </div>

                {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{error}</p>}

                <button type="submit" className="w-full mt-4 px-6 py-3 font-semibold rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-all transform hover:scale-105">
                    Inizia a Giocare!
                </button>
            </form>
        </div>
    );
};

interface GameScreenProps {
    player: Player;
    questions: MillionaireQuestion[];
    onPlayerFinished: (prize: number, walkedAway?: boolean) => void;
    ai: GoogleGenAI | null;
}

const GameScreen: React.FC<GameScreenProps> = ({ player, questions, onPlayerFinished, ai }) => {
    const [qIndex, setQIndex] = useState(player.currentQuestionIndex);
    const [currentLifelines, setCurrentLifelines] = useState(player.lifelines);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [disabledAnswers, setDisabledAnswers] = useState<string[]>([]);
    const [lifelineInUse, setLifelineInUse] = useState<LifelineResult | null>(null); // For audience/phone results

    const currentQuestion = questions[qIndex];

    const handleAnswerClick = (answer: string) => {
        if (selectedAnswer) return;
        setSelectedAnswer(answer);
        setTimeout(() => {
            const isCorrect = answer === currentQuestion.risposta_corretta;
            setFeedback(isCorrect ? 'correct' : 'incorrect');

            setTimeout(() => {
                if (isCorrect) {
                    if (qIndex === TOTAL_QUESTIONS - 1) { // Won the million
                        onPlayerFinished(PRIZE_LADDER[qIndex]);
                    } else {
                        setQIndex(prev => prev + 1);
                        setSelectedAnswer(null);
                        setFeedback(null);
                        setDisabledAnswers([]);
                    }
                } else { // Incorrect answer
                    const lastSafeHavenPrize = SAFE_HAVENS.slice().reverse().find(p => p <= (qIndex > 0 ? PRIZE_LADDER[qIndex - 1] : 0)) || 0;
                    onPlayerFinished(lastSafeHavenPrize);
                }
            }, 2000);
        }, 1000);
    };

    const handleWalkAway = () => {
        const currentPrize = qIndex > 0 ? PRIZE_LADDER[qIndex - 1] : 0;
        onPlayerFinished(currentPrize, true);
    };

    const useLifeline = async (type: LifelineType) => {
        if (!currentLifelines[type]) return;
        
        setCurrentLifelines(prev => ({ ...prev, [type]: false }));

        if (!ai) {
             setLifelineInUse({type: 'error', data: "Aiuto non disponibile. Controlla la tua chiave API."});
             return;
        }

        try {
            if (type === 'fiftyFifty') {
                const wrongAnswers = currentQuestion.risposte.filter(r => r !== currentQuestion.risposta_corretta);
                const shuffled = wrongAnswers.sort(() => 0.5 - Math.random());
                setDisabledAnswers(shuffled.slice(0, 2));
            } else if (type === 'askTheAudience') {
                const prompt = `Simula un sondaggio "Chiedi al Pubblico" per il quiz "Chi vuol essere milionario?". La domanda è: "${currentQuestion.domanda}". Le opzioni sono: ${currentQuestion.risposte.join(', ')}. La risposta corretta è "${currentQuestion.risposta_corretta}". Genera un oggetto JSON con le chiavi corrispondenti alle opzioni di risposta e i valori percentuali del voto. La risposta corretta deve avere la % più alta. La somma totale deve essere 100. Fornisci solo l'oggetto JSON.`;
                const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt, config: { responseMimeType: "application/json" } });
                
                if (!response.text) {
                    setLifelineInUse({ type: 'error', data: "Risposta dell'IA non valida o vuota." });
                    return;
                }
                let jsonStr = response.text.trim();
                const fenceRegex = /```(\w*)?\s*\n?(.*?)\n?\s*```/s;
                const match = jsonStr.match(fenceRegex);
                if (match && match[2]) {
                    jsonStr = match[2].trim();
                }

                const result = JSON.parse(jsonStr) as LifelineAudienceData;
                setLifelineInUse({ type: 'audience', data: result });
            } else if (type === 'phoneAFriend') {
                const prompt = `Sei un "amico" nel quiz "Chi vuol essere milionario?". La domanda è: "${currentQuestion.domanda}". Le opzioni sono: ${currentQuestion.risposte.join(', ')}. La risposta corretta è "${currentQuestion.risposta_corretta}". Dai un consiglio colloquiale, suggerendo la risposta che pensi sia giusta ma con un po' di incertezza. Non dire mai di sapere la risposta per certo. Rispondi in italiano.`;
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview-04-17', contents: prompt });
                setLifelineInUse({ type: 'phone', data: response.text ?? "" });
            }
        } catch (e) {
            console.error("Error using lifeline:", e);
            setLifelineInUse({type: 'error', data: "Spiacenti, l'aiuto non è disponibile. Controlla la tua chiave API e la connessione."})
        }
    };
    
    const getAnswerClass = (answer: string) => {
        if (selectedAnswer) {
            if (answer === currentQuestion.risposta_corretta) return 'bg-green-500 animate-pulse';
            if (answer === selectedAnswer) return 'bg-red-500';
            return 'opacity-50';
        }
        if (disabledAnswers.includes(answer)) return 'opacity-0 invisible';
        return 'bg-slate-700 hover:bg-teal-600';
    };

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 p-4">
             {lifelineInUse && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setLifelineInUse(null)}>
                    <div className="bg-slate-800 border border-teal-500 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-teal-400 mb-4">{lifelineInUse.type === 'audience' ? 'Il Pubblico ha votato!' : 'Telefonata a Casa'}</h3>
                        {lifelineInUse.type === 'audience' && (
                            <div className="space-y-2">
                                {Object.entries(lifelineInUse.data).map(([option, value]) => (
                                    <div key={option}>
                                        <div className="flex justify-between text-white mb-1">
                                            <span>{option}</span>
                                            <span>{value}%</span>
                                        </div>
                                        <div className="w-full bg-slate-600 rounded-full h-4">
                                            <div className="bg-teal-500 h-4 rounded-full" style={{ width: `${value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {lifelineInUse.type === 'phone' && <p className="text-slate-300 italic">"{lifelineInUse.data}"</p>}
                        {lifelineInUse.type === 'error' && <p className="text-red-400">{lifelineInUse.data}</p>}
                        <button onClick={() => setLifelineInUse(null)} className="mt-6 w-full bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700">Chiudi</button>
                    </div>
                </div>
            )}
            {/* Left side: Question and Answers */}
            <div className="flex-grow flex flex-col items-center">
                 <h2 className="text-xl text-center text-slate-300 mb-2">Turno di: <span className="font-bold text-white text-2xl">{player.name}</span></h2>
                <div className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg p-6 mb-6">
                    <p className="text-center text-2xl lg:text-3xl font-semibold text-white">{currentQuestion.domanda}</p>
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.risposte.map((answer, i) => (
                        <button key={i} onClick={() => handleAnswerClick(answer)} disabled={!!selectedAnswer || disabledAnswers.includes(answer)} className={`p-4 rounded-lg text-lg text-white text-left transition-all duration-300 ${getAnswerClass(answer)}`}>
                           <span className="font-bold text-teal-400 mr-2">{String.fromCharCode(65 + i)}:</span> {answer}
                        </button>
                    ))}
                </div>
                <div className="mt-8 flex w-full justify-center">
                    <button onClick={handleWalkAway} disabled={!!selectedAnswer} className="px-8 py-3 rounded-md bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
                        Abbandona
                    </button>
                </div>
            </div>

            {/* Right side: Prize Ladder and Lifelines */}
            <div className="w-full lg:w-80 flex-shrink-0">
                 <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-center text-xl font-bold text-teal-400 mb-4">Aiuti</h3>
                    <div className="flex justify-around">
                        <LifelineButton icon={<SparklesIcon/>} label="50:50" enabled={currentLifelines.fiftyFifty} onClick={() => useLifeline('fiftyFifty')} />
                        <LifelineButton icon={<UsersIcon/>} label="Pubblico" enabled={currentLifelines.askTheAudience} onClick={() => useLifeline('askTheAudience')} />
                        <LifelineButton icon={<PhoneIcon/>} label="Amico" enabled={currentLifelines.phoneAFriend} onClick={() => useLifeline('phoneAFriend')} />
                    </div>
                </div>
                <div className="mt-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <ul className="flex flex-col-reverse text-lg">
                        {PRIZE_LADDER.map((prize, i) => (
                            <li key={prize} className={`px-4 py-1 rounded transition-colors duration-300 ${qIndex === i ? 'bg-teal-500 text-black font-bold' : 'text-white'} ${SAFE_HAVENS.includes(prize) ? 'font-bold text-amber-300' : ''}`}>
                                <span className="mr-4 text-slate-400">{TOTAL_QUESTIONS - i}</span> {prize.toLocaleString('it-IT')} €
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const LifelineButton = ({icon, label, enabled, onClick}:{icon:React.ReactElement<{className?: string}>, label:string, enabled:boolean, onClick:()=>void}) => (
    <button disabled={!enabled} onClick={onClick} className="flex flex-col items-center group disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
        <div className={`relative w-16 h-16 rounded-full border-2 ${enabled ? 'border-teal-400 text-teal-400 group-hover:bg-teal-400/20' : 'border-slate-600 text-slate-600'} flex items-center justify-center transition-all`}>
            {React.cloneElement(icon, { className: "w-8 h-8" })}
            {!enabled && <div className="absolute inset-0 flex items-center justify-center"><XCircleIcon className="w-12 h-12 text-red-500/80"/></div>}
        </div>
        <span className={`mt-2 text-xs font-semibold transition-colors ${enabled ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
    </button>
);


const ResultsScreen = ({ players, onRestart }: { players: Player[], onRestart: () => void }) => {
    return (
        <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-2xl mx-auto border border-slate-700">
            <TrophyIcon className="w-16 h-16 mx-auto text-amber-400 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">Partita Terminata!</h1>
            <div className="space-y-4 my-8">
                {players.sort((a,b) => b.prize - a.prize).map(p => (
                    <div key={p.name} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg">
                        <span className="text-xl font-semibold text-white">{p.name}</span>
                        <span className="text-2xl font-bold text-teal-400">{p.prize.toLocaleString('it-IT')} €</span>
                    </div>
                ))}
            </div>
            <div className="mt-8">
                <button onClick={onRestart} className="w-full px-6 py-3 font-semibold rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-all">
                    Gioca Ancora
                </button>
            </div>
        </div>
    );
};


export default MillionaireHost;