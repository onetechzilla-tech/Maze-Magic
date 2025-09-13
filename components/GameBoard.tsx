import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Player, Position, Wall } from '../types';
import { WallPlacementGuide } from './WallPlacementGuide';

type GameBoardProps = {
  players: { [key: number]: Player };
  walls: Wall[];
  selectedPiece: Position | null;
  validMoves: Position[];
  isPlacingWall: boolean;
  wallPreview: Omit<Wall, 'playerId'> | null;
  onCellClick: (pos: Position) => void;
  onWallPreview: (wall: Omit<Wall, 'playerId'>) => void;
  onCancelWallPreview: () => void;
  currentPlayerId: 1 | 2;
};

const WALL_THICKNESS = 8; // in pixels
const GRID_GAP = 5; // in pixels

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  walls,
  selectedPiece,
  validMoves,
  isPlacingWall,
  wallPreview,
  onCellClick,
  onCancelWallPreview,
  onWallPreview,
  currentPlayerId,
}) => {
  const currentPlayerColor = players[currentPlayerId]?.color;
  
  const renderCell = (r: number, c: number) => {
    const player1 = players[1];
    const player2 = players[2];
    if (!player1 || !player2) return null;

    const isPlayer1Here = player1.position.r === r && player1.position.c === c;
    const isPlayer2Here = player2.position.r === r && player2.position.c === c;
    const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
    const isValidMove = validMoves.some(move => move.r === r && move.c === c);
    const isPlayer1Goal = r === player1.goalRow;
    const isPlayer2Goal = r === player2.goalRow;

    const goalStyle: React.CSSProperties = {};
    if (isPlayer1Goal) goalStyle.boxShadow = `inset 0 5px 15px ${player1.color}80`;
    if (isPlayer2Goal) goalStyle.boxShadow = `inset 0 -5px 15px ${player2.color}80`;


    const cellClasses = [
      'relative aspect-square rounded-sm transition-colors duration-300',
      'bg-black/10 hover:bg-white/10',
      isValidMove ? 'cursor-pointer' : '',
    ].join(' ');

    const playerPiece = (player: Player, isSelectedFlag: boolean) => (
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 z-10 ${isSelectedFlag ? 'scale-110' : 'scale-100'}`}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`w-[80%] h-[80%] rounded-full flex items-center justify-center text-white font-bold text-xl ${isSelectedFlag ? 'pulse' : ''}`}
          style={{
            backgroundColor: player.color,
            boxShadow: `0 0 10px ${player.color}, 0 0 20px ${player.color}, inset 0 0 5px rgba(255,255,255,0.5)`
          }}
        >
          <span className="font-magic text-2xl" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.5)' }}>
            {player.id}
          </span>
        </div>
      </div>
    );

    return (
      <div
        key={`cell-${r}-${c}`}
        className={cellClasses}
        style={goalStyle}
        onClick={() => {
          if (isPlacingWall) return;
          if (isValidMove) {
            onCellClick({ r, c });
          }
        }}
        aria-label={`Cell ${r}, ${c}`}
      >
        {isPlayer1Here && playerPiece(players[1], isSelected && players[1].id === currentPlayerId)}
        {isPlayer2Here && playerPiece(players[2], isSelected && players[2].id === currentPlayerId)}
        {isValidMove && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="w-1/3 h-1/3 rounded-full animate-pulse"
              style={{ 
                backgroundColor: currentPlayerColor || '#60a5fa',
                boxShadow: `0 0 8px ${currentPlayerColor}`
              }}
            ></div>
          </div>
        )}
      </div>
    );
  };

  const renderWall = (wall: Wall) => {
    const wallColor = players[wall.playerId]?.color || '#a855f7';
    const isHorizontal = wall.orientation === 'horizontal';

    const style: React.CSSProperties = isHorizontal ? {
        gridRow: wall.r + 1,
        gridColumn: `${wall.c + 1} / span 2`,
        alignSelf: 'start',
        height: `${WALL_THICKNESS}px`,
        transform: `translateY(-${WALL_THICKNESS / 2}px)`,
    } : { // Vertical
        gridRow: `${wall.r + 1} / span 2`,
        gridColumn: wall.c + 1,
        justifySelf: 'start',
        width: `${WALL_THICKNESS}px`,
        transform: `translateX(-${WALL_THICKNESS / 2}px)`,
    };

    return (
        <div
            key={`wall-${wall.orientation}-${wall.r}-${wall.c}`}
            className="rounded-full"
            style={{ 
              ...style, 
              backgroundColor: wallColor,
              boxShadow: `0 0 6px ${wallColor}, 0 0 10px ${wallColor}`
            }}
        />
    );
  };
  
  const renderGridIntersections = () => {
    const intersections = [];
    for (let r = 1; r < BOARD_SIZE; r++) {
      for (let c = 1; c < BOARD_SIZE; c++) {
        intersections.push(
          <div
            key={`dot-${r}-${c}`}
            className="rounded-full"
            style={{
              gridRow: r,
              gridColumn: c,
              justifySelf: 'end',
              alignSelf: 'end',
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--glow-purple)',
              opacity: 0.4,
              boxShadow: '0 0 8px var(--glow-purple)',
              transform: 'translate(50%, 50%)'
            }}
          />
        );
      }
    }
    return intersections;
  };

  return (
    <div className="w-full h-full p-2 bg-black/20 rounded-2xl shadow-lg border border-purple-500/30">
      <div
        className="relative grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          gap: `${GRID_GAP}px`,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%)',
        }}
      >
        <div 
          className="absolute inset-0 grid pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {renderGridIntersections()}
        </div>

        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) =>
          renderCell(Math.floor(i / BOARD_SIZE), i % BOARD_SIZE)
        )}
        
        <div 
          className="absolute inset-0 grid pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            gap: `${GRID_GAP}px`,
            zIndex: 20,
          }}
        >
            {walls.map(renderWall)}
        </div>
        
        {isPlacingWall && currentPlayerColor && (
          <WallPlacementGuide 
            playerColor={currentPlayerColor}
            existingWalls={walls}
            onWallClick={onWallPreview}
            wallPreview={wallPreview}
            onCancel={onCancelWallPreview}
          />
        )}
      </div>
    </div>
  );
};

export default GameBoard;