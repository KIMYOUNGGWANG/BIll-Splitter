import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof DOMException) {
         if (err.name === 'NotAllowedError') {
             setError('Camera permission was denied. Please enable it in your browser settings.');
         } else if (err.name === 'NotFoundError') {
             setError('No camera found on this device.');
         } else {
             setError('Could not access the camera. Please check your device settings.');
         }
      } else {
        setError('An unexpected error occurred while accessing the camera.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        // Stop the stream after capture to freeze the frame
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  }, [stream]);
  
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const handleUsePhoto = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  }, [onCapture]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-fade-in" role="dialog" aria-modal="true">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-8 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Camera Error</h3>
            <p className="text-gray-300">{error}</p>
            <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-contain ${capturedImage ? 'hidden' : 'block'}`}
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            {capturedImage && (
                <img src={capturedImage} alt="Captured receipt" className="w-full h-full object-contain" />
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-colors"
              aria-label="Close camera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {!error && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 flex items-center justify-center">
            {capturedImage ? (
                <div className="flex items-center gap-8">
                    <button onClick={handleRetake} className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Retake</button>
                    <button onClick={handleUsePhoto} className="px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-focus transition-colors">Use Photo</button>
                </div>
            ) : (
                <button
                    onClick={handleCapture}
                    className="w-16 h-16 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-white"
                    aria-label="Capture photo"
                ></button>
            )}
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
