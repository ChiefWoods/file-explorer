import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { Route as RootRoute } from "#/routes/__root";
import { createFileRoute } from "@tanstack/react-router";

import { Route as DriveLayoutRoute } from "../_layout";

export const Route = createFileRoute("/drive/_layout/")({
  head: () => ({
    meta: [{ title: "My Drive - File Uploader" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = RootRoute.useRouteContext();
  const listing = DriveLayoutRoute.useLoaderData();

  return (
    <DriveFolderPage
      user={user}
      initialData={listing}
      currentFolderId={listing.folderId}
      pathSegments={[]}
    />
  );
}
