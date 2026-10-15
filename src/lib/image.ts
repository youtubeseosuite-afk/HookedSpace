// src/lib/image.ts
// NY FIL. Formindsker billeder i browseren før upload (max 1600 px, WebP/JPEG).
// Billedet tegnes om på et canvas, så ALLE metadata (inkl. GPS-position) forsvinder.

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  ext: "webp" | "jpg";
};

const MAX_SIZE = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<CompressedImage> {
  // imageOrientation retter billeder der er taget på højkant
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas understøttes ikke");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP hvor browseren kan, ellers JPEG (fx ældre Safari)
  const webp = await canvasToBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, width, height, ext: "webp" };
  }
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Billedet kunne ikke behandles");
  return { blob: jpeg, width, height, ext: "jpg" };
}
