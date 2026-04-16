import { z } from "zod";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_ITEM_NAME_LENGTH = 120;

const MIME_EXTENSION_ALLOWLIST = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/msword": ["doc"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "text/plain": ["txt", "log", "text"],
  "text/csv": ["csv"],
  "text/markdown": ["md", "markdown"],
  "application/json": ["json"],
} as const satisfies Record<string, readonly string[]>;

const INVALID_NAME_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g;
const WHITESPACE_RE = /\s+/g;

export const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze(
  new Set<string>(Object.keys(MIME_EXTENSION_ALLOWLIST)),
);

export const itemNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(MAX_ITEM_NAME_LENGTH, `Name must be at most ${MAX_ITEM_NAME_LENGTH} characters.`)
  .transform((value) => normalizeItemName(value));

export const folderNameSchema = itemNameSchema;
export const fileNameSchema = itemNameSchema;

export type UploadValidationResult =
  | { ok: true; normalizedName: string }
  | { ok: false; reason: string };

export function normalizeItemName(value: string): string {
  const cleaned = value.replace(INVALID_NAME_CHARS, " ").replace(WHITESPACE_RE, " ").trim();

  if (!cleaned) {
    return "Untitled";
  }

  if (cleaned.length <= MAX_ITEM_NAME_LENGTH) {
    return cleaned;
  }

  return cleaned.slice(0, MAX_ITEM_NAME_LENGTH).trim();
}

export function isMimeTypeAllowed(mimeType: string): boolean {
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType.toLowerCase());
}

export function isExtensionAllowedForMime(fileName: string, mimeType: string): boolean {
  const allowedExtensions =
    MIME_EXTENSION_ALLOWLIST[mimeType.toLowerCase() as keyof typeof MIME_EXTENSION_ALLOWLIST];
  if (!allowedExtensions) {
    return false;
  }

  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) {
    return false;
  }

  const extension = fileName.slice(dot + 1).toLowerCase();
  return (allowedExtensions as readonly string[]).includes(extension);
}

export function inferCloudinaryResourceType(mimeType: string): "image" | "raw" {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith("image/") && normalized !== "image/svg+xml") {
    return "image";
  }
  return "raw";
}

export function validateUploadFile(
  file: Pick<File, "name" | "size" | "type">,
): UploadValidationResult {
  if (file.size <= 0) {
    return { ok: false, reason: "File is empty." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: `File is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.` };
  }

  const mimeType = file.type.toLowerCase();
  if (!isMimeTypeAllowed(mimeType)) {
    return { ok: false, reason: "File type is not allowed." };
  }

  const normalizedName = normalizeItemName(file.name || "Untitled");
  if (!isExtensionAllowedForMime(normalizedName, mimeType)) {
    return {
      ok: false,
      reason: "File extension does not match the MIME type allowlist.",
    };
  }

  return { ok: true, normalizedName };
}

export function assertValidUploadFile(file: Pick<File, "name" | "size" | "type">): string {
  const result = validateUploadFile(file);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.normalizedName;
}
