import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Position, Wall } from '../types';

type WallPlacementGuideProps = {
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
  wallPreview: Omit<Wall, 'playerId'> | null;
  onCancel: () => void;
};

const isPlacementInvalid = (wall: Omit<Wall, 'playerId'>, existingWalls: Wall[]): boolean => {
  return existingWalls.some(w => {
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation) return true;
    
    if (wall.orientation === 'horizontal') {
        if (w.orientation === 'horizontal' && w.r === wall.r && Math.abs(w.c - wall.c) < 2) return true;
        if (w.orientation === 'vertical' && w.r === wall.r - 1 && w.c === wall.c + 1) return true;
    } else { // vertical
        if (w.orientation === 'vertical' && w.c === wall.c && Math.abs(w.r - wall.r) < 2) return true;
        if (w.orientation === 'horizontal' && w.r === wall.r + 1 && w.c === wall.c - 1) return true;
    }
    return false;
  });
};

export const WallPlacementGuide: React.FC<WallPlacementGuideProps> = ({ 
    playerColor, existingWalls, onWallClick, wallPreview, onCancel,
}) => {
    
    if (wallPreview) {
        const isHorizontal = wallPreview.orientation === 'horizontal';
        const style: React.CSSProperties = isHorizontal ? {
            gridRow: wallPreview.r + 1,
            gridColumn: `${wallPreview.c + 1} / span 2`,
            alignSelf: 'start',
            height: '8px',
            transform: 'translateY(-50%)',
        } : {
            gridRow: `${wallPreview.r + 1} / span 2`,
            gridColumn: wallPreview.c + 1,
            justifySelf: 'start',
            width: '8px',
            transform: 'translateX(-50%)',
        };
        
        return (
            <>
                <div className="absolute inset-0 z-20" onClick={onCancel} />
                <div 
                    className="absolute grid z-30 pointer-events-none"
                    style={{
                        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                        gap: `5px`,
                        inset: 0
                    }}
                >
                    <div 
                        className="rounded-full"
                        style={{
                            ...style,
                            backgroundColor: playerColor,
                            boxShadow: `0 0 12px ${playerColor}, 0 0 20px ${playerColor}`
                        }}
                    />
                </div>
            </>
        );
    }

    const guides = [];
    const WALL_GUIDE_THICKNESS = 8;
    const GUIDE_CONTAINER_SIZE = 20;


    // Horizontal Guides
    for (let r = 1; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE - 1; c++) {
            const wall = { r, c, orientation: 'horizontal' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;
            
            guides.push(
                <div
                    key={`h-guide-${r}-${c}`}
                    className="group relative flex justify-center items-center"
                    style={{ 
                        gridRow: r + 1, 
                        gridColumn: `${c + 1} / span 2`, 
                        transform: `translateY(-50%)`,
                        height: `${GUIDE_CONTAINER_SIZE}px`,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place horizontal wall at row ${r}, column ${c}`}
                >
                    <div className="absolute h-[8px] w-full opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out rounded-full group-hover:scale-y-125" style={{ backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
                </div>
            );
        }
    }
    
    // Vertical Guides
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
        for (let c = 1; c < BOARD_SIZE; c++) {
            const wall = { r, c, orientation: 'vertical' as const };
            if (isPlacementInvalid(wall, existingWalls)) continue;

            guides.push(
                <div
                    key={`v-guide-${r}-${c}`}
                    className="group relative flex justify-center items-center"
                    style={{ 
                        gridRow: `${r + 1} / span 2`, 
                        gridColumn: c + 1,
                        transform: 'translateX(-50%)',
                        width: `${GUIDE_CONTAINER_SIZE}px`,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                    }}
                    onClick={() => onWallClick(wall)}
                    aria-label={`Place vertical wall at row ${r}, column ${c}`}
                >
                    <div className="absolute w-[8px] h-full opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out rounded-full group-hover:scale-x-125" style={{ backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
                </div>
            );
        }
    }
    
    return (
        <div 
            className="absolute inset-0 grid pointer-events-none"
            style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                gap: '5px',
                zIndex: 30,
            }}
        >
            {guides}
        </div>
    );
};