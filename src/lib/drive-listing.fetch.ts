import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

type ApiErrorShape = { error?: { message?: string } };

export async function requestDriveListing(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<DriveFolderListingResponse> {
  const response = await fetch(input, init);
  const json = (await response.json().catch(() => null)) as
    | DriveFolderListingResponse
    | ApiErrorShape
    | null;

  if (!response.ok || !isDriveFolderListingResponse(json)) {
    const errorMessage =
      json && typeof json === "object" && "error" in json ? json.error?.message : undefined;
    throw new Error(errorMessage ?? "Could not load folder.");
  }

  return json;
}

function isDriveFolderListingResponse(value: unknown): value is DriveFolderListingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "folderId" in value &&
    typeof (value as { folderId?: unknown }).folderId === "string" &&
    "breadcrumbs" in value &&
    Array.isArray((value as { breadcrumbs?: unknown }).breadcrumbs)
  );
}
