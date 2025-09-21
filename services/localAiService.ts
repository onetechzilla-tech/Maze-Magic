
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
    isValidWallPlacement: (wall: Wall) => boolean,
    difficulty: Difficulty
): { wall: Omit<Wall, 'playerId'>; score: number } | null => {
    const myPathLength = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position)?.length || Infinity;
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);

    if (!humanPath || humanPath.length < 2) return null;

    let bestWall: Omit<Wall, 'playerId'> | null = null;
    let bestScore = -Infinity;
    
    const lookahead = difficulty === Difficulty.HARD ? 10 : 6;

    // Look a few steps ahead on the opponent's path to find critical choke points.
    const pathSegmentsToAnalyze = humanPath.slice(0, Math.min(humanPath.length - 1, lookahead));

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
    // --- 1. Basic Setup & Pathfinding ---
    const myPath = findShortestPath(aiPlayer.position, aiPlayer.goalRow, walls, humanPlayer.position);
    const humanPath = findShortestPath(humanPlayer.position, humanPlayer.goalRow, walls, aiPlayer.position);
    const myPathLength = myPath?.length || Infinity;
    const humanPathLength = humanPath?.length || Infinity;
    
    const possibleMoves = getPossibleMoves(aiPlayer.position, walls, humanPlayer.position);
    const bestMove = myPath && myPath.length > 1 ? myPath[1] : possibleMoves[0];

    // --- 2. Handle Trapped State ---
    if (!bestMove) {
        return { action: 'PASS', reasoning: getRandomMessage('trapped') };
    }
    
    const isJump = Math.abs(aiPlayer.position.r - bestMove.r) > 1 || Math.abs(aiPlayer.position.c - bestMove.c) > 1;
    const defaultMoveAction: AiAction = {
        action: 'MOVE',
        position: bestMove,
        reasoning: isJump ? getRandomMessage('jumping') : getRandomMessage('defaultMove'),
    };

    // --- 3. EASY Difficulty ---
    if (difficulty === Difficulty.EASY) {
        const isHumanWinning = humanPathLength < myPathLength;

        // If the human is winning, there's a 33% chance to try and block them.
        if (aiPlayer.wallsLeft > 0 && isHumanWinning && Math.random() < 0.33) {
            const bestWallToBlock = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement, difficulty);
            
            if (bestWallToBlock) {
                 return {
                    action: 'PLACE_WALL',
                    position: bestWallToBlock.wall,
                    orientation: bestWallToBlock.wall.orientation,
                    reasoning: "Trying to slow you down! 😈"
                };
            }
        }
        
        // Otherwise, just make a simple move forward.
        return defaultMoveAction;
    }

    // --- 4. MEDIUM & HARD Difficulty Shared Logic ---
    if (aiPlayer.wallsLeft === 0) {
        return defaultMoveAction; // No walls, must move
    }

    const bestWallDetails = findBestBlockingWall(aiPlayer, humanPlayer, walls, isValidWallPlacement, difficulty);

    // --- 5. MEDIUM Difficulty ---
    if (difficulty === Difficulty.MEDIUM) {
        const isLosingOrTied = myPathLength >= humanPathLength;
        const hasWallAdvantage = aiPlayer.wallsLeft > humanPlayer.wallsLeft;

        if (isLosingOrTied && bestWallDetails && bestWallDetails.score > 0) {
            // Place a wall if it's a good block (score > 1), or if we are not winning and have a wall advantage.
            if (bestWallDetails.score > 1 || hasWallAdvantage) {
                return {
                    action: 'PLACE_WALL',
                    position: bestWallDetails.wall,
                    orientation: bestWallDetails.wall.orientation,
                    reasoning: getRandomMessage('blocking')
                };
            }
        }
    }
    
    // --- 6. HARD Difficulty ---
    if (difficulty === Difficulty.HARD) {
        // If about to win, just win.
        if (myPathLength <= 2) {
             defaultMoveAction.reasoning = getRandomMessage('winning');
             return defaultMoveAction;
        }

        const advantage = humanPathLength - myPathLength;
        const hasWallAdvantage = aiPlayer.wallsLeft > humanPlayer.wallsLeft;

        // Only consider placing a wall if a beneficial one exists
        if (bestWallDetails && bestWallDetails.score > 0) {
            const wallAction: AiAction = {
                action: 'PLACE_WALL',
                position: bestWallDetails.wall,
                orientation: bestWallDetails.wall.orientation,
                reasoning: getRandomMessage('blocking'),
            };

            // State: LOSING (advantage < 0)
            // Be very aggressive with walls. If there's any good wall, use it.
            if (advantage < 0) {
                return wallAction;
            }

            // State: TIED or SLIGHTLY WINNING (0 <= advantage <= 2)
            // Be strategic. Place a wall if it's a high-impact move, or if we have a wall advantage.
            if (advantage <= 2) {
                if (bestWallDetails.score >= 2) return wallAction; // A good impact wall
                if (hasWallAdvantage) return wallAction; // Press the resource advantage
            }
            
            // State: WINNING (advantage > 2)
            // Be conservative. Only place a wall if it's an overwhelmingly good move or a necessary defense.
            if (advantage > 2) {
                if (humanPathLength <= 3) return wallAction; // Opponent is getting close, must block.
                if (bestWallDetails.score > 4) return wallAction; // A "killer" move that seals the deal.
            }
        }
    }

    // --- 7. Fallback to default move with better reasoning ---
    if (myPathLength <= humanPathLength) {
        defaultMoveAction.reasoning = getRandomMessage('winning');
    } else if (myPathLength > humanPathLength + 3) {
        defaultMoveAction.reasoning = getRandomMessage('losing');
    }
    return defaultMoveAction;
};

export default getLocalAiMove;
