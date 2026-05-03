import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { ErrorPage } from "#/components/shared/error-page";
import { loadDriveListing } from "#/lib/drive-listing.server-fns";
import { getErrorCode, getFolderIdFromSplat, getPathSegmentsFromParams } from "#/lib/utils";
import { Route as RootRoute } from "#/routes/__root";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/drive/_layout/$")({
  loader: async ({ params }) => {
    return await loadDriveListing({ data: { folderId: getFolderIdFromSplat(params) } });
  },
  component: RouteComponent,
  errorComponent: ({ error }) => {
    const code = getErrorCode(error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    return <ErrorPage code={code} title={"Something went wrong"} description={message} />;
  },
});

function RouteComponent() {
  const { user } = RootRoute.useRouteContext();
  const listing = Route.useLoaderData();
  const params = Route.useParams();
  const pathSegments = getPathSegmentsFromParams(params);
  const currentFolderId = getFolderIdFromSplat(params);

  return (
    <DriveFolderPage
      user={user}
      initialData={listing}
      currentFolderId={currentFolderId}
      pathSegments={pathSegments}
    />
  );
}
