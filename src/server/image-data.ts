export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Upload a base64 image data URL.");
  const mime = match[1]!.toLowerCase();
  const bytes = Uint8Array.from(atob(match[2]!), (char) => char.charCodeAt(0));
  if (!ALLOWED_MIME.has(mime)) throw new Error("Use a JPEG, PNG, WebP, GIF or AVIF image.");
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error("Images must be 5 MB or smaller.");
  return { mime, bytes };
}
