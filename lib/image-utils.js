/**
 * Image utility functions for compression and encoding.
 * Note: Actual image paste/drop handling is in note.js renderer process.
 */

function compressImage(base64DataUrl, maxWidth = 1024, maxHeight = 768, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64DataUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => {
      // If image fails to load, return original
      resolve(base64DataUrl);
    };
  });
}

function estimateBase64Size(base64) {
  // Rough estimate: each character is ~0.75 bytes
  // Account for data URI overhead
  return (base64.length * 3) / 4;
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

module.exports = {
  compressImage,
  estimateBase64Size,
  formatFileSize
};
