
import React, { useEffect, useState } from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

// Fix: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const ICONS: Record<ToastType, React.ReactElement> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.707-10.293a.75.75 0 0 0-1.06 1.06L8.94 10l-2.707 2.707a.75.75 0 1 0 1.06 1.06L10 11.06l2.707 2.707a.75.75 0 1 0 1.06-1.06L11.06 10l2.707-2.707a.75.75 0 0 0-1.06-1.06L10 8.94 7.293 7.707Z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
    </svg>
  ),
};

const STYLES: Record<ToastType, { bg: string; text: string; icon: string; }> = {
  success: { bg: 'bg-green-500/90 dark:bg-green-600/90', text: 'text-white', icon: 'text-white' },
  error: { bg: 'bg-red-500/90 dark:bg-red-600/90', text: 'text-white', icon: 'text-white' },
  info: { bg: 'bg-blue-500/90 dark:bg-blue-600/90', text: 'text-white', icon: 'text-white' },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { message, type } = toast;
  const styles = STYLES[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for animation to finish
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };
  
  const animationClass = isExiting 
    ? 'animate-[fade-out_0.3s_ease-out_forwards]' 
    : 'animate-[fade-in-right_0.3s_ease-out_forwards]';

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start w-full p-4 rounded-lg shadow-lg text-sm backdrop-blur-sm ${styles.bg} ${styles.text} ${animationClass}`}
    >
      <div className={`flex-shrink-0 mr-3 ${styles.icon}`}>
        {ICONS[type]}
      </div>
      <div className="flex-1 break-words">{message}</div>
      <button onClick={handleClose} className={`ml-3 -mr-1 -mt-1 p-1 rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white ${styles.icon}`} aria-label="Close">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
      </button>
    </div>
  );
};

export default Toast;
