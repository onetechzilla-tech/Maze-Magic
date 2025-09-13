import React, { useState } from 'react';
import Modal from './Modal';
import { soundService, Sound } from '../services/soundService';

type HelpModalProps = {
  onClose: () => void;
};
type Tab = 'goal' | 'gameplay' | 'moving' | 'walls';

const content = {
  en: {
    tabs: { goal: 'The Goal', gameplay: 'Gameplay', moving: 'Moving', walls: 'Placing Walls' },
    goalTitle: "The Goal: Reach the Other Side",
    goalText: "Be the first player to move your pawn to any space on your opponent's starting side of the board.",
    goalCaption: "Player 1 (Cyan) must reach the top row, and Player 2 (Pink) must reach the bottom row.",
    gameplayTitle: "Your Turn: Move or Place a Wall",
    gameplayText: "On your turn, you must choose to do one of two things:",
    gameplayMove: "Move your pawn one space.",
    gameplayPlace: "Place one of your walls to block the path.",
    movingTitle: "How Pawns Move",
    movingStandard: "Standard Move: Move one space forward, backward, left, or right to an empty, unblocked square.",
    movingJump: "Jumping: If your pawn is adjacent to an opponent, you can jump over them to the next space in a straight line.",
    movingDiagonal: "Diagonal Jump: If a straight jump is blocked by a wall or the board edge, you can move diagonally to an open space next to the opponent.",
    captionMove: "Move to any adjacent empty square.",
    captionJump: "Jump over an adjacent opponent.",
    captionDiagonal: "Jump diagonally if a wall blocks a straight jump.",
    wallsTitle: "How Walls Work",
    wallsText: "Walls are placed in the grooves between squares and are always two squares long. They block movement for both players.",
    wallsRule: "The Golden Rule: You can NEVER place a wall that completely traps an opponent, leaving them with no possible path to their goal.",
    captionValidWall: "A valid vertical wall placement.",
    captionInvalidWall: "An invalid placement that traps a player.",
    wallsRulesTitle: "Advanced Wall Rules",
    wallsRulesText: "Walls cannot cross over each other. They must be placed in empty grooves. You can place walls next to each other to form longer barriers.",
    captionValidT: "Valid: Walls can form 'T' junctions.",
    captionInvalidCross: "Invalid: Walls cannot form a '+' cross.",
    toggleButton: "हिंदी"
  },
  hi: {
    tabs: { goal: 'लक्ष्य', gameplay: 'गेमप्ले', moving: 'चलना', walls: 'दीवारें' },
    goalTitle: "लक्ष्य: दूसरी तरफ पहुंचें",
    goalText: "अपने मोहरे को बोर्ड के दूसरी तरफ (आपके निर्धारित लक्ष्य पंक्ति) किसी भी स्थान पर ले जाने वाले पहले खिलाड़ी बनें।",
    goalCaption: "खिलाड़ी 1 (सियान) को शीर्ष पंक्ति तक पहुंचना है, और खिलाड़ी 2 (गुलाबी) को निचली पंक्ति तक पहुंचना है।",
    gameplayTitle: "आपकी बारी: चलें या दीवार रखें",
    gameplayText: "अपनी बारी पर, आपको निम्नलिखित में से कोई एक चुनना होगा:",
    gameplayMove: "अपने मोहरे को एक स्थान पर ले जाएं।",
    gameplayPlace: "रास्ता रोकने के लिए अपनी दीवारों में से एक को रखें।",
    movingTitle: "मोहरे कैसे चलते हैं",
    movingStandard: "मानक चाल: एक खाली, अबाधित वर्ग में एक स्थान आगे, पीछे, बाएं या दाएं ले जाएं।",
    movingJump: "कूदना: यदि आपका मोहरा प्रतिद्वंद्वी के निकट है, तो आप सीधी रेखा में अगले स्थान पर कूद सकते हैं।",
    movingDiagonal: "तिरछी छलांग: यदि सीधी छलांग किसी दीवार या बोर्ड के किनारे से अवरुद्ध है, तो आप प्रतिद्वंद्वी के बगल में एक खुली जगह पर तिरछे जा सकते हैं।",
    captionMove: "किसी भी आसन्न खाली वर्ग में जाएं।",
    captionJump: "एक आसन्न प्रतिद्वंद्वी पर से कूदें।",
    captionDiagonal: "यदि कोई दीवार सीधी छलांग को रोकती है तो तिरछे कूदें।",
    wallsTitle: "दीवारें कैसे काम करती हैं",
    wallsText: "दीवारें चौकों के बीच की खांचों में रखी जाती हैं और हमेशा दो चौकों जितनी लंबी होती हैं। वे दोनों खिलाड़ियों की आवाजाही को रोकती हैं।",
    wallsRule: "सुनहरा नियम: आप कभी भी ऐसी दीवार नहीं लगा सकते जो किसी प्रतिद्वंद्वी को पूरी तरह से फंसा दे, जिससे उनके लक्ष्य तक पहुंचने का कोई रास्ता न बचे।",
    captionValidWall: "एक वैध ऊर्ध्वाधर दीवार प्लेसमेंट।",
    captionInvalidWall: "एक अमान्य प्लेसमेंट जो एक खिलाड़ी को फंसाता है।",
    wallsRulesTitle: "उन्नत दीवार नियम",
    wallsRulesText: "दीवारें एक-दूसरे को पार नहीं कर सकतीं। उन्हें खाली खांचों में रखा जाना चाहिए। आप लंबी बाधाएं बनाने के लिए दीवारों को एक-दूसरे के बगल में रख सकते हैं।",
    captionValidT: "वैध: दीवारें 'T' जंक्शन बना सकती हैं।",
    captionInvalidCross: "अमान्य: दीवारें '+' क्रॉस नहीं बना सकती हैं।",
    toggleButton: "English"
  }
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`flex-shrink-0 px-4 py-2 text-sm md:text-base font-bold rounded-t-lg transition-all duration-300 relative ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
        {children}
        {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-full" style={{boxShadow: '0 0 8px var(--glow-purple)'}}></div>}
    </button>
);

const RuleIllustration: React.FC<{ caption: string, children: React.ReactNode }> = ({ children, caption }) => (
  <div className="text-center my-4">
    <div className="bg-black/20 rounded-lg p-2 inline-flex items-center justify-center shadow-inner aspect-square w-full max-w-[120px] mx-auto">
      {children}
    </div>
    <p className="text-xs text-gray-400 mt-2 font-medium leading-tight h-8">{caption}</p>
  </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeTab, setActiveTab] = useState<Tab>('goal');
  const c = content[language];

  const toggleLanguage = () => {
    soundService.play(Sound.UIClick);
    setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));
  };
  
  const handleTabClick = (tab: Tab) => {
    soundService.play(Sound.UIClick);
    setActiveTab(tab);
  };

  return (
    <Modal title="" onClose={onClose} className="max-w-xl">
        <div className="flex justify-between items-center mb-4 -mt-2">
            <h2 className="text-3xl font-magic text-white text-glow-purple">{c.tabs[activeTab]}</h2>
            <button onClick={toggleLanguage} className="px-3 py-1 text-sm font-semibold text-white bg-fuchsia-600 rounded-md hover:bg-fuchsia-700 transition-colors shadow-sm button-glow button-glow-purple">
                {c.toggleButton}
            </button>
        </div>
        <div className="border-b border-purple-500/30 -mx-8 px-8">
            <div className="flex space-x-2 overflow-x-auto whitespace-nowrap pb-2 -mb-2 custom-scrollbar-horizontal">
                {(Object.keys(c.tabs) as Tab[]).map(tab => (
                    <TabButton key={tab} active={activeTab === tab} onClick={() => handleTabClick(tab)}>
                        {c.tabs[tab]}
                    </TabButton>
                ))}
            </div>
        </div>
      <div className="text-gray-300 max-h-[60vh] overflow-y-auto pr-4 -mr-6 mt-6 custom-scrollbar">
        {activeTab === 'goal' && (
            <div className="space-y-4">
                <p className="text-lg leading-relaxed">{c.goalText}</p>
                 <RuleIllustration caption={c.goalCaption}>
                     <svg width="100%" height="100%" viewBox="0 0 100 100">
                        <defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                        <rect width="100" height="11" fill="#ec4899" fillOpacity="0.4"/>
                        <rect y="89" width="100" height="11" fill="#22d3ee" fillOpacity="0.4"/>
                        <circle cx="50" cy="94" r="5" fill="#22d3ee" filter="url(#glow-help)" />
                        <path d="M 50 85 C 40 60, 40 40, 50 15" stroke="#22d3ee" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                        <path d="M 45 20 L 50 15 L 55 20" stroke="#22d3ee" strokeWidth="2" fill="none" />
                     </svg>
                 </RuleIllustration>
            </div>
        )}
        {activeTab === 'gameplay' && (
             <div className="space-y-4">
                <p className="text-lg leading-relaxed">{c.gameplayText}</p>
                <ul className="list-none space-y-3 pl-2">
                    <li className="flex items-start gap-3"><div className="w-5 h-5 rounded-full bg-cyan-400 flex-shrink-0 mt-1" style={{boxShadow: '0 0 8px var(--glow-cyan)'}}></div><span><strong>{c.gameplayMove.split(':')[0]}:</strong> {c.gameplayMove.split(':')[1]}</span></li>
                    <li className="flex items-start gap-3"><div className="w-5 h-5 rounded-md bg-purple-500 flex-shrink-0 mt-1" style={{boxShadow: '0 0 8px var(--glow-purple)'}}></div><span><strong>{c.gameplayPlace.split(':')[0]}:</strong> {c.gameplayPlace.split(':')[1]}</span></li>
                </ul>
            </div>
        )}
        {activeTab === 'moving' && (
            <div className="space-y-3">
                <p><strong>{c.movingStandard.split(':')[0]}:</strong>{c.movingStandard.split(':')[1]}</p>
                <p><strong>{c.movingJump.split(':')[0]}:</strong> {c.movingJump.split(':')[1]}</p>
                <p><strong>{c.movingDiagonal.split(':')[0]}:</strong> {c.movingDiagonal.split(':')[1]}</p>
                <div className="grid grid-cols-3 gap-2 pt-2">
                    <RuleIllustration caption={c.captionMove}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><circle cx="50" cy="50" r="12" fill="#22d3ee" filter="url(#glow-help)"/><circle cx="50" cy="17" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/><circle cx="50" cy="83" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/><circle cx="17" cy="50" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/><circle cx="83" cy="50" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/></svg>
                    </RuleIllustration>
                    <RuleIllustration caption={c.captionJump}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><circle cx="50" cy="83" r="12" fill="#22d3ee" filter="url(#glow-help)"/><circle cx="50" cy="50" r="12" fill="#ec4899" filter="url(#glow-help)"/><circle cx="50" cy="17" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/></svg>
                    </RuleIllustration>
                    <RuleIllustration caption={c.captionDiagonal}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><circle cx="50" cy="83" r="12" fill="#22d3ee" filter="url(#glow-help)"/><circle cx="50" cy="50" r="12" fill="#ec4899" filter="url(#glow-help)"/><rect x="0" y="30" width="100" height="8" fill="#a855f7" rx="3" filter="url(#glow-help)"/><circle cx="17" cy="50" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/><circle cx="83" cy="50" r="8" fill="#22d3ee" opacity="0.6" filter="url(#glow-help)"/></svg>
                    </RuleIllustration>
                </div>
            </div>
        )}
        {activeTab === 'walls' && (
            <div className="space-y-3">
                <p>{c.wallsText}</p>
                <p className="font-bold text-yellow-300 my-3 p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/50"><strong>{c.wallsRule.split(':')[0]}:</strong> {c.wallsRule.split(':')[1]}</p>
                <p>{c.wallsRulesText}</p>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <RuleIllustration caption={c.captionValidWall}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 50 H 100 M 50 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><rect x="46" y="0" width="8" height="66" fill="#a855f7" rx="3" filter="url(#glow-help)"/></svg>
                    </RuleIllustration>
                    <RuleIllustration caption={c.captionInvalidWall}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 33 H 100 M 0 66 H 100 M 33 0 V 100 M 66 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><circle cx="50" cy="83" r="12" fill="#ec4899" filter="url(#glow-help)"/><rect x="0" y="63" width="66" height="8" fill="#a855f7" rx="3" filter="url(#glow-help)"/><rect x="33" y="63" width="66" height="8" fill="#a855f7" rx="3" filter="url(#glow-help)"/><rect x="63" y="0" width="8" height="66" fill="#f97316" rx="3" filter="url(#glow-help)"/><path d="M 70 30 L 95 5 M 95 30 L 70 5" stroke="#f97316" strokeWidth="6" strokeLinecap="round"/></svg>
                    </RuleIllustration>
                    <RuleIllustration caption={c.captionValidT}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 50 H 100 M 50 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><rect x="50" y="46" width="50" height="8" fill="#a855f7" rx="3" filter="url(#glow-help)"/><rect x="46" y="0" width="8" height="66" fill="#a855f7" rx="3" filter="url(#glow-help)"/></svg>
                    </RuleIllustration>
                    <RuleIllustration caption={c.captionInvalidCross}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100"><defs><filter id="glow-help" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M 0 50 H 100 M 50 0 V 100" stroke="#4a2d7d" strokeWidth="1"/><rect x="0" y="46" width="66" height="8" fill="#a855f7" rx="3" filter="url(#glow-help)"/><rect x="46" y="0" width="8" height="66" fill="#f97316" rx="3" filter="url(#glow-help)"/><path d="M 70 30 L 95 5 M 95 30 L 70 5" stroke="#f97316" strokeWidth="6" strokeLinecap="round"/></svg>
                    </RuleIllustration>
                </div>
            </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(168, 85, 247, 0.5); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(168, 85, 247, 0.8); }
        .custom-scrollbar-horizontal::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar-horizontal::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb { background-color: rgba(168, 85, 247, 0.4); border-radius: 3px; }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb:hover { background-color: rgba(168, 85, 247, 0.7); }
      `}</style>
    </Modal>
  );
};

export default HelpModal;