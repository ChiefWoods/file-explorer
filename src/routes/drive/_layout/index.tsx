import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { ErrorPage } from "#/components/shared/error-page";
import { getErrorCode } from "#/lib/utils";
import { Route as RootRoute } from "#/routes/__root";
import { createFileRoute } from "@tanstack/react-router";

import { Route as DriveLayoutRoute } from "../_layout";

export const Route = createFileRoute("/drive/_layout/")({
  head: () => ({
    meta: [{ title: "My Drive - File Uploader" }],
  }),
  component: RouteComponent,
  errorComponent: ({ error }) => {
    const code = getErrorCode(error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    return <ErrorPage code={code} title={"Something went wrong"} description={message} />;
  },
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
