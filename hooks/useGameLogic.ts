


import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BOARD_SIZE } from '../constants';
// Removed static import: import getAiMove from '../services/geminiService';
import getLocalAiMove from '../services/localAiService';
import { onlineService } from '../services/onlineService';
import { findShortestPath, getPossibleMoves } from '../utils/pathfinding';
import type { Player, Position, Wall, AiAction, OnlineGameData, OnlineGameAction, OnlineEmojiEvent } from '../types';
import { GameState, GameMode, Difficulty, AiType, StartPosition } from '../types';
import { soundService, Sound } from '../services/soundService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const emojiSounds: Record<string, Sound> = {
  '😂': Sound.EmojiLaugh,
  '🤔': Sound.EmojiThink,
  '🤯': Sound.EmojiMindBlown,
  '😎': Sound.EmojiCool,
  '👋': Sound.EmojiWave,
  '❤️': Sound.EmojiLove,
  '😡': Sound.EmojiAngry,
  '⏳': Sound.EmojiWaiting,
};

const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [aiType, setAiType] = useState<AiType>(AiType.LOCAL);
  const [startPosition, setStartPosition] = useState<StartPosition>(StartPosition.CENTER);
  const [players, setPlayers] = useState<{ [key: number]: Player }>({});
  const [walls, setWalls] = useState<Wall[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [isPlacingWall, setIsPlacingWall] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAiAction, setLastAiAction] = useState<AiAction | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [turnTime, setTurnTime] = useState(60);
  const [configuredTurnTime, setConfiguredTurnTime] = useState(60);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [wallPlacementError, setWallPlacementError] = useState<string | null>(null);
  const [wallPreview, setWallPreview] = useState<Omit<Wall, 'playerId'> | null>(null);
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<1 | 2 | null>(null);
  const [onlineRequestTimeout, setOnlineRequestTimeout] = useState<number | null>(null);
  const [initialWalls, setInitialWalls] = useState(10);
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);
  const [lastStateTimestamp, setLastStateTimestamp] = useState(0);
  const [turnNumber, setTurnNumber] = useState(1);
  const [travelingEmoji, setTravelingEmoji] = useState<{ emoji: string; fromPlayerId: 1 | 2; key: number } | null>(null);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  
  const lastStateTimestampRef = useRef(lastStateTimestamp);
  const lastTurnNumberRef = useRef(turnNumber);
  const isJoinCancelled = useRef(false);

  useEffect(() => {
    lastStateTimestampRef.current = lastStateTimestamp;
  }, [lastStateTimestamp]);
  
  useEffect(() => {
    lastTurnNumberRef.current = turnNumber;
  }, [turnNumber]);


  const resetGameState = useCallback((isForfeit: boolean = false) => {
    setWalls([]);
    setCurrentPlayerId(1);
    setWinner(null);
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setLastAiAction(null);
    setApiError(null);
    setGameTime(0);
    setTurnTime(configuredTurnTime);
    setTravelingEmoji(null);
    
    if(onlineRequestTimeout) clearTimeout(onlineRequestTimeout);
    setOnlineRequestTimeout(null);

    if(onlineGameId && !isForfeit) {
        onlineService.leaveGame(onlineGameId);
    }
    setOnlineGameId(null);
    setOnlinePlayerId(null);
    setPendingJoinId(null);
    setLastStateTimestamp(0);
    setTurnNumber(1);

  }, [configuredTurnTime, onlineGameId, onlineRequestTimeout]);
  
  const applyActionToState = useCallback((state: OnlineGameData, action: OnlineGameAction, actionByPlayerId: 1 | 2): OnlineGameData => {
    const newState = JSON.parse(JSON.stringify(state)); // Deep clone
    if (newState.winner) return state; // If game is already won, no more actions
    if (action.type !== 'TIMEOUT' && action.type !== 'FORFEIT' && actionByPlayerId !== newState.currentPlayerId) return state; // Not your turn

    const { players, walls } = newState;
    let actionTaken = false;
    switch(action.type) {
        case 'MOVE':
            players[actionByPlayerId].position = action.to;
            if (action.to.r === players[actionByPlayerId].goalRow) {
                newState.winner = players[actionByPlayerId];
            }
            actionTaken = true;
            break;
        case 'PLACE_WALL':
            const newWall: Wall = { ...action.wall, playerId: actionByPlayerId };
            walls.push(newWall);
            players[actionByPlayerId].wallsLeft--;
            actionTaken = true;
            break;
        case 'TIMEOUT':
        case 'FORFEIT':
            newState.winner = players[actionByPlayerId === 1 ? 2 : 1];
            break;
    }

    if (!newState.winner && actionTaken) {
        newState.currentPlayerId = actionByPlayerId === 1 ? 2 : 1;
        newState.turnNumber = (state.turnNumber || 0) + 1;
    }
    newState.turnTime = configuredTurnTime;
    newState.timestamp = Date.now();
    return newState;
  }, [configuredTurnTime]);

  const cancelJoin = useCallback(() => {
    setPendingJoinId(null);
  }, []);

  const returnToMenu = useCallback(() => {
    if (gameState === GameState.PLAYING && gameMode === GameMode.PVO && onlineGameId && onlinePlayerId && !winner) {
        // Handle Forfeit
        const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime, timestamp: lastStateTimestamp, turnNumber };
        const forfeitState = applyActionToState(currentState, { type: 'FORFEIT' }, onlinePlayerId);
        // Publish the final "forfeit" state and then clear the game from the server
        onlineService.leaveGame(onlineGameId, forfeitState);
        setGameState(GameState.MENU);
        resetGameState(true); // 'true' prevents resetGameState from calling leaveGame again
    } else {
        // Handle normal return to menu or game over
        setGameState(GameState.MENU);
        resetGameState(false);
    }
  }, [resetGameState, gameState, gameMode, onlineGameId, onlinePlayerId, winner, players, walls, currentPlayerId, gameTime, turnTime, applyActionToState, lastStateTimestamp, turnNumber]);

  const initializeLocalGame = useCallback((mode: GameMode, p1Name: string = 'Player 1', p2Name: string = 'Player 2', selectedAiType: AiType, selectedDifficulty: Difficulty, duration: number, startPos: StartPosition, wallsCount: number) => {
    resetGameState();
    let finalP2Name = p2Name;

    if (mode === GameMode.PVC) {
        if (selectedAiType === AiType.GEMINI) {
            const difficultyString = selectedDifficulty.charAt(0) + selectedDifficulty.slice(1).toLowerCase();
            finalP2Name = `Gemini AI (${difficultyString})`;
        } else {
            switch (selectedDifficulty) {
                case Difficulty.EASY:
                    finalP2Name = 'AI (Easy)';
                    break;
                case Difficulty.MEDIUM:
                    finalP2Name = 'AI (Medium)';
                    break;
                case Difficulty.HARD:
                    finalP2Name = 'AI (Hard)';
                    break;
                default:
                    finalP2Name = 'AI'; // Fallback
                    break;
            }
        }
    }
    setInitialWalls(wallsCount);

    const p1Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
    const p2Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : (BOARD_SIZE - 1) - p1Col;
    
    const p1: Player = { id: 1, name: p1Name, color: '#22d3ee', position: { r: BOARD_SIZE - 1, c: p1Col }, wallsLeft: wallsCount, goalRow: 0 };
    const p2: Player = { id: 2, name: finalP2Name, color: '#ec4899', position: { r: 0, c: p2Col }, wallsLeft: wallsCount, goalRow: BOARD_SIZE - 1 };

    setPlayers({ 1: p1, 2: p2 });
    setConfiguredTurnTime(duration);
    setTurnTime(duration);
    setGameState(GameState.PLAYING);
  }, [resetGameState]);
  
  const isValidWallPlacement = useCallback((wall: Wall, currentWalls: Wall[], p1: Player, p2: Player, perspectivePlayerId?: 1 | 2): true | string => {
    const player = p1.id === wall.playerId ? p1 : p2;
    if (!player || player.wallsLeft <= 0) return "You have no walls left.";
    
    if (wall.orientation === 'horizontal' && (wall.c < 0 || wall.c >= BOARD_SIZE - 1 || wall.r <= 0 || wall.r >= BOARD_SIZE)) return "Wall placement is out of bounds.";
    if (wall.orientation === 'vertical' && (wall.r < 0 || wall.r >= BOARD_SIZE - 1 || wall.c <= 0 || wall.c >= BOARD_SIZE)) return "Wall placement is out of bounds.";

    for (const w of currentWalls) {
        if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return "A wall already exists there.";
        
        if (wall.orientation === 'horizontal') {
            if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return "Walls cannot overlap.";
            if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return "Walls cannot cross each other.";
        } else { // vertical
            if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return "Walls cannot overlap.";
            if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return "Walls cannot cross each other.";
        }
    }

    const newWalls = [...currentWalls, wall];
    const p1PathExists = findShortestPath(p1.position, p1.goalRow, newWalls, p2.position) !== null;
    if (!p1PathExists) {
        if (gameMode === GameMode.PVP && perspectivePlayerId) {
             return p1.id === perspectivePlayerId ? "This wall would trap you." : `This wall would trap your opponent (${p1.name}).`;
        }
        return `This wall would trap ${p1.name}.`;
    }

    const p2PathExists = findShortestPath(p2.position, p2.goalRow, newWalls, p1.position) !== null;
    if (!p2PathExists) {
        if (gameMode === GameMode.PVP && perspectivePlayerId) {
             return p2.id === perspectivePlayerId ? "This wall would trap you." : `This wall would trap your opponent (${p2.name}).`;
        }
        return `This wall would trap ${p2.name}.`;
    }
    
    return true;
  }, [gameMode]);

  const switchTurn = useCallback(() => {
    setCurrentPlayerId(prev => (prev === 1 ? 2 : 1));
    setSelectedPiece(null);
    setValidMoves([]);
    setIsPlacingWall(false);
    setWallPlacementError(null);
    setWallPreview(null);
    setTurnTime(configuredTurnTime);
  }, [configuredTurnTime]);

  const calculateValidMoves = useCallback((pos: Position) => {
    if (!players[1] || !players[2]) return;
    const opponentPos = players[currentPlayerId === 1 ? 2 : 1].position;
    const valid = getPossibleMoves(pos, walls, opponentPos);
    setValidMoves(valid);
  }, [players, walls, currentPlayerId]);
  
  // --- Perspective Transformation Logic for Online Games (180-degree rotation) ---
  const isPlayer2Perspective = gameMode === GameMode.PVO && onlinePlayerId === 2;
  
  const transformPosition = useCallback((pos: Position | null): Position | null => {
      if (!pos || !isPlayer2Perspective) return pos;
      return { r: BOARD_SIZE - 1 - pos.r, c: BOARD_SIZE - 1 - pos.c };
  }, [isPlayer2Perspective]);

  const untransformPosition = transformPosition; // The function is its own inverse

  const transformWall = useCallback((wall: Omit<Wall, 'playerId'> | null): Omit<Wall, 'playerId'> | null => {
      if (!wall || !isPlayer2Perspective) return wall;
      if (wall.orientation === 'horizontal') {
          return {
              ...wall,
              r: BOARD_SIZE - wall.r,
              c: BOARD_SIZE - 2 - wall.c,
          };
      }
      // vertical wall
      return {
          ...wall,
          r: BOARD_SIZE - 2 - wall.r,
          c: BOARD_SIZE - wall.c,
      };
  }, [isPlayer2Perspective]);

  const untransformWall = transformWall; // This is also its own inverse

  const updateStateFromOnline = useCallback((data: OnlineGameData) => {
      const localTurnNumber = lastTurnNumberRef.current;
      const localTimestamp = lastStateTimestampRef.current;
      
      // Guard against old or out-of-order state updates.
      // The turn number is the primary source of truth.
      if (data.turnNumber < localTurnNumber) {
          return; // Received an old turn, ignore.
      }
      // If turn numbers are the same, use timestamp as a tie-breaker.
      // This handles non-turn-based updates (like timer sync) and echoes.
      if (data.turnNumber === localTurnNumber && data.timestamp <= localTimestamp) {
          return;
      }

      setPlayers(data.players);
      setWalls(data.walls);
      setCurrentPlayerId(data.currentPlayerId);
      setWinner(data.winner);
      setGameTime(data.gameTime);
      setTurnTime(data.turnTime);
      setLastStateTimestamp(data.timestamp);
      setTurnNumber(data.turnNumber);
      
      const gameHasStarted = data.players && data.players[1] && data.players[2];
      
      if(gameHasStarted && data.players[1] && typeof data.players[1].wallsLeft === 'number'){
          setInitialWalls(data.players[1].wallsLeft);
      }

      if (gameHasStarted) {
          if (onlineRequestTimeout) {
            clearTimeout(onlineRequestTimeout);
            setOnlineRequestTimeout(null);
          }
      }

      if (data.winner) {
          setGameState(GameState.GAME_OVER);
      } else if (gameHasStarted) {
          setGameState(currentGameState => 
              currentGameState === GameState.ONLINE_WAITING || currentGameState === GameState.MENU ? GameState.PLAYING : currentGameState
          );
      }
  }, [onlineRequestTimeout]);

  const handleMove = useCallback((to: Position, from?: Position) => {
    // Untransform coordinates from display-space to true-space if needed
    const realTo = untransformPosition(to)!;
    const realFrom = from ? untransformPosition(from)! : selectedPiece!;

    if (!realFrom || !players[1] || !players[2] || (gameMode === GameMode.PVO && currentPlayerId !== onlinePlayerId)) return;

    const opponentPos = players[currentPlayerId === 1 ? 2 : 1].position;
    const possibleMoves = getPossibleMoves(realFrom, walls, opponentPos);
    const moveIsValid = possibleMoves.some(move => move.r === realTo.r && move.c === realTo.c);

    if (moveIsValid) {
        soundService.play(Sound.MovePawn);
        if (gameMode === GameMode.PVO && onlineGameId && onlinePlayerId) {
            const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime, timestamp: lastStateTimestamp, turnNumber };
            const nextState = applyActionToState(currentState, { type: 'MOVE', to: realTo }, onlinePlayerId);
            updateStateFromOnline(nextState); // Optimistic local update
            onlineService.publishGameState(onlineGameId, nextState);
        } else {
            const updatedPlayers = { ...players };
            updatedPlayers[currentPlayerId].position = realTo;
            setPlayers(updatedPlayers);
            if (realTo.r === players[currentPlayerId].goalRow) {
                setWinner(players[currentPlayerId]);
                setGameState(GameState.GAME_OVER);
            } else {
                switchTurn();
            }
        }
    }
    setSelectedPiece(null);
    setValidMoves([]);
  }, [players, walls, selectedPiece, currentPlayerId, switchTurn, gameMode, onlineGameId, onlinePlayerId, winner, gameTime, turnTime, applyActionToState, untransformPosition, updateStateFromOnline, lastStateTimestamp, turnNumber]);

  const handlePlaceWall = useCallback((wall: Omit<Wall, 'playerId'>) => {
    // Untransform wall from display-space to true-space
    const realWall = untransformWall(wall)!;

    if (!players[1] || !players[2] || (gameMode === GameMode.PVO && currentPlayerId !== onlinePlayerId)) return;
    setWallPlacementError(null);
    const newWall: Wall = { ...realWall, playerId: currentPlayerId };
    
    const validationResult = isValidWallPlacement(newWall, walls, players[1], players[2], currentPlayerId);
    if (validationResult !== true) {
        setWallPlacementError(validationResult);
        return;
    }

    soundService.play(Sound.PlaceWall);
    if(gameMode === GameMode.PVO && onlineGameId && onlinePlayerId) {
        const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime, timestamp: lastStateTimestamp, turnNumber };
        const nextState = applyActionToState(currentState, { type: 'PLACE_WALL', wall: realWall }, onlinePlayerId);
        updateStateFromOnline(nextState); // Optimistic local update
        onlineService.publishGameState(onlineGameId, nextState);
    } else {
      setWalls(prev => [...prev, newWall]);
      setPlayers(prev => ({
          ...prev,
          [currentPlayerId]: { ...prev[currentPlayerId], wallsLeft: prev[currentPlayerId].wallsLeft - 1, },
      }));
      switchTurn();
    }
    setIsPlacingWall(false);
  }, [players, walls, currentPlayerId, isValidWallPlacement, switchTurn, gameMode, onlineGameId, onlinePlayerId, winner, gameTime, turnTime, applyActionToState, untransformWall, updateStateFromOnline, lastStateTimestamp, turnNumber]);

  useEffect(() => {
      if (onlineGameId) {
          const unsubscribe = onlineService.onGameStateUpdate(onlineGameId, updateStateFromOnline);
          return () => unsubscribe();
      }
  }, [onlineGameId, updateStateFromOnline]);

  const handleCreateOnlineGame = useCallback(async (p1Name: string, duration: number, startPos: StartPosition, wallsCount: number) => {
    resetGameState();
    setGameMode(GameMode.PVO);
    setInitialWalls(wallsCount);
    const p1Col = startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
    const p1: Player = { id: 1, name: p1Name, color: '#22d3ee', position: { r: BOARD_SIZE - 1, c: p1Col }, wallsLeft: wallsCount, goalRow: 0 };
    setPlayers({ 1: p1 });
    setConfiguredTurnTime(duration);
    setGameState(GameState.ONLINE_WAITING);
    
    const gameId = await onlineService.createGame(p1, duration, startPos);
    setOnlineGameId(gameId);
    setOnlinePlayerId(1);

    const timeout = window.setTimeout(() => {
        setApiError("Game creation timed out. The link has expired.");
        returnToMenu();
    }, 5 * 60 * 1000); // 5 minutes
    setOnlineRequestTimeout(timeout);
  }, [resetGameState, returnToMenu]);

  const handleJoinOnlineGame = useCallback(async (gameId: string, p2Name: string) => {
      isJoinCancelled.current = false;
      setIsJoiningGame(true);
      try {
          const initialState = await onlineService.joinGame(gameId, p2Name);
          if (isJoinCancelled.current) return;

          if (initialState) {
            setOnlineGameId(gameId);
            setOnlinePlayerId(2);
            setPendingJoinId(null);
            setConfiguredTurnTime(initialState.turnTime);
            setInitialWalls(initialState.players[1].wallsLeft);
            setGameMode(GameMode.PVO);
            updateStateFromOnline(initialState);
          } else {
            setApiError("Could not join the game.");
            setPendingJoinId(null);
          }
      } finally {
          if (!isJoinCancelled.current) {
            setIsJoiningGame(false);
          }
      }
  }, [updateStateFromOnline]);
  
  const cancelJoinAttempt = useCallback(() => {
    isJoinCancelled.current = true;
    setIsJoiningGame(false);
  }, []);

  const handleFindMatch = useCallback(async (pName: string, duration: number, startPos: StartPosition, wallsCount: number) => {
    resetGameState();
    setGameMode(GameMode.PVO);
    const p: Omit<Player, 'id' | 'color' | 'position' | 'goalRow'> = { name: pName, wallsLeft: wallsCount };

    setGameState(GameState.ONLINE_WAITING);
    setConfiguredTurnTime(duration);
    
    onlineService.findMatch(p, duration, startPos, (gameId, playerId, initialState) => {
        if (onlineRequestTimeout) {
            clearTimeout(onlineRequestTimeout);
            setOnlineRequestTimeout(null);
        }
        setOnlineGameId(gameId);
        setOnlinePlayerId(playerId);
        updateStateFromOnline(initialState);
    });
    
    const timeout = window.setTimeout(() => {
        setApiError("Could not find a match. Please try again later.");
        onlineService.cancelFindMatch();
        returnToMenu();
    }, 3 * 60 * 1000); // 3 minutes
    setOnlineRequestTimeout(timeout);
  }, [resetGameState, updateStateFromOnline, returnToMenu, onlineRequestTimeout]);
  
  const handleCancelFindMatch = useCallback(() => {
    onlineService.cancelFindMatch();
    returnToMenu();
  }, [returnToMenu]);

  const handleCancelCreateGame = useCallback(() => {
    returnToMenu();
  }, [returnToMenu]);

  useEffect(() => {
    const isHumanTurn = (gameMode !== GameMode.PVC || currentPlayerId === 1) && (gameMode !== GameMode.PVO || currentPlayerId === onlinePlayerId);
    if (gameState === GameState.PLAYING && !isPlacingWall && !winner && isHumanTurn) {
        const currentPlayer = players[currentPlayerId];
        if (currentPlayer) {
          setSelectedPiece(currentPlayer.position);
          calculateValidMoves(currentPlayer.position);
        }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [currentPlayerId, gameState, gameMode, players, isPlacingWall, winner, calculateValidMoves, onlinePlayerId]);

  const executeAiMove = useCallback(async () => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.PVC || currentPlayerId !== 2 || winner || !players[1] || !players[2]) return;
    
    setAiThinking(true);
    setLastAiAction(null);
    setApiError(null);

    // Add a random "thinking" delay ONLY for the local AI to feel more human.
    // Gemini AI has natural network latency, so no artificial delay is needed.
    if (aiType === AiType.LOCAL) {
      const randomDelay = Math.random() * 1000 + 1000; // 1 to 2 seconds
      await delay(randomDelay);
    }

    try {
        let aiAction: AiAction;
        if (aiType === AiType.LOCAL) {
            const checkWall = (wall: Wall) => isValidWallPlacement(wall, walls, players[1], players[2], 2) === true;
            aiAction = getLocalAiMove(players[2], players[1], walls, difficulty, checkWall);
        } else {
            // Use a dynamic import to load the Gemini service only when needed.
            const { default: getAiMove } = await import('../services/geminiService');
            aiAction = await getAiMove(players, 2, walls, difficulty);
        }
        
        setLastAiAction(aiAction);
        
        if (aiAction.action === 'PASS') {
            switchTurn();
        } else if (aiAction.action === 'MOVE') {
            if (!aiAction.position) throw new Error("AI action 'MOVE' is missing position.");
            const possibleMoves = getPossibleMoves(players[2].position, walls, players[1].position);
            const moveIsValid = possibleMoves.some(m => m.r === aiAction.position.r && m.c === aiAction.position.c);
            if (moveIsValid) handleMove(aiAction.position, players[2].position);
            else throw new Error("AI suggested an invalid move.");
        } else if (aiAction.action === 'PLACE_WALL') {
            if (!aiAction.position || !aiAction.orientation) throw new Error("AI action 'PLACE_WALL' is missing properties.");
            const wallToPlace = { r: aiAction.position.r, c: aiAction.position.c, orientation: aiAction.orientation };
            if (isValidWallPlacement({ ...wallToPlace, playerId: 2 }, walls, players[1], players[2], 2) === true) handlePlaceWall(wallToPlace);
            else throw new Error("AI suggested an invalid wall placement.");
        } else {
            throw new Error(`AI returned an invalid action type.`);
        }
    } catch (error: any) {
        if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
            setShowRateLimitModal(true);
        } else {
            setApiError(error.message || "An unexpected AI error occurred. Making a default move.");
        }
        
        // --- Robust Fallback Logic ---
        const aiPlayer = players[2];
        const humanPlayer = players[1];
        const possibleMoves = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position);

        if (possibleMoves.length > 0) {
            const fallbackPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
            let moveToMake = possibleMoves[0]; 

            if (fallbackPath && fallbackPath.length > 1) {
                const bestStep = fallbackPath[1];
                if (possibleMoves.some(m => m.r === bestStep.r && m.c === bestStep.c)) {
                    moveToMake = bestStep;
                }
            }
            const updatedPlayers = { ...players };
            updatedPlayers[2].position = moveToMake;
            setPlayers(updatedPlayers);
            if (moveToMake.r === aiPlayer.goalRow) {
                setWinner(aiPlayer);
                setGameState(GameState.GAME_OVER);
            } else {
                switchTurn();
            }
        } else {
            switchTurn();
        }
    } finally {
        setAiThinking(false);
    }
  }, [gameState, gameMode, currentPlayerId, winner, players, walls, difficulty, aiType, handleMove, handlePlaceWall, isValidWallPlacement, switchTurn]);

  useEffect(() => {
    if(gameState === GameState.PLAYING && gameMode === GameMode.PVC && currentPlayerId === 2 && !winner && !aiThinking) {
      executeAiMove();
    }
  }, [currentPlayerId, gameState, gameMode, winner, executeAiMove, aiThinking]);

  useEffect(() => {
    let gameInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      gameInterval = window.setInterval(() => {
          setGameTime(prev => prev + 1)
      }, 1000);
    }
    return () => clearInterval(gameInterval);
  }, [gameState]);

  useEffect(() => {
    let turnInterval: number | undefined;
    if (gameState === GameState.PLAYING) {
      turnInterval = window.setInterval(() => {
        setTurnTime(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(turnInterval);
  }, [gameState, currentPlayerId]);

  useEffect(() => {
    if (turnTime > 0 || gameState !== GameState.PLAYING || winner) return;

    if (gameMode === GameMode.PVO) {
        if (onlineGameId && onlinePlayerId) {
            // Whoever's turn it is when the timer hits zero, that player loses.
            const losingPlayerId = currentPlayerId;
            const currentState: OnlineGameData = { players, walls, currentPlayerId, winner, gameTime, turnTime: 0, timestamp: lastStateTimestamp, turnNumber };
            const nextState = applyActionToState(currentState, { type: 'TIMEOUT' }, losingPlayerId);
            
            // We update locally and publish the result regardless of whose turn it was.
            // This prevents desync if one player disconnects.
            updateStateFromOnline(nextState);
            onlineService.publishGameState(onlineGameId, nextState);
        }
    } else {
        setWinner(players[currentPlayerId === 1 ? 2 : 1]);
        setGameState(GameState.GAME_OVER);
    }
  }, [turnTime, gameState, players, currentPlayerId, gameMode, onlinePlayerId, onlineGameId, winner, gameTime, walls, applyActionToState, updateStateFromOnline, lastStateTimestamp, turnNumber]);
  
  // Polling effect to ensure synchronization in online games
  useEffect(() => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.PVO || !onlineGameId || winner || currentPlayerId === onlinePlayerId) {
        return; // Only poll on opponent's turn in an online game
    }

    const intervalId = setInterval(async () => {
        const fetchedState = await onlineService.fetchCurrentGameState(onlineGameId);
        // The guard inside updateStateFromOnline now handles whether to apply the update,
        // preventing stale data from resetting timers.
        if (fetchedState) {
            updateStateFromOnline(fetchedState);
        }
    }, 1000); // Poll every 1 second

    return () => clearInterval(intervalId);
  }, [gameState, gameMode, onlineGameId, currentPlayerId, onlinePlayerId, winner, updateStateFromOnline]);

  const prevGameState = useRef(gameState);
  useEffect(() => {
    if (prevGameState.current !== GameState.PLAYING && gameState === GameState.PLAYING) {
        soundService.play(Sound.StartGame);
    }
    prevGameState.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!winner) return;

    if (gameMode === GameMode.PVO) {
        if (winner.id === onlinePlayerId) {
            soundService.play(Sound.WinGame);
        } else {
            soundService.play(Sound.LoseGame);
        }
    } else {
        // For local games, player 1 is the human user.
        if (winner.id === 1 || (gameMode === GameMode.PVP && winner.id === 2)) {
            soundService.play(Sound.WinGame);
        } else {
            soundService.play(Sound.LoseGame);
        }
    }
  }, [winner, gameMode, onlinePlayerId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('join');
    if (gameId) {
      setPendingJoinId(gameId);
      const cleanUrl = window.location.href.split('?')[0].split('#')[0];
      window.history.replaceState({}, document.title, cleanUrl); 
    }
  }, []);


  const handleWallPreview = useCallback((wall: Omit<Wall, 'playerId'>) => {
    setWallPlacementError(null); // Clear previous errors on new preview
    setWallPreview(wall)
  }, []);
  const confirmWallPlacement = useCallback(() => {
    if (wallPreview) {
        handlePlaceWall(wallPreview);
        setWallPreview(null);
        setIsPlacingWall(false); // Always exit placing mode after confirming
    }
  }, [wallPreview, handlePlaceWall]);

  const cancelWallPlacement = useCallback(() => {
    setWallPreview(null);
    setIsPlacingWall(false); // Exit wall placement mode completely.
  }, []);
  
  const togglePlacingWall = () => {
    if (isPlacingWall) setWallPreview(null);
    setIsPlacingWall(prev => !prev);
    setSelectedPiece(null);
    setValidMoves([]);
    setWallPlacementError(null);
  };

  const startGame = (mode: GameMode, diff: Difficulty, p1Name: string, p2Name: string, type: AiType, duration: number, startPos: StartPosition, wallsCount: number) => {
    setGameMode(mode);
    setDifficulty(diff);
    setAiType(type);
    setStartPosition(startPos);
    initializeLocalGame(mode, p1Name, p2Name, type, diff, duration, startPos, wallsCount);
  }

  // This uses the REAL currentPlayerId from state to determine if it's the user's turn.
  const isMyTurn = useMemo(() => {
    if (gameState !== GameState.PLAYING || winner) return false;
    if (gameMode === GameMode.PVO) {
        return currentPlayerId === onlinePlayerId;
    }
    if (gameMode === GameMode.PVC) {
        return currentPlayerId === 1;
    }
    return true; // For local PVP, UI is always interactive for the current player
  }, [gameState, gameMode, currentPlayerId, onlinePlayerId, winner]);

  // --- Create derived state for UI display based on perspective ---
  const displayPlayers = useMemo<{ [key: number]: Player }>(() => {
    if (!isPlayer2Perspective || !players[1] || !players[2]) {
      return players;
    }
    // For P2, swap player data and transform positions so P2 is at the bottom.
    // The player's original ID is preserved for display on the pawn.
    return {
      1: { // The player at the bottom of the screen (from P2's perspective, this is P2)
        ...players[2], // real player 2 data, includes id: 2
        position: transformPosition(players[2].position)!,
        goalRow: BOARD_SIZE - 1 - players[2].goalRow,
      },
      2: { // The player at the top of the screen (from P2's perspective, this is P1)
        ...players[1], // real player 1 data, includes id: 1
        position: transformPosition(players[1].position)!,
        goalRow: BOARD_SIZE - 1 - players[1].goalRow,
      },
    };
  }, [isPlayer2Perspective, players, transformPosition]);

  const displayWalls = useMemo(() => {
    if (!isPlayer2Perspective) {
      return walls;
    }
    return walls.map(w => {
      const transformedCoords = transformWall({ r: w.r, c: w.c, orientation: w.orientation })!;
      // Wall color depends on playerId. On a flipped board, p1's wall belongs to the player at top (display P2)
      const displayPlayerId: 1 | 2 = w.playerId === 1 ? 2 : 1;
      return { ...w, ...transformedCoords, playerId: displayPlayerId };
    });
  }, [isPlayer2Perspective, walls, transformWall]);

  const displayCurrentPlayerId = useMemo(() => {
    if (!isPlayer2Perspective) {
      return currentPlayerId;
    }
    // For Player 2, the UI needs to see the opponent (real player 1) as player 2.
    return currentPlayerId === 1 ? 2 : 1;
  }, [isPlayer2Perspective, currentPlayerId]);

  const displaySelectedPiece = useMemo(() => transformPosition(selectedPiece), [selectedPiece, transformPosition]);
  const displayValidMoves = useMemo(() => validMoves.map(m => transformPosition(m)!), [validMoves, transformPosition]);

  const handleSendEmoji = useCallback((emoji: string, pvpSenderId?: 1 | 2) => {
    if (gameState !== GameState.PLAYING) return;

    if (emojiSounds[emoji]) {
        soundService.play(emojiSounds[emoji]);
    }
    
    if (gameMode === GameMode.PVO && onlineGameId && onlinePlayerId) {
        onlineService.publishEmojiEvent(onlineGameId, emoji, onlinePlayerId);
        // Optimistically show your own sent emoji
        setTravelingEmoji({ emoji, fromPlayerId: onlinePlayerId, key: Date.now() });

    } else if (gameMode === GameMode.PVP && pvpSenderId) {
        setTravelingEmoji({ emoji, fromPlayerId: pvpSenderId, key: Date.now() });
    }
  }, [gameState, gameMode, onlineGameId, onlinePlayerId]);

  // Effect for traveling emoji
  useEffect(() => {
    if (!travelingEmoji) return;
    const timer = setTimeout(() => {
        setTravelingEmoji(null);
    }, 1500); // match animation duration
    return () => clearTimeout(timer);
  }, [travelingEmoji]);

  // Effect for online emoji subscription
  useEffect(() => {
    if (gameMode !== GameMode.PVO || !onlineGameId || !onlinePlayerId) return;

    const handleEmojiEvent = (data: OnlineEmojiEvent) => {
        // Don't show pop-up for emojis you sent yourself
        if (data.senderId === onlinePlayerId) return;

        if (emojiSounds[data.emoji]) {
            soundService.play(emojiSounds[data.emoji]);
        }

        setTravelingEmoji({ emoji: data.emoji, fromPlayerId: data.senderId, key: data.timestamp });
    };

    const unsubscribe = onlineService.onEmojiEvent(onlineGameId, handleEmojiEvent);
    return () => unsubscribe();

  }, [gameMode, onlineGameId, onlinePlayerId]);

  const clearWallPlacementError = useCallback(() => {
    setWallPlacementError(null);
  }, []);

  const clearApiError = useCallback(() => {
    setApiError(null);
  }, []);

  return {
    gameState, gameMode, difficulty, aiType, 
    currentPlayerId: displayCurrentPlayerId, // Return the transformed ID for the UI
    winner,
    players: displayPlayers, 
    walls: displayWalls, 
    selectedPiece: displaySelectedPiece,
    validMoves: displayValidMoves,
    isPlacingWall, aiThinking, lastAiAction, apiError,
    gameTime, turnTime, showRateLimitModal, wallPlacementError,
    configuredTurnTime, startPosition, wallPreview, onlineGameId, onlinePlayerId, onlineRequestTimeout,
    initialWalls,
    isMyTurn, // This is now the source of truth for UI interactivity
    pendingJoinId,
    travelingEmoji,
    isJoiningGame,
    setShowRateLimitModal,
    startGame, handleCellClick: handleMove,
    handleWallPreview,
    confirmWallPlacement, cancelWallPlacement,
    togglePlacingWall, returnToMenu,
    handleCreateOnlineGame, handleJoinOnlineGame, handleFindMatch, handleCancelFindMatch, handleCancelCreateGame,
    cancelJoin,
    cancelJoinAttempt,
    handleSendEmoji,
    clearWallPlacementError,
    clearApiError,
  };
};

export { useGameLogic };