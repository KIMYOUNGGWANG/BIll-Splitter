
import React, { useState, useRef, useEffect, TouchEvent, ReactNode, useCallback } from 'react';

type PanelState = 'min' | 'half' | 'full';

const MIN_HEIGHT = 80; // Height in pixels for minimized state

const SlidingPanel: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [panelState, setPanelState] = useState<PanelState>('min');
  const [panelHeight, setPanelHeight] = useState(MIN_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const touchMoveHistory = useRef<{ time: number, y: number }[]>([]).current;
  
  // Memoize panel state heights to avoid recalculating on every render
  const getPanelHeights = useCallback(() => {
    // Header height is approx 56px, plus some padding
    const topOffset = 70; 
    const windowHeight = window.innerHeight;
    return {
      min: MIN_HEIGHT,
      half: windowHeight * 0.5,
      full: windowHeight - topOffset,
    };
  }, []);

  const snapToState = useCallback((currentHeight: number, velocity = 0) => {
    const { min, half, full } = getPanelHeights();
    
    // Add velocity influence to create a "flick" gesture
    const flickTarget = currentHeight - velocity * 150; // velocity * multiplier

    const distToMin = Math.abs(flickTarget - min);
    const distToHalf = Math.abs(flickTarget - half);
    const distToFull = Math.abs(flickTarget - full);

    if (distToMin <= distToHalf && distToMin <= distToFull) {
      setPanelHeight(min);
      setPanelState('min');
    } else if (distToHalf < distToFull) {
      setPanelHeight(half);
      setPanelState('half');
    } else {
      setPanelHeight(full);
      setPanelState('full');
    }
  }, [getPanelHeights]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startHeight.current = panelRef.current?.clientHeight || 0;
    touchMoveHistory.length = 0; // Clear history on new drag
    if (panelRef.current) {
      panelRef.current.style.transition = 'none'; // Disable transition for smooth dragging
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    touchMoveHistory.push({ time: currentTime, y: currentY });
    if (touchMoveHistory.length > 4) {
      touchMoveHistory.shift();
    }

    const deltaY = startY.current - currentY;
    const newHeight = startHeight.current + deltaY;
    
    const { full } = getPanelHeights();
    // Clamp height with some overdrag allowance
    setPanelHeight(Math.max(MIN_HEIGHT, Math.min(newHeight, full + 50)));
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (panelRef.current) {
      panelRef.current.style.transition = 'height 0.3s ease-out';
    }

    let finalVelocity = 0;
    if (touchMoveHistory.length >= 2) {
      const lastMove = touchMoveHistory[touchMoveHistory.length - 1];
      const firstMove = touchMoveHistory[0];
      const deltaT = lastMove.time - firstMove.time;
      if (deltaT > 0) {
        const deltaY = firstMove.y - lastMove.y; // Y decreases as you move up
        finalVelocity = deltaY / deltaT; // pixels per millisecond
      }
    }
    
    snapToState(panelRef.current?.clientHeight || 0, finalVelocity);
  };

  useEffect(() => {
    const handleResize = () => {
      // Re-snap to the current state with new dimensions
      const heights = getPanelHeights();
      switch(panelState) {
        case 'min': setPanelHeight(heights.min); break;
        case 'half': setPanelHeight(heights.half); break;
        case 'full': setPanelHeight(heights.full); break;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelState, getPanelHeights]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-30 flex flex-col"
      style={{ height: `${panelHeight}px`, transition: isDragging ? 'none' : 'height 0.3s ease-out' }}
    >
      <div
        className="w-full py-4 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1.5 bg-border dark:bg-border-dark rounded-full"></div>
      </div>
      <div className="flex-grow overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export default SlidingPanel;
