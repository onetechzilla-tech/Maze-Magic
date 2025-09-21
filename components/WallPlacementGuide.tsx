
import React from 'react';
import { BOARD_SIZE } from '../constants';
import type { Wall } from '../types';

type WallPlacementGuideProps = {
  visible: boolean;
  playerColor: string;
  existingWalls: Wall[];
  onWallClick: (wall: Omit<Wall, 'playerId'>) => void;
  wallPreview: Omit<Wall, 'playerId'> | null;
  onCancel: () => void;
};

const isPlacementInvalid = (wall: Omit<Wall, 'playerId'>, existingWalls: Wall[]): boolean => {
  if (wall.orientation === 'horizontal' && (wall.c < 0 || wall.c >= BOARD_SIZE - 1 || wall.r <= 0 || wall.r >= BOARD_SIZE)) return true;
  if (wall.orientation === 'vertical' && (wall.r < 0 || wall.r >= BOARD_SIZE - 1 || wall.c <= 0 || wall.c >= BOARD_SIZE)) return true;
    
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
    visible, playerColor, existingWalls, onWallClick, wallPreview, onCancel,
}) => {
    
    const guides = [];
    const WALL_GUIDE_THICKNESS = 8;
    const GUIDE_CONTAINER_SIZE = 20;

    // Only generate guides if the component is visible to improve performance.
    if (visible) {
        // Horizontal Guides
        for (let r = 1; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE - 1; c++) {
                const wall = { r, c, orientation: 'horizontal' as const };
                if (isPlacementInvalid(wall, existingWalls)) continue;
                
                guides.push(
                    <div
                        key={`h-guide-${r}-${c}`}
                        className="guide-slot group"
                        style={{ 
                            gridRow: r + 1, 
                            gridColumn: `${c + 1} / span 2`, 
                            transform: `translateY(-50%)`,
                            height: `${GUIDE_CONTAINER_SIZE}px`,
                        }}
                        onClick={() => onWallClick(wall)}
                        aria-label={`Place horizontal wall at row ${r}, column ${c}`}
                    >
                        <div className="guide-hover-effect" style={{ height: `${WALL_GUIDE_THICKNESS}px`, width: '100%', backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
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
                        className="guide-slot group"
                        style={{ 
                            gridRow: `${r + 1} / span 2`, 
                            gridColumn: c + 1,
                            transform: `translateX(-50%)`,
                            width: `${GUIDE_CONTAINER_SIZE}px`,
                        }}
                        onClick={() => onWallClick(wall)}
                        aria-label={`Place vertical wall at row ${r}, column ${c}`}
                    >
                        <div className="guide-hover-effect" style={{ width: `${WALL_GUIDE_THICKNESS}px`, height: '100%', backgroundColor: playerColor, boxShadow: `0 0 12px ${playerColor}` }} />
                    </div>
                );
            }
        }
    }
    
    const renderPreviewWall = () => {
        if (!wallPreview) return null;
        
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
            <div 
                className="rounded-full pointer-events-none"
                style={{
                    ...style,
                    backgroundColor: playerColor,
                    boxShadow: `0 0 12px ${playerColor}, 0 0 20px ${playerColor}`
                }}
            />
        );
    }
    
    const guideContainerClasses = [
        "absolute inset-0 grid transition-opacity duration-300 ease-in-out",
        wallPreview ? "preview-active" : "",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
    ].join(" ");
    
    return (
        <>
            <style>{`
                .guide-slot {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    pointer-events: auto;
                    cursor: pointer;
                }
                .guide-hover-effect {
                    position: absolute;
                    opacity: 0;
                    transition: all 0.2s ease-in-out;
                    border-radius: 9999px;
                }
                .group:hover .guide-hover-effect {
                    opacity: 1;
                }
                .group:hover .guide-hover-effect {
                    transform: scale(1.1);
                }
                .preview-active .guide-slot {
                    pointer-events: none;
                }
            `}</style>
            
             <div 
                className={guideContainerClasses}
                style={{
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                    gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
                    gap: '5px',
                    zIndex: 30,
                }}
            >
                {guides}
                {renderPreviewWall()}
            </div>
        </>
    );
};
