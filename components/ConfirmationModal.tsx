
import React, { useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'primary' | 'destructive';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, variant = 'destructive' }) => {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const modalElement = modalRef.current;
    modalElement?.addEventListener('keydown', handleKeyDown);
    return () => {
      modalElement?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, modalRef]);
  
  if (!isOpen) return null;

  const confirmButtonClasses = variant === 'destructive'
    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
    : 'bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark';

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-surface dark:bg-surface-dark rounded-lg shadow-xl p-6 w-full max-w-sm m-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirmation-title" className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-4">
          {title}
        </h3>
        <p id="confirmation-message" className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-on-primary dark:text-on-primary-dark rounded-md transition-colors ${confirmButtonClasses}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
