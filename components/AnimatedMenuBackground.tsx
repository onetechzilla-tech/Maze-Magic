import React from 'react';

export const AnimatedMenuBackground: React.FC = () => {
  const particles = Array.from({ length: 25 });
  const colors = ['#c026d3', '#ec4899', '#22d3ee', '#f97316'];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Background Image with Ken Burns effect */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-ken-burns"
        style={{
          backgroundImage: `url('/home-page-background.png')`,
        }}
      />
      
      {/* Overlay for depth and readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-bg-end)] via-transparent to-transparent opacity-80"></div>
      <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      <div className="absolute inset-0 bg-black/50"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {particles.map((_, i) => {
          const size = Math.random() * 4 + 2; // size between 2px and 6px
          const color = colors[Math.floor(Math.random() * colors.length)];
          const animationDuration = Math.random() * 15 + 10; // 10s to 25s
          const animationDelay = Math.random() * 20; // 0s to 20s
          
          return (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}, 0 0 12px ${color}`,
                animationDelay: `${animationDelay}s`,
                animationDuration: `${animationDuration}s`,
                opacity: 0,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes ken-burns {
          0% {
            transform: scale(1.0) translate(0, 0);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05) translate(1%, -1%);
            filter: brightness(1.1);
          }
          100% {
            transform: scale(1.0) translate(0, 0);
            filter: brightness(1);
          }
        }
        .animate-ken-burns {
          animation: ken-burns 40s ease-in-out infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 10 - 5}vw);
            opacity: 0;
          }
        }
        .particle {
          position: absolute;
          bottom: -20px;
          border-radius: 50%;
          animation-name: float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
};