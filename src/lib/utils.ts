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
