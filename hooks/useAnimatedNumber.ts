import { useState, useEffect, useRef } from 'react';

export const useAnimatedNumber = (endValue: number, duration: number = 500) => {
  const [currentValue, setCurrentValue] = useState(endValue);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef(endValue);

  useEffect(() => {
    startValueRef.current = currentValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - (startTimeRef.current || 0);
      const progress = Math.min(elapsedTime / duration, 1);
      
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const nextValue = startValueRef.current + (endValue - startValueRef.current) * easedProgress;
      setCurrentValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue); // Ensure it ends on the exact value
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration]);

  return currentValue;
};
