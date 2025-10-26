import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement>(isOpen: boolean) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // We need a small delay to allow the modal to render before focusing
      const timer = setTimeout(() => {
        containerRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !containerRef.current) return;

        const focusableElements = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentActiveElement = document.activeElement;

        if (e.shiftKey) { // Shift + Tab
          if (currentActiveElement === firstElement) {
            e.preventDefault();
            // Fix: Added a check for lastElement's existence and cast to HTMLElement to call focus().
            if (lastElement) {
              (lastElement as HTMLElement).focus();
            }
          }
        } else { // Tab
          if (currentActiveElement === lastElement || !focusableElements.includes(currentActiveElement as HTMLElement)) {
            e.preventDefault();
            // Fix: Added a check for firstElement's existence and cast to HTMLElement to call focus().
            if (firstElement) {
              (firstElement as HTMLElement).focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElement.current?.focus();
      };
    }
  }, [isOpen]);

  // Add tabIndex={-1} to the element this ref is attached to
  return containerRef;
}
