
import { authService } from './authService';
import { Difficulty } from '../types';
import type { Player, Wall, AiAction } from '../types';

// Helper to convert an SDK-like schema to a REST API `FunctionDeclaration` tool.
const convertSchemaToTool = (schema: any): any => {
    const properties = JSON.parse(JSON.stringify(schema.properties)); // Deep clone

    // The REST API's JSON Schema validation expects 'NUMBER' for integers.
    const convertIntToNum = (props: any) => {
        for (const key in props) {
            if (props[key].type === 'INTEGER') {
                props[key].type = 'NUMBER';
            }
            if (props[key].type === 'OBJECT' && props[key].properties) {
                convertIntToNum(props[key].properties);
            }
        }
    };
    convertIntToNum(properties);

    return {
        functionDeclarations: [
            {
                name: "get_ai_move",
                description: "Gets the AI's action, which is either to move a pawn or place a wall.",
                parameters: {
                    type: "OBJECT",
                    properties: properties,
                    required: schema.required,
                },
            },
        ],
    };
};

const getAiMove = async (
  players: { [key: number]: Player },
  aiPlayerId: 1 | 2,
  walls: Wall[],
  difficulty: Difficulty
): Promise<AiAction> => {
    
    const accessToken = authService.getToken();
    if (!accessToken) {
        throw new Error("User not authenticated. Cannot call Gemini API.");
    }

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

    Your task is to respond with the best action for your turn by calling the 'get_ai_move' function with the appropriate arguments.
    - For a MOVE action, provide the destination coordinates. The 'orientation' property should be omitted.
    - For a PLACE_WALL action, you MUST provide the wall's top-left coordinates and its 'orientation' ('horizontal' or 'vertical').
    - Include a brief 'reasoning' for your choice.
  `;

    const schema = {
        type: 'OBJECT',
        properties: {
            action: { type: 'STRING', enum: ["MOVE", "PLACE_WALL"] },
            position: {
                type: 'OBJECT',
                properties: {
                    r: { type: 'INTEGER' },
                    c: { type: 'INTEGER' },
                },
                required: ["r", "c"],
            },
            orientation: { type: 'STRING', enum: ["horizontal", "vertical"] },
            reasoning: { type: 'STRING' },
        },
        required: ["action", "position", "reasoning"],
    };

    const requestBody = {
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }],
        tools: [convertSchemaToTool(schema)],
        tool_config: {
            function_calling_config: {
                mode: "ANY",
            },
        },
    };
  
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Gemini API Error Response:", errorData);
            if (res.status === 401 || res.status === 403) {
                authService.signOut();
                throw new Error("Authentication failed. Please sign in again.");
            }
            if (res.status === 429) {
                throw new Error("AI request limit reached. Please try again in a minute. (RESOURCE_EXHAUSTED)");
            }
            throw new Error(errorData.error?.message || `API request failed with status ${res.status}`);
        }

        const data = await res.json();
        const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

        if (!functionCall || functionCall.name !== 'get_ai_move' || !functionCall.args) {
            console.error("Invalid response structure from Gemini:", data);
            throw new Error("AI returned an invalid or unexpected response format.");
        }
        
        const action = functionCall.args as AiAction;

        if (!action || !action.action || !action.position || !action.reasoning) {
            throw new Error("AI returned an incomplete or invalid action.");
        }
        return action;

    } catch (error: any) {
        console.error("Error fetching AI move from Gemini REST API:", error);
        if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
            throw new Error("AI request limit reached. Please try again in a minute.");
        }
        throw new Error(error.message || "An unknown error occurred while contacting the AI.");
    }
};

export default getAiMove;
