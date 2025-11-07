
export const fileToBase64 = (file: File): Promise<[string, string]> => {
  return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920; // Max width for the compressed image, good balance of quality and size
          const QUALITY = 0.9; // JPEG quality

          let { width, height } = img;

          // Resize if the image is too large, maintaining aspect ratio
          if (width > MAX_WIDTH) {
            height = (MAX_WIDTH / width) * height;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Failed to get canvas context for image compression.'));
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Get the compressed image data URL as a JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
          const base64 = dataUrl.split(',')[1];
          
          resolve([base64, 'image/jpeg']);
        } catch (e) {
            reject(e);
        } finally {
            // Clean up the object URL to avoid memory leaks
            URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image. The file may be corrupt or in an unsupported format. Please try a standard image format like JPEG or PNG."));
      };
      img.src = objectUrl;
  });
};
