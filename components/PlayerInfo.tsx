import React from 'react';
import type { Player } from '../types';

type PlayerInfoProps = {
  player: Player;
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player }) => {
  return (
    <div className="magical-container rounded-xl p-3 flex items-center space-x-3">
      <div 
        className={`w-6 h-6 rounded-full flex-shrink-0`} 
        style={{ 
          backgroundColor: player.color,
          boxShadow: `0 0 8px ${player.color}`
        }}
      ></div>
      <div>
        <p className="font-semibold text-gray-200 text-sm md:text-base whitespace-nowrap">{player.name}</p>
        <p className="text-sm md:text-base text-gray-400">{player.wallsLeft} walls</p>
      </div>
    </div>
  );
};

export default PlayerInfo;
