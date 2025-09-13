
import { findShortestPath, getPossibleMoves } from '../utils/pathfinding';
import { Difficulty } from '../types';
import type { Player, Wall, AiAction } from '../types';

const messageTemplates = {
    winning: [
        "Victory is near! ✨",
        "Just a few more steps... ♟️",
        "I've got this in the bag. 😉",
        "Your efforts are futile. 😏",
    ],
    losing: [
        "You're surprisingly good at this. 🤔",
        "Hmm, I need to rethink my strategy. 🧐",
        "Don't get cocky. The game isn't over yet. 😠",
        "An interesting move. Let's see how it plays out. 👀",
    ],
    blocking: [
        "Blocked! Where will you go now? 🚧",
        "Nice try, but this path is closed. ⛔",
        "A wall for your troubles. Enjoy the detour! 😈",
        "Sorry, not this way. 🧱",
    ],
    jumping: [
        "Boing! Hopped right over you. 🐰",
        "Excuse me, coming through! 👋",
        "A little jump to speed things up. 🚀",
        "Leapfrog! 😄",
    ],
    defaultMove: [
        "Moving forward. Step by step. 🚶",
        "Let's try this move. 👍",
        "On the advance. ➡️",
        "Just a simple move for now. 🙂",
    ],
    trapped: [
        "Oh dear, I seem to be stuck. 😳",
        "Well, this is awkward... 😅",
        "You've cornered me! For now... 😠",
    ]
};

const getRandomMessage = (category: keyof typeof messageTemplates): string => {
    const messages = messageTemplates[category];
    return messages[Math.floor(Math.random() * messages.length)];
};


/**
 * Finds the most strategically advantageous wall placement for the AI.
 * It evaluates potential walls along the opponent's shortest path, scoring them
 * based on how much they impede the opponent versus how much they impede the AI.
 * @returns The best wall to place and its calculated strategic score, or null if no good wall is found.
 */
const findBestBlockingWall = (
    aiPlayer: Player,
    humanPlayer: Player,
    walls: Wall[],
    isValidWallPlacement: (wall: Wall) => boolean
): { wall: Omit<Wall, 'playerId'>; score: number } | null => {
    const myPathLength = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position)?.length || Infinity;
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);

    if (!humanPath || humanPath.length < 2) return null;

    let bestWall: Omit<Wall, 'playerId'> | null = null;
    let bestScore = -Infinity;

    // Look a few steps ahead on the opponent's path to find critical choke points.
    const pathSegmentsToAnalyze = humanPath.slice(0, Math.min(humanPath.length - 1, 4));

    for (let i = 0; i < pathSegmentsToAnalyze.length; i++) {
        const p1 = humanPath[i];
        const p2 = humanPath[i + 1];
        if (!p2) continue;

        const isHorizontalMove = p1.r === p2.r;
        const potentialWalls: Omit<Wall, 'playerId'>[] = [];

        if (isHorizontalMove) {
            const c = Math.min(p1.c, p2.c) + 1;
            potentialWalls.push({ r: p1.r, c, orientation: 'vertical' });
            if (p1.r > 0) potentialWalls.push({ r: p1.r - 1, c, orientation: 'vertical' });
        } else { // Vertical move
            const r = Math.min(p1.r, p2.r) + 1;
            potentialWalls.push({ r, c: p1.c, orientation: 'horizontal' });
            if (p1.c > 0) potentialWalls.push({ r, c: p1.c - 1, orientation: 'horizontal' });
        }
        
        for (const wall of potentialWalls) {
            if (isValidWallPlacement({ ...wall, playerId: aiPlayer.id })) {
                const newWalls = [...walls, { ...wall, playerId: aiPlayer.id }];
                
                const newHumanPathLength = findShortestPath(humanPlayer.position, humanPlayer.goalRow, newWalls, aiPlayer.position)?.length || Infinity;
                const newMyPathLength = findShortestPath(aiPlayer.position, aiPlayer.goalRow, newWalls, humanPlayer.position)?.length || Infinity;

                // A good wall significantly hinders the opponent without hurting the AI too much.
                // We heavily penalize walls that block our own path.
                if (newMyPathLength === Infinity) continue;

                const score = (newHumanPathLength - humanPath.length) - (newMyPathLength - myPathLength);
                if (score > bestScore) {
                    bestScore = score;
                    bestWall = wall;
                }
            }
        }
    }
    
    // Only return a wall if it provides a positive strategic advantage.
    if (bestWall && bestScore > 0) {
        return { wall: bestWall, score: bestScore };
    }

    return null;
};


const getLocalAiMove = (
    aiPlayer: Player,
    humanPlayer: Player,
    walls: Wall[],
    difficulty: Difficulty,
    isValidWallPlacement: (wall: Wall) => boolean
): AiAction => {
    // --- Step 1: Find the best possible move ---
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
    let bestMove = myPath && myPath.length > 1 ? myPath[1] : null;

    // If no path exists, find any possible move to escape.
    if (!bestMove) {
        const anyMove = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position)[0];
        if (anyMove) bestMove = anyMove;
    }

    // If no move is possible at all, the AI is trapped and must pass its turn.
    if (!bestMove) {
        return { action: 'PASS', reasoning: getRandomMessage('trapped') };
    }

    // Check if the best move is a jump
    const isJump = Math.abs(aiPlayer.position.r - bestMove.r) > 1 || Math.abs(aiPlayer.position.c - bestMove.c) > 1;

    const moveAction: AiAction = {
        action: 'MOVE',
        position: bestMove,
        reasoning: isJump ? getRandomMessage('jumping') : getRandomMessage('defaultMove'),
    };

    // --- Step 2: For EASY difficulty, always choose the best move ---
    if (difficulty === Difficulty.EASY) {
        return moveAction;
    }

    // --- Step 3: For MEDIUM & HARD, consider placing a wall ---
    if (aiPlayer.wallsLeft === 0) {
        return moveAction; // No walls left, must move.
    }
    
    const humanPathLength = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position)?.length || Infinity;
    const myPathLength = myPath?.length || Infinity;
    
    const bestWallDetails = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement);

    if (bestWallDetails) {
        const wallAction: AiAction = {
            action: 'PLACE_WALL',
            position: bestWallDetails.wall,
            orientation: bestWallDetails.wall.orientation,
            reasoning: getRandomMessage('blocking')
        };
        
        const isWinning = myPathLength <= humanPathLength;

        if (difficulty === Difficulty.HARD) {
            // If losing, place any effective wall.
            if (!isWinning && bestWallDetails.score > 0) {
                 return wallAction;
            }
            // If winning, only place a wall if it's a very strong, decisive move.
            if (isWinning && bestWallDetails.score >= 3) {
                 return wallAction;
            }
        }

        if (difficulty === Difficulty.MEDIUM) {
            // Medium AI only places a wall if it's losing and finds an obvious block.
            if (!isWinning && bestWallDetails.score > 0) {
                return wallAction;
            }
        }
    }

    // --- Step 4: If no wall was placed, determine the move's reasoning based on game state ---
    if (myPathLength <= 3) { // Close to winning
        moveAction.reasoning = getRandomMessage('winning');
    } else if (myPathLength > humanPathLength + 2) { // Losing significantly
        moveAction.reasoning = getRandomMessage('losing');
    }

    return moveAction;
};

export default getLocalAiMove;