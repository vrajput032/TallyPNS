const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;
/** Shrink phone photos before upload so a large camera picture does not fail the 10 MB limit. */
const COMPRESS_OVER_BYTES = 1_500_000;

function isImageFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name);
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isBillImage(file: File) {
  return isImageFile(file) && !isPdfFile(file);
}

/** Returns a smaller JPEG for large photos. PDFs and small files are unchanged. */
export async function prepareAttachmentFile(file: File): Promise<File> {
  if (!isImageFile(file) || file.size <= COMPRESS_OVER_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "bill-photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
