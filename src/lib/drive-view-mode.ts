export type DriveViewMode = "list" | "grid";

const DRIVE_VIEW_MODE_COOKIE_KEY = "drive_view_mode";
const DRIVE_VIEW_MODE_STORAGE_KEY = "drive:view-mode";

export function normalizeDriveViewMode(value: unknown): DriveViewMode {
  return value === "grid" ? "grid" : "list";
}

export function readDriveViewModeFromCookie(
  cookieHeader: string | null | undefined,
): DriveViewMode {
  if (!cookieHeader) {
    return "list";
  }

  const cookieParts = cookieHeader.split(";");
  for (const part of cookieParts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== DRIVE_VIEW_MODE_COOKIE_KEY) {
      continue;
    }

    return normalizeDriveViewMode(rest.join("="));
  }

  return "list";
}

export function readDriveViewModeFromStorage(): DriveViewMode {
  if (typeof window === "undefined") {
    return "list";
  }

  return normalizeDriveViewMode(window.localStorage.getItem(DRIVE_VIEW_MODE_STORAGE_KEY));
}

export function persistDriveViewMode(mode: DriveViewMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRIVE_VIEW_MODE_STORAGE_KEY, mode);
  document.cookie = `${DRIVE_VIEW_MODE_COOKIE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
}
