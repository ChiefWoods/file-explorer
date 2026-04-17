import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPathSegmentsFromParams(params: Record<string, unknown>): string[] {
  const raw =
    (typeof params._splat === "string" && params._splat) ||
    (typeof params["*"] === "string" && params["*"]) ||
    "";
  return raw.split("/").filter(Boolean);
}

export function getFolderIdFromSplat(params: Record<string, unknown>): string {
  const segments = getPathSegmentsFromParams(params);
  if (segments.length === 0) {
    return "root";
  }
  return segments[segments.length - 1];
}

export function formatBytes(bytes?: number, options?: { empty?: string }): string {
  if (typeof bytes !== "number") {
    return options?.empty ?? "0 B";
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code === code
  );
}
