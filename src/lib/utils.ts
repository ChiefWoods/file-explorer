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

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const SHORT_DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...SHORT_DATE_FORMAT,
  hour: "numeric",
  minute: "2-digit",
};

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, SHORT_DATE_FORMAT);
}

export function formatShortDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, SHORT_DATETIME_FORMAT);
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

export function getErrorCode(error: unknown): number {
  if (typeof error !== "object" || error === null) {
    return 404;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  return 404;
}
