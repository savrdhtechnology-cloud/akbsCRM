export const ALLOWED_PAYMENT_PROOF_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf"
]);

export const ALLOWED_PAYMENT_PROOF_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "pdf"
]);

export const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;

export function base64ToBytes(data: string) {
  const clean = data.includes(",") ? data.split(",").pop()! : data;
  const bin = atob(clean);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export function fileExt(name: string) {
  const parts = String(name || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export function matchesSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/webp") {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (mime === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return false;
}

export function validatePaymentProof(name: string, mimeInput: string, bytes: Uint8Array) {
  const mime = String(mimeInput || "").toLowerCase();
  const ext = fileExt(name);

  if (!ALLOWED_PAYMENT_PROOF_MIME.has(mime) || !ALLOWED_PAYMENT_PROOF_EXTENSIONS.has(ext)) {
    return { ok: false as const, code: "INVALID_FILE_TYPE", message: "Upload PNG, JPG/JPEG, WEBP or PDF only." };
  }

  const extMatchesMime =
    (mime === "image/png" && ext === "png") ||
    (mime === "image/jpeg" && (ext === "jpg" || ext === "jpeg")) ||
    (mime === "image/webp" && ext === "webp") ||
    (mime === "application/pdf" && ext === "pdf");

  if (!extMatchesMime) {
    return { ok: false as const, code: "INVALID_FILE_TYPE", message: "The file extension does not match the uploaded file type." };
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PAYMENT_PROOF_BYTES) {
    return { ok: false as const, code: "INVALID_FILE_SIZE", message: "Payment proof must be 5 MB or smaller." };
  }

  if (!matchesSignature(bytes, mime)) {
    return { ok: false as const, code: "INVALID_FILE_SIGNATURE", message: "The uploaded payment proof is not a valid PNG, JPG/JPEG, WEBP or PDF file." };
  }

  return { ok: true as const, mime, ext };
}

export async function sha256Hex(bytes: Uint8Array) {
  const stableBytes = new Uint8Array(bytes);
  const hash = await crypto.subtle.digest("SHA-256", stableBytes.buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
