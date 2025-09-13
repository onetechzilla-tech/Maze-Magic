import React from 'react';

type AiChatTooltipProps = {
  message: string;
};

export const AiChatTooltip: React.FC<AiChatTooltipProps> = ({ message }) => {
  return (
    <div className="absolute top-full left-0 mt-2 w-48 z-40">
      <div className="relative magical-container rounded-lg p-3 max-w-xs animate-fade-in-up">
        <div 
          className="absolute bottom-full left-12 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--dark-bg-start)',
          }}
        />
        <p className="text-sm text-center text-gray-300 font-medium">"{message}"</p>
      </div>
      <style>
        {`
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};