export function triggerHapticFeedback(duration: number = 20): void {
  if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
    try {
      window.navigator.vibrate(duration);
    } catch (e) {
      // Vibration may fail on some browsers/devices, so we catch the error silently.
      console.warn("Haptic feedback failed.", e);
    }
  }
}
