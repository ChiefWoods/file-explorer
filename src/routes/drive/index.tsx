import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { loadDriveListing } from "#/lib/drive-listing.server-fns";
import { Route as RootRoute } from "#/routes/__root";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/drive/")({
  head: () => ({
    meta: [{ title: "My Drive - File Uploader" }],
  }),
  loader: async ({ location }) => {
    if (location.pathname !== "/drive") {
      return null;
    }

    if (typeof window !== "undefined") {
      return null;
    }

    return loadDriveListing({ data: { folderId: "root" } });
  },
  component: DrivePage,
});

function DrivePage() {
  const location = useLocation();
  const loaderData = Route.useLoaderData() as DriveFolderListingResponse | null;
  const { user } = RootRoute.useRouteContext();

  if (!user) {
    return null;
  }

  if (location.pathname !== "/drive") {
    return <Outlet />;
  }

  return (
    <DriveFolderPage
      user={user}
      initialData={loaderData ?? undefined}
      currentFolderId={loaderData?.folderId ?? "root"}
      pathSegments={[]}
    />
  );
}
