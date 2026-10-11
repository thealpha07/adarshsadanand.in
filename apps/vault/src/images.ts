/**
 * Shrinks an image in the browser before upload: at most `maxWidth` wide, saved as WebP.
 * A phone photo of a cover (3–5 MB) becomes ~60 KB, which keeps the free storage
 * and bandwidth allowance for things that need it.
 */
export async function toWebp(file: File, maxWidth = 600, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image format can't be read here. Use a JPEG, PNG or WebP.");
  });
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Couldn't convert the image.");
  return blob;
}
