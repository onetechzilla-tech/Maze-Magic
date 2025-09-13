import React, { useState, useEffect, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import Modal from './components/Modal';
import HelpModal from './components/HelpModal';
import GoogleSignInModal from './components/GoogleSignInModal';
import { AiChatTooltip } from './components/AiChatTooltip';
import { GameState, GameMode, Difficulty, Player, AiType, StartPosition } from './types';
import { authService } from './services/authService';
import { AnimatedMenuBackground } from './components/AnimatedMenuBackground';
import { soundService, Sound } from './services/soundService';

const TurnIndicator: React.FC<{player: Player}> = ({ player }) => (
    <div className="magical-container rounded-full px-4 py-2 flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: player.color, boxShadow: `0 0 6px ${player.color}` }}></div>
        <span className="font-semibold text-gray-200">{player.name}'s Turn</span>
    </div>
);

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

const TurnTimer: React.FC<{ turnTime: number; player: Player | undefined }> = ({ turnTime, player }) => {
    const turnTimeColor = !player ? 'text-gray-200' : 'text-white';
    const turnTimeClasses = `text-2xl font-bold transition-colors ${turnTime <= 10 ? 'text-red-400 animate-pulse' : turnTimeColor}`;

    return (
        <div className="text-center">
            <p className="text-sm font-medium text-gray-400">TURN TIME</p>
            <p className={turnTimeClasses} style={player ? {textShadow: `0 0 8px ${player.color}`} : {}}>{formatTime(turnTime)}</p>
        </div>
    );
};

const Celebration: React.FC = () => {
  const particles = Array.from({ length: 50 }); // More particles for a fuller effect
  const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#a855f7'];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-celebrate"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '-30px',
            width: `${Math.random() * 8 + 6}px`, // slightly larger
            height: `${Math.random() * 8 + 6}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            boxShadow: `0 0 8px ${colors[Math.floor(Math.random() * colors.length)]}`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${Math.random() * 3 + 3.5}s`,
            opacity: Math.random() * 0.6 + 0.4,
          }}
        />
      ))}
    </div>
  );
};

const BackButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    onClick={onClick}
    className={`absolute top-4 left-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white transition-all button-glow z-10 ${className}`}
    aria-label="Go back"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

const MuteButton: React.FC<{ isMuted: boolean; onClick: () => void; }> = ({ isMuted, onClick }) => (
    <button
        onClick={onClick}
        title={isMuted ? "Unmute" : "Mute"}
        className="fixed top-4 right-4 z-40 p-3 rounded-full bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-all button-glow"
        aria-label={isMuted ? "Unmute sound" : "Mute sound"}
    >
        {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l4-4m0 4l-4-4" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M20 4a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        )}
    </button>
);


const App: React.FC = () => {
    const {
        gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
        selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError, gameTime, turnTime,
        showRateLimitModal, wallPlacementError, setShowRateLimitModal, configuredTurnTime, startPosition,
        wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout, initialWalls,
        isMyTurn, pendingJoinId,
        startGame, handleCellClick, handleWallPreview, confirmWallPlacement, cancelWallPlacement,
        togglePlacingWall, returnToMenu, handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
        cancelAuth, cancelJoin,
    } = useGameLogic();

    type MenuScreen = 'main' | 'local_setup' | 'online_setup';
    const [menuScreen, setMenuScreen] = useState<MenuScreen>('main');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [isMuted, setIsMuted] = useState(soundService.isMuted);
    
    const gameBoardSizerRef = useRef<HTMLDivElement>(null);
    const [boardSize, setBoardSize] = useState(0);

    // Effect for timer tick sound
    const turnTimeRef = useRef(turnTime);
    useEffect(() => {
        if (isMyTurn && turnTime <= 5 && turnTime > 0 && turnTime < turnTimeRef.current) {
            soundService.play(Sound.TimerTick);
        }
        turnTimeRef.current = turnTime;
    }, [turnTime, isMyTurn]);
    
    useEffect(() => {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.classList.add('fade-out');
            setTimeout(() => {
                splashScreen.remove();
            }, 500); // Match CSS transition time
        }
    }, []);

    useEffect(() => {
        if (gameState !== GameState.PLAYING && gameState !== GameState.GAME_OVER) {
            return;
        }

        const calculateBoardSize = () => {
            if (gameBoardSizerRef.current) {
                const container = gameBoardSizerRef.current;
                const { width, height } = container.getBoundingClientRect();
                const size = Math.min(width, height);
                setBoardSize(size);
            }
        };
        
        calculateBoardSize();

        const resizeObserver = new ResizeObserver(calculateBoardSize);
        if (gameBoardSizerRef.current) {
            resizeObserver.observe(gameBoardSizerRef.current);
        }
        
        return () => {
            if (gameBoardSizerRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                resizeObserver.unobserve(gameBoardSizerRef.current);
            }
        };
    }, [gameState]);

    useEffect(() => {
        if (lastAiAction?.reasoning) {
            setAiMessage(lastAiAction.reasoning);
            const timer = setTimeout(() => setAiMessage(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [lastAiAction]);

    useEffect(() => {
        const message = apiError || wallPlacementError;
        if (message) {
            soundService.play(Sound.Error);
            setErrorToast(message);
            const timer = setTimeout(() => setErrorToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [apiError, wallPlacementError]);
    
    const handleToggleMute = () => {
        soundService.toggleMute();
        setIsMuted(soundService.isMuted);
    }

    const withSound = (onClick: (...args: any[]) => void, sound: Sound = Sound.UIClick) => {
        return (...args: any[]) => {
            soundService.play(sound);
            onClick(...args);
        };
    };

    const renderMenu = () => {
        const playerName = sessionStorage.getItem('playerName') || 'Player 1';

        switch(menuScreen) {
            case 'main':
                return <MainMenu onNavigate={withSound(setMenuScreen)} />;
            case 'local_setup':
                return (
                    <LocalGameSetup 
                      playerName={playerName}
                      onStartGame={(...args) => withSound(startGame)(...args)}
                      onBack={withSound(() => setMenuScreen('main'))}
                      setShowComingSoon={withSound(setShowComingSoon)}
                    />
                );
            case 'online_setup':
                return (
                    <OnlineGameSetup
                        playerName={playerName}
                        onCreateGame={(...args) => withSound(handleCreateOnlineGame)(...args)}
                        onJoinGame={(...args) => withSound(handleJoinOnlineGame)(...args)}
                        onFindMatch={(...args) => withSound(handleFindMatch)(...args)}
                        onBack={withSound(() => setMenuScreen('main'))}
                    />
                );
        }
    }
    
    if (gameState === GameState.MENU) {
        const playerName = sessionStorage.getItem('playerName') || 'Player 1';
        if (pendingJoinId) {
            return (
                <JoinGamePrompt
                    gameId={pendingJoinId}
                    initialPlayerName={playerName}
                    onJoin={(gameId, name) => {
                        sessionStorage.setItem('playerName', name);
                        withSound(handleJoinOnlineGame)(gameId, name);
                    }}
                    onCancel={withSound(cancelJoin)}
                />
            );
        }
        return (
            <>
                <MuteButton isMuted={isMuted} onClick={withSound(handleToggleMute)} />
                <AnimatedMenuBackground />

                {showHelp && <HelpModal onClose={withSound(() => setShowHelp(false))} />}
                
                {showComingSoon && (
                     <Modal title="Coming Soon!" onClose={withSound(() => setShowComingSoon(false))}>
                        <div className="text-center space-y-4">
                            <p className="text-gray-300 text-lg">The powerful Gemini AI opponent is under development and will be available in a future update. Stay tuned!</p>
                            <button onClick={withSound(() => setShowComingSoon(false))} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">OK</button>
                        </div>
                    </Modal>
                )}

                <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md magical-container p-6 md:p-8 rounded-2xl relative">
                        {renderMenu()}
                        <div className="mt-6">
                           <button onClick={withSound(() => setShowHelp(true))} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple transition-all text-lg">How to Play</button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    
    if (gameState === GameState.AWAITING_AUTH) {
        return <GoogleSignInModal onSignIn={withSound(() => authService.signIn())} onCancel={withSound(cancelAuth)} />;
    }
    
    const pageBackgroundClasses = "fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]";
    if ((gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) && (!players[1] || !players[2])) {
        return (
            <div className={pageBackgroundClasses}>
                <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    const currentPlayer = players[currentPlayerId];
    const myPlayer = players[1]; 
    const opponentPlayer = players[2];
    
    const aiPlayerName = players[2]?.name || 'AI';

    return (
        <>
            <MuteButton isMuted={isMuted} onClick={withSound(handleToggleMute)} />
            <main className={`h-screen max-h-[100dvh] w-full grid grid-rows-[auto_1fr_auto] p-2 sm:p-4 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)] overflow-hidden`}>
                <header className="w-full max-w-2xl flex-shrink-0 mx-auto">
                     <div className="flex justify-between items-center w-full">
                        <div className="relative flex-1">
                            <div className="inline-block relative">
                              {opponentPlayer && <PlayerInfo player={opponentPlayer} />}
                              {gameMode === GameMode.PVC && aiMessage && <AiChatTooltip message={aiMessage} />}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-sm font-medium text-gray-400">GAME TIME</p>
                            <p className="text-2xl font-bold text-gray-200">{formatTime(gameTime)}</p>
                        </div>
                        <div className="flex-1 flex justify-end">
                            {currentPlayer?.id === opponentPlayer?.id && <TurnTimer turnTime={turnTime} player={currentPlayer} />}
                        </div>
                    </div>
                </header>

                <div className="w-full flex flex-col items-center justify-center py-1 min-h-0">
                    <div className="h-12 flex items-center justify-center my-1 flex-shrink-0">
                      {aiThinking ? (
                         <div className="magical-container p-3 rounded-full flex items-center gap-3 z-10">
                           <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="font-semibold text-gray-300">{aiPlayerName} is thinking...</span>
                        </div>
                      ) : (
                        currentPlayer && <TurnIndicator player={currentPlayer} />
                      )}
                    </div>
                    <div ref={gameBoardSizerRef} className="w-full flex-1 flex items-center justify-center min-h-0">
                        <div style={{ width: boardSize > 0 ? `${boardSize}px` : '100%', height: boardSize > 0 ? `${boardSize}px` : '100%' }}>
                            <GameBoard 
                                players={players} 
                                walls={walls}
                                currentPlayerId={currentPlayerId}
                                selectedPiece={selectedPiece}
                                validMoves={validMoves}
                                isPlacingWall={isPlacingWall}
                                wallPreview={wallPreview}
                                onCellClick={handleCellClick}
                                onWallPreview={handleWallPreview}
                                onCancelWallPreview={cancelWallPlacement}
                            />
                        </div>
                    </div>
                </div>

                <footer className="w-full max-w-2xl flex-shrink-0 mx-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex-1 flex justify-start">
                            {currentPlayer?.id === myPlayer?.id && <TurnTimer turnTime={turnTime} player={currentPlayer} />}
                        </div>
                        <div className="flex-1" />
                        <div className="flex-1 flex justify-end">
                            {myPlayer && <PlayerInfo player={myPlayer} />}
                        </div>
                    </div>

                    {wallPreview ? (
                         <div className="flex w-full space-x-4 mt-4">
                             <button onClick={withSound(cancelWallPlacement)} className="w-full py-3 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange">Cancel</button>
                             <button onClick={withSound(confirmWallPlacement)} className="w-full py-3 rounded-lg font-bold text-white bg-green-500 button-glow button-glow-green">Confirm Wall</button>
                        </div>
                    ) : (
                        <div className="flex w-full items-center space-x-4 mt-4">
                             <button onClick={withSound(togglePlacingWall)} disabled={!currentPlayer || currentPlayer.wallsLeft === 0 || !isMyTurn} className={`w-full h-14 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed button-glow ${isPlacingWall ? 'bg-orange-500 button-glow-orange' : 'bg-cyan-500 button-glow-cyan'}`}>
                                {isPlacingWall ? 'Cancel' : 'Place Wall'}
                             </button>
                             <button onClick={withSound(() => setShowNewGameConfirm(true))} className="w-full h-14 rounded-lg font-bold text-white bg-fuchsia-600 button-glow button-glow-purple">New Game</button>
                        </div>
                    )}
                </footer>
                
                {gameState === GameState.GAME_OVER && winner && (
                    <>
                    {winner.id === (onlinePlayerId ?? 1) && <Celebration />}
                    <Modal title="Game Over!">
                        <div className="text-center">
                            <div className="flex justify-center mb-6">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-5xl border-4 border-white/50`}
                                    style={{
                                        backgroundColor: winner.color,
                                        boxShadow: `0 0 20px ${winner.color}, 0 0 40px ${winner.color}, inset 0 0 10px rgba(255,255,255,0.8)`
                                    }}
                                >
                                    <span className="font-magic" style={{ textShadow: '3px 3px 5px rgba(0,0,0,0.5)' }}>
                                        {winner.id}
                                    </span>
                                </div>
                            </div>
                            <h3 className={`text-4xl font-magic mb-2`} style={{color: winner.color, textShadow: `0 0 10px ${winner.color}`}}>{winner.name} wins!</h3>
                            {gameMode === GameMode.PVC && winner.id === 1 && (
                                <p className="text-gray-300 mb-4 text-lg">
                                    You defeated <span className="font-bold">{players[2].name}</span>!
                                </p>
                            )}
                            { turnTime <= 0 && <p className="text-gray-400 mb-4">The other player ran out of time.</p>}
                            <div className="flex flex-col gap-4 mt-6">
                               { gameMode !== GameMode.PVO && <button onClick={withSound(() => startGame(gameMode, difficulty, players[1].name, aiType, configuredTurnTime, startPosition, initialWalls))} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">Play Again</button>}
                                <button onClick={withSound(returnToMenu)} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple">Main Menu</button>
                            </div>
                        </div>
                    </Modal>
                    </>
                )}
                {gameState === GameState.ONLINE_WAITING && (
                    <WaitingForOpponentModal 
                        gameId={onlineGameId} 
                        hasTimeout={!!onlineRequestTimeout} 
                        onCancelSearch={withSound(handleCancelFindMatch)} 
                        onCancelCreateGame={withSound(handleCancelCreateGame)}
                    />
                )}
                {showRateLimitModal && (
                     <Modal title="API Limit Reached" onClose={withSound(() => setShowRateLimitModal(false))}>
                        <div className="text-center space-y-4">
                            <p className="text-gray-300">You've exceeded the request limit for Gemini. The AI will make a simple move. For an uninterrupted experience, try the offline <span className="font-bold text-white">Local AI</span>.</p>
                            <button onClick={withSound(() => setShowRateLimitModal(false))} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">OK</button>
                        </div>
                    </Modal>
                )}
                {showNewGameConfirm && (
                    <Modal title="Start New Game?" onClose={() => setShowNewGameConfirm(false)}>
                        <div className="text-center space-y-4">
                            <p className="text-gray-300">Are you sure? Your current game progress will be lost.</p>
                            <div className="flex gap-4 mt-6">
                                <button onClick={withSound(() => setShowNewGameConfirm(false))} className="w-full py-3 rounded-lg font-bold text-white bg-gray-600 hover:bg-gray-700 transition-all">Cancel</button>
                                <button onClick={withSound(() => { setShowNewGameConfirm(false); returnToMenu(); })} className="w-full py-3 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange">Confirm</button>
                            </div>
                        </div>
                    </Modal>
                )}
                {errorToast && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-orange-900/80 border border-orange-500 text-orange-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in-down backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">{errorToast}</span>
                    </div>
                )}
                <style>{`
                    @keyframes fade-in-down{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}
                    .animate-fade-in-down{animation:fade-in-down .5s ease-out forwards}

                    @keyframes celebrate {
                        0% { transform: translateY(0) scale(1); opacity: 1; }
                        100% { transform: translateY(-120vh) scale(0.5); opacity: 0; }
                    }
                    .animate-celebrate {
                        animation-name: celebrate;
                        animation-timing-function: linear;
                        animation-iteration-count: 1;
                        animation-fill-mode: forwards;
                    }
                    @keyframes swirl {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .animate-swirl {
                        animation: swirl 2s linear infinite;
                    }
                `}</style>
            </main>
        </>
    );
};

// --- Menu Components ---

const MainMenu: React.FC<{ onNavigate: (screen: 'local_setup' | 'online_setup') => void }> = ({ onNavigate }) => {
    const [playerName, setPlayerName] = useState('Player 1');
    
    useEffect(() => {
        const storedName = sessionStorage.getItem('playerName');
        if (storedName) setPlayerName(storedName);
    }, []);

    const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setPlayerName(newName);
        sessionStorage.setItem('playerName', newName);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-6xl font-magic text-center mb-2 text-purple-400 text-glow-purple tracking-wider">Maze Magic</h1>
                <p className="text-gray-400 text-center">A strategic game of wits and walls.</p>
            </div>
             <div>
                 <label htmlFor="playerName" className="text-lg font-semibold mb-2 text-gray-300 block">Your Name</label>
                 <input type="text" id="playerName" value={playerName} onChange={handlePlayerNameChange} className="w-full p-3 rounded-lg bg-black/30 border-2 border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition" placeholder="Enter your name" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => onNavigate('local_setup')} className="p-4 rounded-lg font-bold transition-all bg-cyan-500 text-white shadow-lg button-glow button-glow-cyan">Local Game</button>
                <button onClick={() => onNavigate('online_setup')} className="p-4 rounded-lg font-bold transition-all bg-pink-500 text-white shadow-lg button-glow button-glow-pink">Online Game</button>
            </div>
            <p className="text-xs text-gray-500 text-center pt-2">Version 3.0</p>
        </div>
    );
};

const WaitingForOpponentModal: React.FC<{
    gameId: string | null; 
    hasTimeout: boolean;
    onCancelSearch?: () => void;
    onCancelCreateGame?: () => void;
}> = ({ gameId, hasTimeout, onCancelSearch, onCancelCreateGame }) => {
    const [copied, setCopied] = useState(false);
    const isFindingMatch = !gameId && hasTimeout;
    const initialTime = isFindingMatch ? 3 * 60 : 5 * 60;
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const joinUrl = gameId ? `${window.location.origin}${window.location.pathname}?join=${gameId}` : '';

    useEffect(() => {
        if (!hasTimeout || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [hasTimeout, timeLeft]);

    const handleShare = async () => {
        if (!joinUrl) return;
        soundService.play(Sound.UIClick);

        const shareData = {
            title: 'Maze Magic Game Invitation',
            text: "Join my game of Maze Magic! Follow this link to play.",
            url: joinUrl,
        };

        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Sharing failed:', error);
            }
        } else {
            navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const title = gameId ? 'Waiting for Opponent' : 'Finding Match...';
    
    return (
        <Modal title={title}>
            <div className="text-center space-y-4">
                 <div className="w-24 h-24 mx-auto">
                    <svg viewBox="0 0 100 100" className="animate-swirl">
                        <defs>
                            <linearGradient id="swirl-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--glow-cyan)" />
                                <stop offset="100%" stopColor="var(--glow-purple)" />
                            </linearGradient>
                        </defs>
                        <path d="M 50,50 m -40,0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0" fill="none" stroke="url(#swirl-gradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray="150 251.2" />
                        <path d="M 50,50 m -25,0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0" fill="none" stroke="url(#swirl-gradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 157" strokeDashoffset="50" />
                    </svg>
                </div>
                
                {isFindingMatch ? (
                    <p className="text-gray-300">Searching for another player. This may take a moment.</p>
                ) : (
                    <p className="text-gray-300">Share this link with a friend to invite them.</p>
                )}

                {gameId && (
                    <div className="flex items-center space-x-2">
                        <input type="text" readOnly value={joinUrl} className="w-full p-2 rounded-lg bg-black/30 border border-fuchsia-500/50 text-sm" />
                        <button onClick={handleShare} className="p-2 rounded-lg bg-cyan-500 text-white font-bold button-glow button-glow-cyan text-sm w-24">{copied ? 'Copied!' : 'Share'}</button>
                    </div>
                )}
                {hasTimeout && timeLeft > 0 && (
                    <p className="text-sm text-gray-400">
                        {isFindingMatch ? 'Search will time out in' : 'Game will expire in'}: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </p>
                )}
                 {(isFindingMatch && onCancelSearch || gameId && onCancelCreateGame) && (
                    <button 
                        onClick={isFindingMatch ? onCancelSearch : onCancelCreateGame} 
                        className="w-full mt-2 py-2 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange"
                    >
                        {isFindingMatch ? 'Cancel Search' : 'Cancel Game'}
                    </button>
                )}
            </div>
        </Modal>
    )
}

const SetupButton: React.FC<{active: boolean, onClick: ()=>void, children: React.ReactNode, color: 'cyan'|'pink'|'fuchsia'|'dark'}> = ({active, onClick, children, color}) => {
    const colorClasses = {
        cyan: 'bg-cyan-500 button-glow-cyan',
        pink: 'bg-pink-500 button-glow-pink',
        fuchsia: 'bg-fuchsia-500 button-glow-purple',
        dark: 'bg-gray-800 button-glow-purple'
    };
    const activeClass = active ? `${colorClasses[color]} text-white scale-105` : 'bg-black/30 hover:bg-black/50 text-gray-300';
    return <button onClick={onClick} className={`w-full p-3 rounded-lg font-bold transition-all button-glow ${activeClass}`}>{children}</button>
};

const LocalGameSetup: React.FC<{ playerName: string; onStartGame: Function; onBack: () => void; setShowComingSoon: (show: boolean) => void; }> = (props) => {
    const [mode, setMode] = useState<GameMode>(GameMode.PVC);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [startPos, setStartPos] = useState<StartPosition>(StartPosition.CENTER);
    const [duration, setDuration] = useState(60);
    const [walls, setWalls] = useState(10);
    const minTime = 30;

    const withSound = (onClick: (...args: any[]) => void) => {
        return (...args: any[]) => {
            soundService.play(Sound.UIClick);
            onClick(...args);
        };
    };

    useEffect(() => { if (duration < minTime) setDuration(minTime); }, [duration, minTime]);

    return (
      <div className="space-y-4 animate-fade-in-down">
          <BackButton onClick={props.onBack} />
          <h2 className="text-2xl font-bold text-center text-white pt-8">Local Game Setup</h2>
          <div className="flex gap-4">
              <SetupButton active={mode === GameMode.PVP} onClick={withSound(() => setMode(GameMode.PVP))} color="cyan">Player vs Player</SetupButton>
              <SetupButton active={mode === GameMode.PVC} onClick={withSound(() => setMode(GameMode.PVC))} color="pink">Player vs AI</SetupButton>
          </div>
          {mode === GameMode.PVC && (
              <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-gray-300 mb-2">AI Type</h3>
                      <div className="flex gap-4">
                          <SetupButton active={true} onClick={() => {}} color="dark">Local (Offline)</SetupButton>
                          <SetupButton active={false} onClick={() => props.setShowComingSoon(true)} color="fuchsia">Gemini AI</SetupButton>
                      </div>
                  </div>
                  <div>
                      <h3 className="font-semibold text-gray-300 mb-2">AI Difficulty</h3>
                      <div className="grid grid-cols-3 gap-2">
                          {Object.values(Difficulty).map(d => (<button key={d} onClick={withSound(() => setDifficulty(d))} className={`p-2 rounded-lg font-semibold transition-all text-sm ${difficulty === d ? 'bg-fuchsia-500 button-glow-purple text-white' : 'bg-black/30 hover:bg-black/50 text-gray-300'}`}>{d}</button>))}
                      </div>
                  </div>
              </div>
          )}
          <div>
              <h3 className="font-semibold text-gray-300 mb-2">Starting Position</h3>
              <div className="flex gap-4">
                  <SetupButton active={startPos === StartPosition.CENTER} onClick={withSound(() => setStartPos(StartPosition.CENTER))} color="cyan">Center</SetupButton>
                  <SetupButton active={startPos === StartPosition.RANDOM} onClick={withSound(() => setStartPos(StartPosition.RANDOM))} color="pink">Random</SetupButton>
              </div>
          </div>
           <div>
              <label htmlFor="walls" className="font-semibold text-gray-300 block mb-1">Number of Walls: <span className="font-bold text-cyan-400">{walls}</span></label>
              <input type="range" id="walls" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
          </div>
          <div>
              <label htmlFor="turnTime" className="font-semibold text-gray-300 block mb-2">Time Per Move (seconds)</label>
              <input type="number" id="turnTime" value={duration} min={minTime} step="15" onChange={(e) => setDuration(Math.max(minTime, Number(e.target.value)))} className="w-full p-3 rounded-lg bg-black/30 border border-fuchsia-500/50" />
              <p className="text-xs text-gray-400 mt-1">Minimum: {minTime} seconds.</p>
          </div>
          <button onClick={() => props.onStartGame(mode, difficulty, props.playerName, AiType.LOCAL, duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg button-glow button-glow-green text-xl">Start Game</button>
      </div>
    );
}

const OnlineGameSetup: React.FC<{ playerName: string; onCreateGame: Function; onJoinGame: Function; onFindMatch: Function; onBack: () => void; }> = (props) => {
    const [joinGameId, setJoinGameId] = useState('');
    const [startPos, setStartPos] = useState<StartPosition>(StartPosition.CENTER);
    const [duration, setDuration] = useState(60);
    const [walls, setWalls] = useState(10);

    const withSound = (onClick: (...args: any[]) => void) => {
        return (...args: any[]) => {
            soundService.play(Sound.UIClick);
            onClick(...args);
        };
    };

    return (
       <div className="space-y-4 animate-fade-in-down">
           <BackButton onClick={props.onBack} />
           <h2 className="text-2xl font-bold text-center text-white pt-8">Online Multiplayer</h2>
           <div className="p-4 bg-black/20 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-300 mb-2">Game Options</h3>
                  <label htmlFor="turnTimeOnline" className="text-gray-300 block">Time Per Move: {duration}s</label>
                  <input type="range" id="turnTimeOnline" value={duration} min="30" max="120" step="15" onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                  
                  <label htmlFor="wallsOnline" className="text-gray-300 block">Number of Walls: <span className="font-bold text-cyan-400">{walls}</span></label>
                  <input type="range" id="wallsOnline" value={walls} min="5" max="15" step="1" onChange={(e) => setWalls(Number(e.target.value))} className="w-full" />
                  
                  <div className="flex gap-4 pt-2">
                     <SetupButton active={startPos === StartPosition.CENTER} onClick={withSound(() => setStartPos(StartPosition.CENTER))} color="cyan">Center Start</SetupButton>
                     <SetupButton active={startPos === StartPosition.RANDOM} onClick={withSound(() => setStartPos(StartPosition.RANDOM))} color="pink">Random Start</SetupButton>
                  </div>
           </div>
           <div className="space-y-4 pt-4 border-t border-fuchsia-500/30">
               <button onClick={() => props.onFindMatch(props.playerName, duration, startPos, walls)} className="w-full bg-fuchsia-500 text-white font-bold py-3 rounded-lg button-glow button-glow-purple">Find Random Match</button>
               <div className="text-center text-gray-400">OR</div>
               <button onClick={() => props.onCreateGame(props.playerName, duration, startPos, walls)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">Create Private Game</button>
               <div className="flex items-center space-x-2">
                   <input type="text" value={joinGameId} onChange={(e) => setJoinGameId(e.target.value)} className="w-full p-3 rounded-lg bg-black/30 border border-fuchsia-500/50" placeholder="Paste Game ID" />
                   <button onClick={() => props.onJoinGame(joinGameId, props.playerName)} disabled={!joinGameId} className="p-3 rounded-lg bg-cyan-500 text-white font-bold button-glow button-glow-cyan disabled:opacity-50">Join</button>
               </div>
           </div>
       </div>
    );
};


type JoinGamePromptProps = {
  gameId: string;
  initialPlayerName: string;
  onJoin: (gameId: string, playerName: string) => void;
  onCancel: () => void;
};

const JoinGamePrompt: React.FC<JoinGamePromptProps> = ({ gameId, initialPlayerName, onJoin, onCancel }) => {
  const [playerName, setPlayerName] = useState(initialPlayerName);

  useEffect(() => {
    setPlayerName(initialPlayerName);
  }, [initialPlayerName]);

  const handleJoin = () => {
    if (playerName.trim()) {
      onJoin(gameId, playerName.trim());
    }
  };
  
  const withSound = (onClick: (...args: any[]) => void) => {
        return (...args: any[]) => {
            soundService.play(Sound.UIClick);
            onClick(...args);
        };
    };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)] flex items-center justify-center p-4">
        <Modal title="Join Private Game" onClose={onCancel}>
          <div className="space-y-6 text-center">
            <p className="text-gray-300">You've been invited to a game!</p>
            <div>
              <label htmlFor="joinPlayerName" className="text-lg font-semibold mb-2 text-gray-300 block">Your Name</label>
              <input
                type="text"
                id="joinPlayerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 rounded-lg bg-black/30 border-2 border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition"
                placeholder="Enter your name"
              />
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={withSound(handleJoin)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">
                Join Game
              </button>
              <button onClick={withSound(onCancel)} className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg button-glow button-glow-orange">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default App;