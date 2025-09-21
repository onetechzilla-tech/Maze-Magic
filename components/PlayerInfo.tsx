
import React from 'react';
import type { Player } from '../types';

type PlayerInfoProps = {
  player: Player;
  reverse?: boolean;
  size?: 'sm' | 'md';
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, reverse, size = 'md' }) => {
  const containerClasses = size === 'sm' 
    ? "magical-container rounded-xl p-2 flex items-center space-x-2" 
    : "magical-container rounded-xl p-3 flex items-center space-x-3";
    
  const textSizeClasses = size === 'sm' ? "text-sm" : "text-sm md:text-base";

  return (
    <div className={`${containerClasses} ${reverse ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div 
        className={`w-6 h-6 rounded-full flex-shrink-0`} 
        style={{ 
          backgroundColor: player.color,
          boxShadow: `0 0 8px ${player.color}`
        }}
      ></div>
      <div className="min-w-0">
        <p className={`font-semibold text-gray-200 truncate ${textSizeClasses}`}>{player.name}</p>
        <p className={`text-gray-400 ${textSizeClasses}`}>{player.wallsLeft} walls</p>
      </div>
    </div>
  );
};

export default PlayerInfo;