
import React, { useState, useEffect, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import Modal from './components/Modal';
import HelpModal from './components/HelpModal';
import { AiChatTooltip } from './components/AiChatTooltip';
// Fix: Import the 'Wall' type to resolve the TypeScript error.
import { GameState, GameMode, Difficulty, Player, AiType, StartPosition, Wall } from './types';
import { AnimatedMenuBackground } from './components/AnimatedMenuBackground';
import { soundService, Sound } from './services/soundService';

const EMOJIS = ['😂', '🤔', '🤯', '😎', '👋', '❤️', '😡', '⏳'];

const EmojiPlate: React.FC<{ onSelect: (emoji: string) => void; enabled: boolean; }> = ({ onSelect, enabled }) => {
  const handleSelect = (emoji: string) => {
    if (!enabled) return;
    onSelect(emoji);
  };

  return (
    <div className={`flex items-center justify-center gap-1 sm:gap-2 magical-container rounded-full p-1 transition-opacity ${!enabled ? 'opacity-50 ' : ''}`}>
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleSelect(emoji)}
          disabled={!enabled}
          className="text-lg sm:text-2xl p-1 rounded-full hover:bg-white/20 transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed"
          aria-label={`Send ${emoji} emoji`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const TravelingEmoji: React.FC<{
    emoji: string;
    fromPlayerId: 1 | 2;
    localPlayerId: 1 | 2 | null;
    gameMode: GameMode;
}> = ({ emoji, fromPlayerId, localPlayerId, gameMode }) => {
    
    let isFromBottom: boolean;
    if (gameMode === GameMode.PVP) {
        // In local PvP, Player 1 is always at the bottom, Player 2 is at the top.
        isFromBottom = fromPlayerId === 1;
    } else {
        // In online PvP, the sender's emoji always comes from the bottom of their screen.
        isFromBottom = fromPlayerId === localPlayerId;
    }
    
    const isRotated = gameMode === GameMode.PVP && fromPlayerId === 2;

    return (
        <div
          className="fixed text-6xl pointer-events-none z-50 animate-emoji-travel"
          style={{
            left: '50%',
            bottom: isFromBottom ? '15%' : 'auto',
            top: isFromBottom ? 'auto' : '15%',
          }}
        >
          <span className={isRotated ? 'inline-block rotate-180' : 'inline-block'}>
            {emoji}
          </span>
          <style>{`
            @keyframes emoji-travel-from-bottom {
              0% { transform: translate(-50%, 0) scale(1.5); opacity: 1; }
              100% { transform: translate(-50%, -65vh) scale(0.5); opacity: 0; }
            }
            @keyframes emoji-travel-from-top {
              0% { transform: translate(-50%, 0) scale(1.5); opacity: 1; }
              100% { transform: translate(-50%, 65vh) scale(0.5); opacity: 0; }
            }
            .animate-emoji-travel {
              animation: ${isFromBottom ? 'emoji-travel-from-bottom' : 'emoji-travel-from-top'} 1.5s cubic-bezier(0.5, -0.5, 0.5, 1.5) forwards;
              text-shadow: 0 4px 10px rgba(0,0,0,0.5);
            }
          `}</style>
        </div>
    );
};

const TurnIndicator: React.FC<{ player: Player; size?: 'sm' | 'md' }> = ({ player, size = 'md' }) => {
    const containerClasses = size === 'sm' ? 'px-3 py-1 space-x-2' : 'px-4 py-2 space-x-3';
    const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
    const textSize = size === 'sm' ? 'text-sm' : '';

    return (
        <div className={`magical-container rounded-full flex items-center ${containerClasses}`}>
            <div className={`${dotSize} rounded-full`} style={{ backgroundColor: player.color, boxShadow: `0 0 6px ${player.color}` }}></div>
            <span className={`font-semibold text-gray-200 ${textSize}`}>{player.name}'s Turn</span>
        </div>
    );
};

const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

const TurnTimer: React.FC<{
    currentTime: number;
    initialTime: number;
    player: Player | undefined;
    isActive: boolean;
    size?: 'sm' | 'md';
}> = ({ currentTime, initialTime, player, isActive, size = 'md' }) => {
    const timeToDisplay = isActive ? currentTime : initialTime;
    
    const containerClasses = size === 'sm' ? "rounded-xl p-2 text-center w-28" : "rounded-xl p-3 text-center w-32";
    const labelClasses = size === 'sm' ? "text-[10px] font-medium text-gray-400 uppercase tracking-wider" : "text-xs font-medium text-gray-400 uppercase tracking-wider";
    const timeTextBaseClasses = size === 'sm' ? "text-xl font-bold" : "text-2xl font-bold";
    
    const turnTimeColor = !player ? 'text-gray-200' : 'text-white';
    const turnTimeClasses = `${timeTextBaseClasses} transition-colors ${isActive && currentTime <= 10 ? 'text-red-400 animate-pulse' : turnTimeColor}`;

    return (
        <div className={`magical-container ${containerClasses} transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
            <p className={labelClasses}>Turn Time</p>
            <p className={turnTimeClasses} style={player ? {textShadow: `0 0 8px ${player.color}`} : {}}>{formatTime(timeToDisplay)}</p>
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

const ActionButtons: React.FC<{
    isMyTurn: boolean;
    isPlacingWall: boolean;
    currentPlayer: Player | undefined;
    wallPreview: Omit<Wall, 'playerId'> | null;
    onTogglePlacingWall: () => void;
    secondaryAction?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
        colorClass: string;
    };
    onConfirmWall: () => void;
    onCancelWall: () => void;
    buttonHeightClass?: string;
}> = ({ isMyTurn, isPlacingWall, currentPlayer, wallPreview, onTogglePlacingWall, secondaryAction, onConfirmWall, onCancelWall, buttonHeightClass = 'h-14' }) => {
    
    if (!currentPlayer) {
        return (
            <div className={`relative w-full mt-2 ${buttonHeightClass}`}>
                <div className="absolute inset-0 flex w-full items-center space-x-4">
                    <button disabled className="w-full h-full rounded-lg font-bold text-white bg-gray-600 opacity-50 cursor-not-allowed">
                        Place Wall
                    </button>
                    {secondaryAction && (
                         <button disabled className="w-full h-full rounded-lg font-bold text-white bg-gray-600 opacity-50 cursor-not-allowed">
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    const wallButtonColorClass = currentPlayer.color === '#ec4899' ? 'bg-pink-500 button-glow-pink' : 'bg-cyan-500 button-glow-cyan';
    const finalWallButtonClass = isPlacingWall ? 'bg-orange-500 button-glow-orange' : wallButtonColorClass;

    return (
        <div className={`relative w-full mt-2 ${buttonHeightClass}`}>
            {/* --- Button Set 1: Default Actions --- */}
            <div className={`absolute inset-0 flex w-full items-center space-x-4 transition-all duration-300 ease-in-out ${
                    wallPreview ? 'opacity-0 transform scale-95 pointer-events-none' : 'opacity-100 transform scale-100'
                }`}
                aria-hidden={!!wallPreview}
            >
                <button 
                    onClick={onTogglePlacingWall} 
                    disabled={currentPlayer.wallsLeft === 0 || !isMyTurn} 
                    className={`w-full h-full rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed button-glow ${finalWallButtonClass}`}
                >
                    {isPlacingWall ? 'Cancel' : 'Place Wall'}
                </button>
                {secondaryAction && (
                     <button 
                        onClick={secondaryAction.onClick} 
                        disabled={!isMyTurn || secondaryAction.disabled} 
                        className={`w-full h-full rounded-lg font-bold text-white button-glow ${secondaryAction.colorClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {secondaryAction.label}
                    </button>
                )}
            </div>
            
            {/* --- Button Set 2: Wall Confirmation Actions --- */}
            <div className={`absolute inset-0 flex w-full space-x-4 transition-all duration-300 ease-in-out ${
                    wallPreview ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95 pointer-events-none'
                }`}
                aria-hidden={!wallPreview}
            >
                <button onClick={onCancelWall} className="w-full h-full rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange">
                    Cancel
                </button>
                <button onClick={onConfirmWall} className="w-full h-full rounded-lg font-bold text-white bg-green-500 button-glow button-glow-green">
                    Confirm Wall
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const {
        gameState, gameMode, difficulty, aiType, players, walls, currentPlayerId, winner,
        selectedPiece, validMoves, isPlacingWall, aiThinking, lastAiAction, apiError, gameTime, turnTime,
        showRateLimitModal, wallPlacementError, setShowRateLimitModal, configuredTurnTime, startPosition,
        wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout, initialWalls,
        isMyTurn, pendingJoinId, travelingEmoji, isJoiningGame,
        startGame, handleCellClick, handleWallPreview, confirmWallPlacement, cancelWallPlacement,
        togglePlacingWall, returnToMenu, handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
        cancelJoin, cancelJoinAttempt, handleSendEmoji, clearWallPlacementError, clearApiError,
    } = useGameLogic();

    type MenuScreen = 'main' | 'local_setup' | 'online_setup';
    const [menuScreen, setMenuScreen] = useState<MenuScreen>('main');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
    const [isMuted, setIsMuted] = useState(soundService.isMuted);
    const [showCopyrightModal, setShowCopyrightModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [privacyPolicyContent, setPrivacyPolicyContent] = useState('');
    const [showComingSoonModal, setShowComingSoonModal] = useState(false);
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || 'Player 1');
    const [onlineFlow, setOnlineFlow] = useState<'create' | 'find' | null>(null);

    const gameBoardSizerRef = useRef<HTMLDivElement>(null);
    const [boardPixelSize, setBoardPixelSize] = useState(0);

    const handlePlayerNameChange = (name: string) => {
        setPlayerName(name);
        localStorage.setItem('playerName', name);
    };

    // Effect for timer tick sound
    const turnTimeRef = useRef(turnTime);
    useEffect(() => {
        if (isMyTurn && turnTime <= 5 && turnTime > 0 && turnTime < turnTimeRef.current) {
            soundService.play(Sound.TimerTick);
        }
        turnTimeRef.current = turnTime;
    }, [turnTime, isMyTurn]);
    
    useEffect(() => {
        soundService.init(); // Initialize the sound service and preload sounds

        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.classList.add('fade-out');
            setTimeout(() => {
                splashScreen.remove();
            }, 500); // Match CSS transition time
        }
    }, []);

    useEffect(() => {
        if (showPrivacyModal) {
            fetch('/privacy_policy.html')
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const mainContent = doc.querySelector('main');
                    if (mainContent) {
                        setPrivacyPolicyContent(mainContent.innerHTML);
                    } else {
                        setPrivacyPolicyContent('<p>Could not load policy.</p>');
                    }
                })
                .catch(error => {
                    console.error('Error fetching privacy policy:', error);
                    setPrivacyPolicyContent('<p>Error loading privacy policy. Please try again later.</p>');
                });
        }
    }, [showPrivacyModal]);

    useEffect(() => {
        if (gameState !== GameState.PLAYING && gameState !== GameState.GAME_OVER) {
            return;
        }

        const calculateBoardSize = () => {
            if (gameBoardSizerRef.current) {
                const container = gameBoardSizerRef.current;
                const { width, height } = container.getBoundingClientRect();
                const size = Math.min(width, height);
                setBoardPixelSize(size);
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
        let timer: number | undefined;
        if (wallPlacementError) {
            soundService.play(Sound.Error);
            setErrorToast(wallPlacementError);
            timer = window.setTimeout(() => {
                clearWallPlacementError();
            }, 3000);
        } else if (apiError) {
            soundService.play(Sound.Error);
            setErrorToast(apiError);
            timer = window.setTimeout(() => {
                clearApiError();
            }, 3000);
        } else {
            setErrorToast(null);
        }
        return () => clearTimeout(timer);
    }, [apiError, wallPlacementError, clearWallPlacementError, clearApiError]);
    
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
        switch(menuScreen) {
            case 'main':
                return <MainMenu 
                            playerName={playerName}
                            onPlayerNameChange={handlePlayerNameChange}
                            onNavigate={withSound(setMenuScreen)} 
                            onShowCopyright={withSound(() => setShowCopyrightModal(true))}
                            onShowPrivacy={withSound(() => setShowPrivacyModal(true))}
                            onShowHelp={withSound(() => setShowHelp(true))}
                            onShowAbout={withSound(() => setShowAboutModal(true))}
                        />;
            case 'local_setup':
                return (
                    <LocalGameSetup 
                      playerName={playerName}
                      onStartGame={(...args) => withSound(startGame)(...args)}
                      onBack={withSound(() => setMenuScreen('main'))}
                      onShowComingSoon={withSound(() => setShowComingSoonModal(true))}
                    />
                );
            case 'online_setup':
                return (
                    <OnlineGameSetup
                        playerName={playerName}
                        onCreateGame={(...args) => {
                            setOnlineFlow('create');
                            withSound(handleCreateOnlineGame)(...args);
                        }}
                        onJoinGame={(...args) => withSound(handleJoinOnlineGame)(...args)}
                        onFindMatch={(...args) => {
                            setOnlineFlow('find');
                            withSound(handleFindMatch)(...args);
                        }}
                        onBack={withSound(() => setMenuScreen('main'))}
                    />
                );
        }
    }
    
    if (gameState === GameState.MENU) {
        if (pendingJoinId && !isJoiningGame) {
            return (
                <JoinGamePrompt
                    gameId={pendingJoinId}
                    initialPlayerName={playerName}
                    onJoin={(gameId, name) => {
                        handlePlayerNameChange(name);
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

                {errorToast && (
                    <div className="fixed top-4 left-1/2 bg-orange-900/80 border border-orange-500 text-orange-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 backdrop-blur-sm animate-fade-in-down">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">{errorToast}</span>
                    </div>
                )}

                {isJoiningGame && (
                    <Modal title="Joining Game..." onClose={withSound(cancelJoinAttempt)}>
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
                            <p className="text-gray-300">Connecting to the game session...</p>
                            <button 
                                onClick={withSound(cancelJoinAttempt)} 
                                className="w-full mt-4 py-2 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange"
                            >
                                Cancel
                            </button>
                        </div>
                    </Modal>
                )}

                {showHelp && <HelpModal onClose={withSound(() => setShowHelp(false))} />}
                
                {showCopyrightModal && (
                     <Modal title="Copyright Policy" onClose={withSound(() => setShowCopyrightModal(false))}>
                        <div className="text-center space-y-4">
                            <p className="text-gray-300 text-lg">© 2025 Maze Magic. All rights reserved.</p>
                            <p className="text-gray-400 text-sm">
                                The game, including its code, graphics, and sounds, is the property of the developer and protected by copyright laws.
                            </p>
                            <button onClick={withSound(() => setShowCopyrightModal(false))} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">OK</button>
                        </div>
                    </Modal>
                )}
                
                {showComingSoonModal && (
                     <Modal title="Coming Soon!" onClose={withSound(() => setShowComingSoonModal(false))}>
                        <div className="text-center space-y-4">
                            <p className="text-gray-300">The advanced Gemini AI opponent is under development and will be available in a future update. Stay tuned!</p>
                            <button onClick={withSound(() => setShowComingSoonModal(false))} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">OK</button>
                        </div>
                    </Modal>
                )}

                {showAboutModal && (
                    <Modal title="About Me" onClose={withSound(() => setShowAboutModal(false))}>
                        <div className="text-center space-y-6">
                            <div className="space-y-1">
                                <p className="text-lg text-gray-300">Developed by</p>
                                <div>
                                    <p className="text-3xl font-semibold tracking-wider text-fuchsia-400" style={{fontFamily: "Garamond, 'Times New Roman', serif"}}>Onetechzilla</p>
                                    <p className="text-xl font-semibold tracking-wider text-fuchsia-400" style={{fontFamily: "Garamond, 'Times New Roman', serif"}}>(Ayush Garg)</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg text-gray-300">Contact</p>
                                <a href="mailto:onetechzilla@gmail.com" className="text-lg text-pink-400 hover:underline">onetechzilla@gmail.com</a>
                            </div>
                            <button onClick={withSound(() => setShowAboutModal(false))} className="w-full mt-4 bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">Close</button>
                        </div>
                    </Modal>
                )}

                {showPrivacyModal && (
                    <Modal title="Privacy Policy" onClose={withSound(() => setShowPrivacyModal(false))} className="max-w-2xl">
                        <div 
                            className="text-gray-300 max-h-[60vh] overflow-y-auto pr-4 -mr-6 custom-scrollbar privacy-policy-content"
                            dangerouslySetInnerHTML={{ __html: privacyPolicyContent }}
                        />
                        <button onClick={withSound(() => setShowPrivacyModal(false))} className="w-full mt-6 bg-cyan-500 text-white font-bold py-3 rounded-lg button-glow button-glow-cyan">Close</button>
                    </Modal>
                )}

                <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md magical-container p-6 md:p-8 rounded-2xl relative">
                        {renderMenu()}
                    </div>
                </div>
            </>
        );
    }
    
    if (gameState === GameState.ONLINE_WAITING) {
        return (
            <div className="fixed inset-0 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)] flex items-center justify-center p-4">
                <MuteButton isMuted={isMuted} onClick={withSound(handleToggleMute)} />
                <WaitingForOpponentModal 
                    gameId={onlineGameId} 
                    hasTimeout={!!onlineRequestTimeout} 
                    mode={onlineFlow}
                    onCancelSearch={withSound(handleCancelFindMatch)} 
                    onCancelCreateGame={withSound(handleCancelCreateGame)}
                />
            </div>
        );
    }
    
    const pageBackgroundClasses = "fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)]";
    if ((gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) && (!players[1] || !players[2])) {
        return (
            <div className={pageBackgroundClasses}>
                <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    const isPvpMode = gameMode === GameMode.PVP;
    const player1 = players[1];
    const player2 = players[2];
    const currentPlayer = players[currentPlayerId];
    const aiPlayerName = players[2]?.name || 'AI';
    
    // Non-PvP Layout
    const renderDefaultLayout = () => (
        <>
            {/* PLAYER 2 (TOP) AREA */}
            <header className="w-full max-w-2xl flex-shrink-0 mx-auto">
                <div className="flex justify-between items-center w-full">
                    <div className="relative flex-1">
                        <div className="inline-block relative">
                            {player2 && <PlayerInfo player={player2} />}
                            {gameMode === GameMode.PVC && aiMessage && <AiChatTooltip message={aiMessage} />}
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-400">GAME TIME</p>
                            <p className="text-2xl font-bold text-gray-200">{formatTime(gameTime)}</p>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end">
                       {player2 && <TurnTimer currentTime={turnTime} initialTime={configuredTurnTime} player={player2} isActive={currentPlayer?.id === player2.id} />}
                    </div>
                </div>
            </header>

            {/* GAME BOARD (MIDDLE) AREA */}
            <div className="w-full flex flex-col items-center justify-center py-1 min-h-0">
                <div className="h-12 flex items-center justify-center my-1 flex-shrink-0">
                    {aiThinking ? (
                        <div className="magical-container p-3 rounded-full flex items-center gap-3 z-10">
                            <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="font-semibold text-gray-300">{aiPlayerName} is thinking...</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center">
                            {currentPlayer && <TurnIndicator player={currentPlayer} />}
                        </div>
                    )}
                </div>
                <div ref={gameBoardSizerRef} className="w-full flex-1 flex items-center justify-center min-h-0">
                    <div style={{ width: boardPixelSize > 0 ? `${boardPixelSize}px` : '100%', height: boardPixelSize > 0 ? `${boardPixelSize}px` : '100%' }}>
                        <GameBoard players={players} walls={walls} currentPlayerId={currentPlayerId} selectedPiece={selectedPiece} validMoves={validMoves} isPlacingWall={isPlacingWall} wallPreview={wallPreview} onCellClick={handleCellClick} onWallPreview={handleWallPreview} onCancelWallPreview={cancelWallPlacement} boardPixelSize={boardPixelSize} />
                    </div>
                </div>
            </div>

            {/* PLAYER 1 (BOTTOM) AREA */}
            <footer className="w-full max-w-2xl flex-shrink-0 mx-auto">
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1 flex justify-start">
                        {player1 && <TurnTimer currentTime={turnTime} initialTime={configuredTurnTime} player={player1} isActive={currentPlayer?.id === player1.id} />}
                    </div>
                    <div className="flex-shrink-0 px-2">
                        {gameMode === GameMode.PVO && <EmojiPlate onSelect={(emoji) => handleSendEmoji(emoji)} enabled={true} />}
                    </div>
                    <div className="flex-1 flex justify-end relative">
                        {player1 && <PlayerInfo player={player1} />}
                    </div>
                </div>
                <ActionButtons 
                    isMyTurn={isMyTurn} 
                    isPlacingWall={isPlacingWall} 
                    currentPlayer={player1} 
                    wallPreview={wallPreview} 
                    onTogglePlacingWall={withSound(togglePlacingWall)} 
                    secondaryAction={{
                        label: 'New Game',
                        onClick: withSound(() => setShowNewGameConfirm(true)),
                        colorClass: 'bg-fuchsia-600 button-glow-purple',
                    }}
                    onConfirmWall={withSound(confirmWallPlacement)} 
                    onCancelWall={withSound(cancelWallPlacement)} 
                />
            </footer>
        </>
    );

    // PvP Layout - Symmetrical and Static
    const renderPvpLayout = () => (
         <>
            {/* PLAYER 2 (TOP) HUB */}
            <header className="w-full max-w-2xl flex-shrink-0 mx-auto rotate-180">
                <div className="space-y-2">
                    <div className="flex justify-between items-center w-full">
                        <PlayerInfo player={player2} reverse size="sm" />
                        <EmojiPlate onSelect={(emoji) => handleSendEmoji(emoji, 2)} enabled={true} />
                        <TurnTimer currentTime={turnTime} initialTime={configuredTurnTime} player={player2} isActive={currentPlayerId === 2} size="sm" />
                    </div>
                     <ActionButtons
                        isMyTurn={currentPlayerId === 2}
                        isPlacingWall={isPlacingWall && currentPlayerId === 2}
                        currentPlayer={player2}
                        wallPreview={currentPlayerId === 2 ? wallPreview : null}
                        onTogglePlacingWall={withSound(togglePlacingWall)}
                        onConfirmWall={withSound(confirmWallPlacement)}
                        onCancelWall={withSound(cancelWallPlacement)}
                        buttonHeightClass="h-12"
                    />
                </div>
            </header>

            {/* CENTRAL AREA */}
            <div className="w-full flex flex-col items-center justify-center py-1 min-h-0">
                <div className="magical-container rounded-full px-3 py-1 my-1 flex items-center justify-between w-full max-w-xs mx-auto">
                    <div className="text-center">
                        <p className="text-xs font-medium text-gray-400">TIME</p>
                        <p className="text-lg font-bold text-gray-200">{formatTime(gameTime)}</p>
                    </div>
                    {currentPlayer && (
                        <div className={`transition-transform duration-300 ${currentPlayerId === 2 ? 'rotate-180' : ''}`}>
                            <TurnIndicator player={currentPlayer} size="sm" />
                        </div>
                    )}
                    <button onClick={withSound(() => setShowNewGameConfirm(true))} className="p-2 rounded-full font-bold text-white bg-fuchsia-600 button-glow button-glow-purple" aria-label="New Game" title="Start New Game">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div ref={gameBoardSizerRef} className="w-full flex-1 flex items-center justify-center min-h-0">
                    <div style={{ width: boardPixelSize > 0 ? `${boardPixelSize}px` : '100%', height: boardPixelSize > 0 ? `${boardPixelSize}px` : '100%' }}>
                        <GameBoard players={players} walls={walls} currentPlayerId={currentPlayerId} selectedPiece={selectedPiece} validMoves={validMoves} isPlacingWall={isPlacingWall} wallPreview={wallPreview} onCellClick={handleCellClick} onWallPreview={handleWallPreview} onCancelWallPreview={cancelWallPlacement} boardPixelSize={boardPixelSize} />
                    </div>
                </div>
            </div>

            {/* PLAYER 1 (BOTTOM) HUB */}
            <footer className="w-full max-w-2xl flex-shrink-0 mx-auto">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center w-full">
                        <TurnTimer currentTime={turnTime} initialTime={configuredTurnTime} player={player1} isActive={currentPlayerId === 1} size="sm" />
                        <EmojiPlate onSelect={(emoji) => handleSendEmoji(emoji, 1)} enabled={true} />
                        <PlayerInfo player={player1} size="sm" />
                    </div>
                    <ActionButtons
                        isMyTurn={currentPlayerId === 1}
                        isPlacingWall={isPlacingWall && currentPlayerId === 1}
                        currentPlayer={player1}
                        wallPreview={currentPlayerId === 1 ? wallPreview : null}
                        onTogglePlacingWall={withSound(togglePlacingWall)}
                        onConfirmWall={withSound(confirmWallPlacement)}
                        onCancelWall={withSound(cancelWallPlacement)}
                        buttonHeightClass="h-12"
                    />
                </div>
            </footer>
        </>
    );

    return (
        <>
            <MuteButton isMuted={isMuted} onClick={withSound(handleToggleMute)} />
            <main className={`h-screen max-h-[100dvh] w-full grid grid-rows-[auto_1fr_auto] p-2 sm:p-4 bg-gradient-to-b from-[var(--dark-bg-start)] to-[var(--dark-bg-end)] overflow-hidden`}>
                {isPvpMode ? renderPvpLayout() : renderDefaultLayout()}
                
                {(gameMode === GameMode.PVP || gameMode === GameMode.PVO) && travelingEmoji && (
                    <TravelingEmoji key={travelingEmoji.key} emoji={travelingEmoji.emoji} fromPlayerId={travelingEmoji.fromPlayerId} localPlayerId={onlinePlayerId} gameMode={gameMode} />
                )}

                {isJoiningGame && (
                    <Modal title="Joining Game..." onClose={withSound(cancelJoinAttempt)}>
                        <div className="text-center space-y-4">
                             <div className="w-24 h-24 mx-auto">
                                <svg viewBox="0 0 100 100" className="animate-swirl">
                                    <defs>
                                        <linearGradient id="swirl-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="var(--glow-cyan)" />
                                            <stop offset="100%" stopColor="var(--glow-purple)" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 50,50 m -40,0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0" fill="none" stroke="url(#swirl-gradient-2)" strokeWidth="6" strokeLinecap="round" strokeDasharray="150 251.2" />
                                    <path d="M 50,50 m -25,0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0" fill="none" stroke="url(#swirl-gradient-2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 157" strokeDashoffset="50" />
                                </svg>
                            </div>
                            <p className="text-gray-300">Connecting to the game session...</p>
                            <button 
                                onClick={withSound(cancelJoinAttempt)} 
                                className="w-full mt-4 py-2 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange"
                            >
                                Cancel
                            </button>
                        </div>
                    </Modal>
                )}

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
                               { gameMode !== GameMode.PVO && <button onClick={withSound(() => startGame(gameMode, difficulty, players[1].name, players[2].name, aiType, configuredTurnTime, startPosition, initialWalls))} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg button-glow button-glow-green">Play Again</button>}
                                <button onClick={withSound(returnToMenu)} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple">Main Menu</button>
                            </div>
                        </div>
                    </Modal>
                    </>
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
                    <div className={`fixed left-1/2 bg-orange-900/80 border border-orange-500 text-orange-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 backdrop-blur-sm ${
                        gameMode === GameMode.PVP && currentPlayerId === 2
                        ? 'bottom-14 animate-toast-p2'
                        : 'top-4 animate-fade-in-down'
                    }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">{errorToast}</span>
                    </div>
                )}
                <style>{`
                    .rotate-180 {
                        transform: rotate(180deg);
                    }
                    @keyframes fade-in-down{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}
                    .animate-fade-in-down{animation:fade-in-down .5s ease-out forwards}

                    @keyframes toast-p2-anim {
                      from { opacity: 0; transform: translate(-50%, 20px) rotate(180deg); }
                      to   { opacity: 1; transform: translate(-50%, 0) rotate(180deg); }
                    }
                    .animate-toast-p2 {
                      animation: toast-p2-anim .5s ease-out forwards;
                    }

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
                    .privacy-policy-content section:not(:last-child) {
                        padding-bottom: 1.5rem;
                        margin-bottom: 1.5rem;
                        border-bottom: 1px solid rgba(192, 38, 211, 0.2);
                    }
                    .privacy-policy-content h3 {
                        font-size: 1.25rem;
                        font-weight: bold;
                        color: var(--glow-cyan);
                        margin-bottom: 1rem;
                    }
                    .privacy-policy-content ul {
                        list-style-type: disc;
                        list-style-position: inside;
                        padding-left: 0.5rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .privacy-policy-content a {
                        color: var(--glow-pink);
                        text-decoration: underline;
                    }
                     .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(168, 85, 247, 0.5); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(168, 85, 247, 0.8); }
                `}</style>
            </main>
        </>
    );
};

// --- Menu Components ---

const MainMenu: React.FC<{ 
    playerName: string;
    onPlayerNameChange: (name: string) => void;
    onNavigate: (screen: 'local_setup' | 'online_setup') => void;
    onShowCopyright: () => void;
    onShowPrivacy: () => void;
    onShowHelp: () => void;
    onShowAbout: () => void;
}> = ({ playerName, onPlayerNameChange, onNavigate, onShowCopyright, onShowPrivacy, onShowHelp, onShowAbout }) => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-6xl font-magic text-center mb-2 text-purple-400 text-glow-purple tracking-wider">Maze Magic</h1>
                <p className="text-gray-400 text-center">A strategic game of wits and walls.</p>
            </div>
             <div>
                <label htmlFor="playerName" className="text-lg font-bold text-gray-300 block mb-2 text-left">Your Name</label>
                <input 
                    type="text" 
                    id="playerName" 
                    value={playerName} 
                    onChange={(e) => onPlayerNameChange(e.target.value)} 
                    className="w-full p-3 rounded-lg bg-black/30 border-2 border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition" 
                    placeholder="Enter your name" 
                />
            </div>
            <div className="flex flex-col gap-4">
                <button onClick={() => onNavigate('local_setup')} className="w-full p-4 rounded-lg font-bold transition-all bg-cyan-500 text-white shadow-lg button-glow button-glow-cyan">Offline Game</button>
                <button onClick={() => onNavigate('online_setup')} className="w-full p-4 rounded-lg font-bold transition-all bg-pink-500 text-white shadow-lg button-glow button-glow-pink">Online Game</button>
                <button onClick={onShowHelp} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple transition-all text-lg">How to Play</button>
            </div>
            
            <div className="text-center text-xs text-gray-500 pt-2">
                <p className="mb-2">Version 1.0</p>
                <div className="flex justify-center items-center flex-wrap gap-x-3 gap-y-1">
                    <button onClick={onShowPrivacy} className="hover:text-gray-300 transition-colors">Privacy Policy</button>
                    <span className="text-gray-600" aria-hidden="true">|</span>
                    <button onClick={onShowCopyright} className="hover:text-gray-300 transition-colors">Copyright Policy</button>
                    <span className="text-gray-600" aria-hidden="true">|</span>
                    <button onClick={onShowAbout} className="hover:text-gray-300 transition-colors">About Me</button>
                </div>
            </div>
        </div>
    );
};

const WaitingForOpponentModal: React.FC<{
    gameId: string | null;
    hasTimeout: boolean;
    mode: 'create' | 'find' | null;
    onCancelSearch?: () => void;
    onCancelCreateGame?: () => void;
}> = ({ gameId, hasTimeout, mode, onCancelSearch, onCancelCreateGame }) => {
    const [linkCopied, setLinkCopied] = useState(false);
    const isFindingMatch = mode === 'find';
    const initialTime = isFindingMatch ? 3 * 60 : 5 * 60;
    const [timeLeft, setTimeLeft] = useState(initialTime);

    // Use document.baseURI for a more robust URL in environments that might use blob URLs.
    const baseUrl = (document.baseURI || window.location.href).split('?')[0].split('#')[0];
    const joinUrl = gameId ? `${baseUrl}?join=${gameId}` : '';

    useEffect(() => {
        soundService.play(Sound.OnlineWaiting);
        const intervalId = setInterval(() => {
            soundService.play(Sound.OnlineWaiting);
        }, 5000); // sound file is 5 seconds long

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!hasTimeout || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [hasTimeout, timeLeft]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }).catch(err => {
            console.error("Could not copy text: ", err);
        });
    };

    const handleShare = async () => {
        if (!joinUrl || !gameId) return;
        soundService.play(Sound.UIClick);

        const shareData = {
            title: 'Maze Magic Game Invitation',
            text: `Let's play Maze Magic! Join my game with this link.`,
            url: joinUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                handleCopy(joinUrl);
            }
        } catch (error) {
            // Don't fall back to copy if the user cancels the share dialog.
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Sharing failed, falling back to copy:', error);
                handleCopy(joinUrl);
            }
        }
    };

    let title = '';
    if (mode === 'create') {
        title = gameId ? 'Waiting for Opponent' : 'Creating Private Match...';
    } else { // mode === 'find'
        title = 'Finding Match...';
    }
    
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

                {gameId && !isFindingMatch && (
                    <div className="pt-2">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                value={joinUrl}
                                className="flex-grow p-2 rounded-lg bg-black/30 border border-fuchsia-500/50 text-sm text-gray-300"
                                aria-label="Game invite link"
                            />
                            <button
                                onClick={handleShare}
                                className="flex-shrink-0 px-3 py-2 rounded-lg bg-pink-500 text-white font-bold button-glow button-glow-pink text-sm flex items-center gap-2"
                                aria-label={linkCopied ? "Link copied" : "Share game invite"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                </svg>
                                <span>{linkCopied ? 'Copied!' : 'Share'}</span>
                            </button>
                        </div>
                         <p className="text-xs text-gray-400 mt-2 text-left">
                           {navigator.share ? "Click Share for invite options." : "Share button not supported, link will be copied."}
                        </p>
                    </div>
                )}
                {hasTimeout && timeLeft > 0 && (
                    <p className="text-sm text-gray-400">
                        {isFindingMatch ? 'Search will time out in' : 'Game will expire in'}: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </p>
                )}
                 {(isFindingMatch && onCancelSearch || mode === 'create' && onCancelCreateGame) && (
                    <button 
                        onClick={isFindingMatch ? onCancelSearch : onCancelCreateGame} 
                        className="w-full mt-2 py-2 rounded-lg font-bold text-white bg-orange-500 button-glow button-glow-orange"
                    >
                        {isFindingMatch ? 'Cancel Search' : 'Cancel Game'}
                    </button>
                )}
            </div>
        </Modal>
    );
};

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

const LocalGameSetup: React.FC<{ playerName: string; onStartGame: Function; onBack: () => void; onShowComingSoon: () => void; }> = (props) => {
    const [mode, setMode] = useState<GameMode>(GameMode.PVC);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [aiType] = useState<AiType>(AiType.LOCAL); // Gemini is coming soon
    const [startPos, setStartPos] = useState<StartPosition>(StartPosition.CENTER);
    const [duration, setDuration] = useState(60);
    const [walls, setWalls] = useState(10);
    const [p2Name, setP2Name] = useState('Player 2');
    const minTime = 30;

    const withSound = (onClick: (...args: any[]) => void) => {
        return (...args: any[]) => {
            soundService.play(Sound.UIClick);
            onClick(...args);
        };
    };

    const handleStartGame = () => {
        props.onStartGame(mode, difficulty, props.playerName || 'Player 1', p2Name || 'Player 2', aiType, duration, startPos, walls);
    };

    useEffect(() => { if (duration < minTime) setDuration(minTime); }, [duration, minTime]);

    return (
      <div className="space-y-4 animate-fade-in-down">
          <BackButton onClick={props.onBack} />
          <h2 className="text-2xl font-bold text-center text-white pt-8">Offline Game Setup</h2>
          
          <div className="flex gap-4">
              <SetupButton active={mode === GameMode.PVP} onClick={withSound(() => setMode(GameMode.PVP))} color="cyan">Player vs Player</SetupButton>
              <SetupButton active={mode === GameMode.PVC} onClick={withSound(() => setMode(GameMode.PVC))} color="pink">Player vs AI</SetupButton>
          </div>
          
          {mode === GameMode.PVP && (
            <div className="animate-fade-in-down space-y-3">
                <p className="font-semibold text-gray-300 block">Player 1: <span className="text-white font-bold">{props.playerName || 'Player 1'}</span></p>
                <div>
                  <label htmlFor="p2Name" className="font-semibold text-gray-300 block mb-2">Player 2 Name</label>
                  <input type="text" id="p2Name" value={p2Name} onChange={(e) => setP2Name(e.target.value)} className="w-full p-3 rounded-lg bg-black/30 border-2 border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition" placeholder="Enter Player 2 name" />
                </div>
            </div>
          )}

          {mode === GameMode.PVC && (
              <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-gray-300 mb-2">AI Type</h3>
                      <div className="flex gap-4">
                          <SetupButton active={true} onClick={() => {}} color="dark">Local (Offline)</SetupButton>
                          <SetupButton active={false} onClick={props.onShowComingSoon} color="fuchsia">Gemini AI</SetupButton>
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
          <button onClick={handleStartGame} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg button-glow button-glow-green text-xl">Start Game</button>
      </div>
    );
}

const OnlineGameSetup: React.FC<{ playerName: string; onCreateGame: (...args: any[]) => void; onJoinGame: (...args: any[]) => void; onFindMatch: (...args: any[]) => void; onBack: () => void; }> = (props) => {
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
