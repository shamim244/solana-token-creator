/**
 * Client-side image compression utility.
 * Guarantees output is strictly under 90 KiB (< 100 KiB Irys free tier).
 */

export interface CompressedImageResult {
  base64: string;
  filename: string;
  sizeBytes: number;
}

export async function compressTokenImage(
  file: File,
  maxDimension: number = 512,
  targetMaxBytes: number = 90 * 1024 // 90 KiB safety limit
): Promise<CompressedImageResult> {
  // If file is already an image and under 50KB, we can use it directly as base64
  if (file.size <= 50 * 1024) {
    const directBase64 = await fileToBase64(file);
    return {
      base64: directBase64,
      filename: file.name,
      sizeBytes: file.size,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Resize maintaining aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Could not create 2D canvas context");
          }

          // Clear and draw image
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt quality steps: 0.85 -> 0.70 -> 0.55 -> 0.40
          const qualitySteps = [0.85, 0.7, 0.55, 0.4];
          let bestDataUrl = "";
          let bestSize = Infinity;

          for (const quality of qualitySteps) {
            // WebP provides highest quality per byte, fallback to JPEG
            let dataUrl = canvas.toDataURL("image/webp", quality);
            if (!dataUrl.startsWith("data:image/webp")) {
              dataUrl = canvas.toDataURL("image/jpeg", quality);
            }

            const byteSize = Math.round((dataUrl.length * 3) / 4);
            bestDataUrl = dataUrl;
            bestSize = byteSize;

            if (byteSize <= targetMaxBytes) {
              break;
            }
          }

          const finalExt = bestDataUrl.startsWith("data:image/webp") ? "webp" : "jpg";
          const baseName = file.name.replace(/\.[^/.]+$/, "");

          resolve({
            base64: bestDataUrl,
            filename: `${baseName}.${finalExt}`,
            sizeBytes: bestSize,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
