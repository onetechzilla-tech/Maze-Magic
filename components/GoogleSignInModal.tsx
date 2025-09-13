import React from 'react';
import Modal from './Modal';

type GoogleSignInModalProps = {
  onSignIn: () => void;
  onCancel: () => void;
};

const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({ onSignIn, onCancel }) => {
  return (
    <Modal title="Authentication Required" onClose={onCancel}>
      <div className="text-center space-y-6">
        <p className="text-gray-300 text-lg">
          To play against the Gemini AI, you need to sign in with your Google account.
        </p>
        <p className="text-sm text-gray-400">
          This allows the application to make requests to the Gemini API on your behalf.
        </p>
        <div className="flex flex-col gap-4">
          <button 
            onClick={onSignIn} 
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-3 button-glow button-glow-blue"
          >
            <svg className="w-6 h-6" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 8.841C34.522 4.952 29.548 2.5 24 2.5C11.458 2.5 1.5 12.458 1.5 25s9.958 22.5 22.5 22.5s22.5-9.958 22.5-22.5c0-1.55-.14-3.05-.411-4.417z"></path>
              <path fill="#FF3D00" d="M6.306 14.691c-1.645 3.163-2.607 6.737-2.607 10.309s.962 7.145 2.607 10.309l-5.466 4.228C.945 34.613 0 29.982 0 25s.945-9.613 2.541-13.754l5.466 4.228z"></path>
              <path fill="#4CAF50" d="M24 47.5c5.548 0 10.522-1.952 14.804-5.196l-5.466-4.228C30.153 40.832 27.258 42.5 24 42.5c-4.721 0-8.799-2.68-10.84-6.43l-5.466 4.228C10.078 44.408 16.377 47.5 24 47.5z"></path>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-4.721 0-8.799-2.68-10.84-6.43l-5.466 4.228C10.078 44.408 16.377 47.5 24 47.5c12.542 0 22.5-9.958 22.5-22.5c0-1.55-.14-3.05-.411-4.417z"></path>
            </svg>
            Sign In with Google
          </button>
          <button 
            onClick={onCancel} 
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg button-glow button-glow-purple"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GoogleSignInModal;
