import React from 'react';

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
};

const Modal: React.FC<ModalProps> = ({ title, children, onClose, className }) => {
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
        <div 
          className={`relative bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/50 rounded-3xl p-8 m-4 w-full shadow-2xl shadow-purple-500/20 animate-modal-enter overflow-hidden ${className || 'max-w-sm'}`}
        >
          {/* Decorative corner flourishes */}
          <div className="absolute top-2 left-2 w-16 h-16 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-3xl opacity-50"></div>
          <div className="absolute bottom-2 right-2 w-16 h-16 border-b-2 border-r-2 border-pink-500/50 rounded-br-3xl opacity-50"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-magic text-white text-glow-purple tracking-wide">{title}</h2>
              {onClose && (
                <button 
                  onClick={onClose} 
                  className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div>{children}</div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes modal-enter {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default Modal;
