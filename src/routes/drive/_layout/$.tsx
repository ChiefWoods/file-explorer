import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { getPathSegmentsFromParams } from "#/lib/utils";
import { Route as RootRoute } from "#/routes/__root";
import { createFileRoute } from "@tanstack/react-router";

import { Route as DriveLayoutRoute } from "../_layout";

export const Route = createFileRoute("/drive/_layout/$")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = RootRoute.useRouteContext();
  const listing = DriveLayoutRoute.useLoaderData();
  const params = Route.useParams();
  const pathSegments = getPathSegmentsFromParams(params);
  const currentFolderId = pathSegments[pathSegments.length - 1] ?? "root";

  return (
    <DriveFolderPage
      user={user}
      initialData={listing}
      currentFolderId={currentFolderId}
      pathSegments={pathSegments}
    />
  );
}
