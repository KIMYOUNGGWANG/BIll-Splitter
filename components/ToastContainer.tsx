
import React from 'react';
import ReactDOM from 'react-dom';
import { ToastMessage } from '../types';
import Toast from './Toast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-full max-w-xs">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>,
    toastRoot
  );
};

export default ToastContainer;
