
import { BOARD_SIZE } from '../constants';
import type { Position, Wall } from '../types';

// Helper to check if a move between two cells is blocked by a wall
export const isMoveBlocked = (from: Position, to: Position, walls: Wall[]): boolean => {
    const { r: fromR, c: fromC } = from;
    const { r: toR, c: toC } = to;

    if (fromR === toR) { // Horizontal move
        const wallC = Math.min(fromC, toC);
        return walls.some(w => w.orientation === 'vertical' && w.c === wallC + 1 && (w.r === fromR || w.r === fromR - 1));
    } else { // Vertical move
        const wallR = Math.min(fromR, toR);
        return walls.some(w => w.orientation === 'horizontal' && w.r === wallR + 1 && (w.c === fromC || w.c === fromC - 1));
    }
};

export const getPossibleMoves = (pos: Position, walls: Wall[], opponentPos: Position): Position[] => {
    const { r, c } = pos;
    const moves: Position[] = [];

    const potentialMoves = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];

    for (const move of potentialMoves) {
        if (move.r < 0 || move.r >= BOARD_SIZE || move.c < 0 || move.c >= BOARD_SIZE || isMoveBlocked(pos, move, walls)) {
            continue;
        }

        if (move.r === opponentPos.r && move.c === opponentPos.c) {
            // Adjacent to opponent, calculate jumps
            const dr = opponentPos.r - pos.r;
            const dc = opponentPos.c - pos.c;
            const jumpPos = { r: opponentPos.r + dr, c: opponentPos.c + dc };

            // Straight jump
            if (jumpPos.r >= 0 && jumpPos.r < BOARD_SIZE && jumpPos.c >= 0 && jumpPos.c < BOARD_SIZE && !isMoveBlocked(opponentPos, jumpPos, walls)) {
                moves.push(jumpPos);
            } else {
                // Diagonal jumps if straight is blocked
                if (dr === 0) { // Horizontal adjacency
                    const d1 = { r: opponentPos.r - 1, c: opponentPos.c };
                    const d2 = { r: opponentPos.r + 1, c: opponentPos.c };
                    if (d1.r >= 0 && !isMoveBlocked(opponentPos, d1, walls)) moves.push(d1);
                    if (d2.r < BOARD_SIZE && !isMoveBlocked(opponentPos, d2, walls)) moves.push(d2);
                } else { // Vertical adjacency
                    const d1 = { r: opponentPos.r, c: opponentPos.c - 1 };
                    const d2 = { r: opponentPos.r, c: opponentPos.c + 1 };
                    if (d1.c >= 0 && !isMoveBlocked(opponentPos, d1, walls)) moves.push(d1);
                    if (d2.c < BOARD_SIZE && !isMoveBlocked(opponentPos, d2, walls)) moves.push(d2);
                }
            }
        } else {
            moves.push(move);
        }
    }
    return moves.filter(m => m.r >= 0 && m.r < BOARD_SIZE && m.c >= 0 && m.c < BOARD_SIZE);
};


// Breadth-First Search to find the shortest path from a starting position to a goal row
export const findShortestPath = (startPos: Position, goalRow: number, walls: Wall[], opponentPos?: Position): Position[] | null => {
    const queue: Position[][] = [[startPos]];
    const visited = new Set<string>([`${startPos.r},${startPos.c}`]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const currentPos = path[path.length - 1];

        if (currentPos.r === goalRow) {
            return path;
        }

        let neighbors: Position[];
        if (opponentPos) {
            neighbors = getPossibleMoves(currentPos, walls, opponentPos);
        } else {
            neighbors = [
                { r: currentPos.r - 1, c: currentPos.c }, 
                { r: currentPos.r + 1, c: currentPos.c }, 
                { r: currentPos.r, c: currentPos.c - 1 }, 
                { r: currentPos.r, c: currentPos.c + 1 }
            ].filter(move => !isMoveBlocked(currentPos, move, walls));
        }

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.r},${neighbor.c}`;
            if (
                neighbor.r >= 0 && neighbor.r < BOARD_SIZE &&
                neighbor.c >= 0 && neighbor.c < BOARD_SIZE &&
                !visited.has(neighborKey)
            ) {
                visited.add(neighborKey);
                const newPath = [...path, neighbor];
                queue.push(newPath);
            }
        }
    }

    return null; // No path found
};
