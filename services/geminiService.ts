
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty } from '../types';
import type { Player, Wall, AiAction } from '../types';

// Per coding guidelines, initialize the AI client with an API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getAiMove = async (
  players: { [key: number]: Player },
  aiPlayerId: 1 | 2,
  walls: Wall[],
  difficulty: Difficulty
): Promise<AiAction> => {
    
    const difficultyInstruction = {
        [Difficulty.EASY]: "Your goal is to reach your destination row. Prioritize moving your pawn forward. Only place a wall if it's an obvious block. Suggest a valid move.",
        [Difficulty.MEDIUM]: "Your goal is to win. Balance moving forward with placing walls strategically to slow down your opponent. Analyze the opponent's path.",
        [Difficulty.HARD]: "Your goal is to win by playing optimally. Analyze the board to find the shortest path for you and the longest path for your opponent. Consider defensive and offensive wall placements. Provide the best possible move (either moving your pawn or placing a wall).",
    };
  
    const humanPlayerId = aiPlayerId === 1 ? 2 : 1;
  
    const prompt = `
    You are an expert player in a magical maze game called Maze Magic.
    The board is a 9x9 grid. The coordinates are 0-indexed, from (r:0, c:0) at the top-left to (r:8, c:8) at the bottom-right.
    
    Current Game State:
    - Your Player ID: ${aiPlayerId}
    - Your Position: {r: ${players[aiPlayerId].position.r}, c: ${players[aiPlayerId].position.c}}
    - Your Goal: Reach any cell in row ${players[aiPlayerId].goalRow}
    - Your Walls Left: ${players[aiPlayerId].wallsLeft}
    
    - Opponent Player ID: ${humanPlayerId}
    - Opponent Position: {r: ${players[humanPlayerId].position.r}, c: ${players[humanPlayerId].position.c}}
    - Opponent Goal: Reach any cell in row ${players[humanPlayerId].goalRow}
    - Opponent Walls Left: ${players[humanPlayerId].wallsLeft}
    
    - Existing Walls: ${JSON.stringify(walls)}
      - A wall at {r, c, orientation: 'horizontal'} is between row 'r-1' and 'r', starting at column 'c' and spanning to 'c+1'.
      - A wall at {r, c, orientation: 'vertical'} is between column 'c-1' and 'c', starting at row 'r' and spanning to 'r+1'.
      
    Rules for your turn:
    1. You can either MOVE your pawn or PLACE a wall.
    2. Move Rules:
       - Standard Move: One step orthogonally (up, down, left, right) to an empty, unblocked space.
       - Jumping: If your pawn is adjacent to the opponent's pawn (with no wall between), you can jump over them to the next space in a straight line.
       - Diagonal Jump: If a straight jump is blocked by a wall or the edge of the board, you can move to either valid, empty space diagonally adjacent to the opponent.
       - You cannot move into a space occupied by the opponent.
    3. Place Wall: Place a 2-unit long wall. A wall placement is INVALID if it completely blocks all paths to the goal for EITHER player. Walls cannot overlap or cross each other.
    
    Difficulty Level: ${difficulty}
    ${difficultyInstruction[difficulty]}

    Your task is to respond with a JSON object that represents the best action for your turn.
    - For a MOVE action, provide the destination coordinates. The 'orientation' property should be omitted.
    - For a PLACE_WALL action, you MUST provide the wall's top-left coordinates and its 'orientation' ('horizontal' or 'vertical').
    - Include a brief 'reasoning' for your choice.
  `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["MOVE", "PLACE_WALL"] },
            position: {
                type: Type.OBJECT,
                properties: {
                    r: { type: Type.INTEGER },
                    c: { type: Type.INTEGER },
                },
                required: ["r", "c"],
            },
            orientation: { type: Type.STRING, enum: ["horizontal", "vertical"] },
            reasoning: { type: Type.STRING },
        },
        required: ["action", "position", "reasoning"],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonStr = response.text;
        const action = JSON.parse(jsonStr) as AiAction;

        if (!action || !action.action || !action.position || !action.reasoning) {
            throw new Error("AI returned an incomplete or invalid action.");
        }
        return action;

    } catch (error: any) {
        console.error("Error fetching AI move from Gemini:", error);
        if (error.message && (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429'))) {
            throw new Error("AI request limit reached. Please try again in a minute.");
        }
        throw new Error(error.message || "An unknown error occurred while contacting the AI.");
    }
};

export default getAiMove;
