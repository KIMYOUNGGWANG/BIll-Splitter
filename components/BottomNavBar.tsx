import React from 'react';

interface BottomNavBarProps {
  activeTab: 'receipt' | 'chat';
  onTabChange: (tab: 'receipt' | 'chat') => void;
  hasNewMessage: boolean;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange, hasNewMessage }) => {
  const inactiveClass = "text-text-secondary dark:text-text-secondary-dark";
  const activeClass = "text-primary dark:text-primary-dark";

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex justify-around items-center lg:hidden z-30">
      <button
        onClick={() => onTabChange('receipt')}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'receipt' ? activeClass : inactiveClass}`}
        aria-current={activeTab === 'receipt'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4Zm1.5 5.5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>

        <span className="text-xs font-medium mt-1">Receipt</span>
      </button>
      <button
        onClick={() => onTabChange('chat')}
        className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'chat' ? activeClass : inactiveClass}`}
        aria-current={activeTab === 'chat'}
      >
        {hasNewMessage && <span className="absolute top-2 right-1/2 translate-x-5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface dark:border-surface-dark"></span>}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 0 1-2 2h-5l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" clipRule="evenodd" />
        </svg>
        <span className="text-xs font-medium mt-1">Chat & Summary</span>
      </button>
    </div>
  );
};

export default BottomNavBar;
