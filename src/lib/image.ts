/**
 * Downscales an image file to a JPEG data URL small enough to keep in localStorage
 * (a phone photo of a prescription drops from several MB to roughly 100–200 KB).
 * Resolves to undefined when the file cannot be decoded.
 */
export function fileToThumbnail(file: File, maxSide = 1100, quality = 0.72): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const finish = (result: string | undefined) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    image.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return finish(undefined);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', quality));
      } catch {
        finish(undefined);
      }
    };
    image.onerror = () => finish(undefined);
    image.src = url;
  });
}
