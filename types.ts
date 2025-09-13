


export type Player = {
  id: 1 | 2;
  name: string;
  color: string;
  position: Position;
  wallsLeft: number;
  goalRow: number;
};

export type Position = {
  r: number;
  c: number;
};

export type Wall = {
  r: number;
  c: number;
  orientation: 'horizontal' | 'vertical';
  playerId: 1 | 2;
};

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ONLINE_WAITING = 'ONLINE_WAITING',
  AWAITING_AUTH = 'AWAITING_AUTH',
}

export enum GameMode {
  PVP = 'PVP',
  PVC = 'PVC',
  PVO = 'PVO',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum AiType {
  GEMINI = 'GEMINI',
  LOCAL = 'LOCAL',
}

export enum StartPosition {
  CENTER = 'CENTER',
  RANDOM = 'RANDOM',
}

export type AiAction = {
  action: 'MOVE' | 'PLACE_WALL' | 'PASS';
  position?: Position;
  orientation?: 'horizontal' | 'vertical';
  reasoning: string;
}

// Data structure for online game state synchronization
export type OnlineGameData = {
    players: { [key: number]: Player };
    walls: Wall[];
    currentPlayerId: 1 | 2;
    winner: Player | null;
    gameTime: number;
    turnTime: number;
    timestamp: number;
    // status: 'waiting' | 'active' | 'finished';
};

// Represents an action that can be taken in an online game
export type OnlineGameAction =
  | { type: 'MOVE'; to: Position }
  | { type: 'PLACE_WALL'; wall: Omit<Wall, 'playerId'> }
  | { type: 'TIMEOUT' }
  | { type: 'FORFEIT' };