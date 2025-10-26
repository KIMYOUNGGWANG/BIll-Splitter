import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { ReceiptSession } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SessionSidebarProps {
  sessions: ReceiptSession[];
  activeSessionId: string | null;
  isVisible: boolean;
  onAddReceipts: (files: FileList) => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenCamera: () => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const SessionItem: React.FC<{ session: ReceiptSession; isActive: boolean; onSwitch: () => void; onDelete: () => void; }> = ({ session, isActive, onSwitch, onDelete }) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const getStatusIndicator = () => {
    switch (session.status) {
      case 'parsing':
        return <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" title="Parsing..."></div>;
      case 'ready':
      case 'assigning':
      case 'awaiting_names':
        return <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Ready"></div>;
      case 'error':
        return (
           <div className="relative group flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-red-400">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Z" clipRule="evenodd" />
            </svg>
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs text-on-primary dark:text-text-primary-dark bg-primary dark:bg-surface-dark rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10">
                {session.errorMessage}
            </div>
           </div>
        );
      default:
        return null;
    }
  };
  
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDelete();
    setIsDeleteConfirmOpen(false);
  }, [onDelete]);

  return (
    <>
        <div
          onClick={onSwitch}
          className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-on-primary dark:text-text-primary-dark ${isActive ? 'bg-primary-focus dark:bg-primary-dark/40' : 'hover:bg-primary/80 dark:hover:bg-primary-dark/20'}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSwitch()}
          aria-current={isActive}
        >
          <div className="flex items-center gap-2 min-w-0">
            {getStatusIndicator()}
            <span className="truncate" title={session.name}>{session.name}</span>
          </div>
          
            <button
                onClick={handleDeleteClick}
                className={`p-1 rounded-full hover:bg-white/20 transition-opacity flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}
                aria-label={`Delete ${session.name}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
        <ConfirmationModal
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Delete Receipt"
            message={`Are you sure you want to delete the receipt "${session.name}"? This action cannot be undone.`}
        />
    </>
  );
};


const SessionSidebar: React.FC<SessionSidebarProps> = ({ sessions, activeSessionId, isVisible, onAddReceipts, onSwitchSession, onDeleteSession, onOpenCamera, onClose, fileInputRef }) => {
  const sidebarRef = useFocusTrap<HTMLDivElement>(isVisible);

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAddReceipts(event.target.files);
      event.target.value = '';
    }
    onClose();
  }, [onAddReceipts, onClose]);
  
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const sidebarEl = sidebarRef.current;
    sidebarEl?.addEventListener('keydown', handleKeyDown);
    return () => sidebarEl?.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose, sidebarRef]);


  return (
    <>
        <div 
            className={`fixed inset-0 bg-black/50 z-30 transition-opacity lg:hidden ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
            aria-hidden="true"
        ></div>
        <aside
            ref={sidebarRef}
            tabIndex={-1}
            role="complementary"
            aria-label="Receipts management sidebar"
            className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-primary dark:bg-surface-dark text-on-primary dark:text-text-primary-dark p-4 flex flex-col shadow-lg z-40 transition-transform transform focus:outline-none ${isVisible ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <h2 className="text-xl font-bold mb-4 border-b border-white/20 dark:border-border-dark pb-2 flex-shrink-0">Receipts</h2>
          <div className="flex-grow min-h-0 overflow-y-auto pr-1">
            <div className="space-y-2">
              {sessions.length > 0 ? (
                sessions.map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    onSwitch={() => onSwitchSession(session.id)}
                    onDelete={() => onDeleteSession(session.id)}
                  />
                ))
              ) : (
                <div className="text-center text-sm text-white/70 dark:text-text-secondary-dark py-4">
                  <p>No receipts yet.</p>
                  <p>Add one to start!</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 dark:border-border-dark">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
                aria-hidden="true"
              />
              <div className="space-y-2">
                  <button
                    onClick={handleAddClick}
                    className="w-full bg-secondary dark:bg-secondary-dark hover:bg-secondary-focus dark:hover:bg-secondary-focus-dark text-on-secondary dark:text-on-secondary-dark font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add Receipt(s)
                  </button>
                  <button
                    onClick={onOpenCamera}
                    className="w-full bg-primary-focus/80 dark:bg-primary-dark/30 hover:bg-primary-focus dark:hover:bg-primary-dark/50 text-on-primary dark:text-text-primary-dark font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.165a.75.75 0 0 1-.54-.22l-.935-.935a.75.75 0 0 0-1.06 0l-.935.935a.75.75 0 0 1-.54.22H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Z" />
                      <path d="M10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8.25 10a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0Z" />
                    </svg>
                    Use Camera
                  </button>
              </div>
            </div>
          </div>
        </aside>
    </>
  );
};

export default SessionSidebar;