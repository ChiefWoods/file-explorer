import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { loadDriveListing } from "#/lib/drive-listing.server-fns";
import { Route as RootRoute } from "#/routes/__root";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/drive/$")({
  head: () => ({
    meta: [{ title: "My Drive - File Uploader" }],
  }),
  loader: async ({ params }) => {
    if (typeof window !== "undefined") {
      return null;
    }

    const folderId = getFolderIdFromSplat(params);
    if (!folderId) {
      return null;
    }

    try {
      return await loadDriveListing({ data: { folderId } });
    } catch {
      return null;
    }
  },
  component: DriveAbsoluteFolderRoutePage,
});

function DriveAbsoluteFolderRoutePage() {
  const { user, session } = RootRoute.useRouteContext();
  const params = Route.useParams();
  const initialData = Route.useLoaderData() as DriveFolderListingResponse | null;
  const currentFolderId = getFolderIdFromSplat(params) ?? initialData?.folderId ?? "";
  const pathSegments = getPathSegmentsFromParams(params);

  if (!currentFolderId) {
    return null;
  }

  return (
    <DriveFolderPage
      isAuthenticated={Boolean(session)}
      user={user ?? {}}
      initialData={initialData ?? undefined}
      currentFolderId={currentFolderId}
      pathSegments={pathSegments}
    />
  );
}

function getPathSegmentsFromParams(params: Record<string, unknown>): string[] {
  const raw =
    (typeof params._splat === "string" && params._splat) ||
    (typeof params["*"] === "string" && params["*"]) ||
    "";
  return raw.split("/").filter(Boolean);
}

function getFolderIdFromSplat(params: Record<string, unknown>): string | null {
  const segments = getPathSegmentsFromParams(params);
  if (segments.length === 0) {
    return null;
  }
  return segments[segments.length - 1];
}
