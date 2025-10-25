
import React from 'react';

interface BottomNavBarProps {
  activeTab: 'receipt' | 'chat';
  hasNewMessage: boolean;
  onTabChange: (tab: 'receipt' | 'chat') => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, hasNewMessage, onTabChange }) => {
  const inactiveClass = "text-text-secondary dark:text-text-secondary-dark";
  const activeClass = "text-primary dark:text-primary-dark";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden z-30">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => onTabChange('receipt')}
          className={`flex flex-col items-center justify-center w-full transition-colors ${activeTab === 'receipt' ? activeClass : inactiveClass}`}
          aria-current={activeTab === 'receipt'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4Zm10.5 5.75a.75.75 0 0 0-1.5 0v.5h-3v-.5a.75.75 0 0 0-1.5 0v.5h-3v-.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-.5h3v.5a.75.75 0 0 0 1.5 0v-.5h3v.5a.75.75 0 0 0 1.5 0v-6.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium mt-1">Receipt</span>
        </button>

        <button
          onClick={() => onTabChange('chat')}
          className={`flex flex-col items-center justify-center w-full transition-colors relative ${activeTab === 'chat' ? activeClass : inactiveClass}`}
          aria-current={activeTab === 'chat'}
        >
          {hasNewMessage && (
            <div className="absolute top-0 right-[calc(50%-24px)] w-2.5 h-2.5 bg-secondary dark:bg-secondary-dark rounded-full border-2 border-surface dark:border-surface-dark"></div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M10 3a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0 1.5 1.5H14a1 1 0 0 1 1 1v.5a1.5 1.5 0 0 0 1.5 1.5H18a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0-1.5 1.5v.5a1 1 0 0 1-1 1h-2.5a1.5 1.5 0 0 0-1.5 1.5V18a1 1 0 0 1-1 1h-2.5a1.5 1.5 0 0 0-1.5-1.5V16a1 1 0 0 1-1-1h-.5a1.5 1.5 0 0 0-1.5-1.5H2a1 1 0 0 1-1-1v-2.5a1.5 1.5 0 0 0-1.5-1.5H0a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5a1.5 1.5 0 0 0 1.5-1.5V3a1 1 0 0 1 1-1h6Z" />
          </svg>
          <span className="text-xs font-medium mt-1">Chat & Summary</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavBar;
