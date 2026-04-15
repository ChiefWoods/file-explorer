import { Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";

import { DriveFolderPage } from "#/components/drive/drive-folder-page";
import { getSession } from "#/lib/auth.functions";
import { loadDriveListing } from "#/lib/drive-listing.server-fns";
import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";
import { safeInternalPath } from "#/lib/nav-redirect";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [{ title: "My Drive - File Uploader" }],
  }),
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session?.session) {
      const href = `${location.pathname}${location.searchStr}`;
      throw redirect({
        to: "/sign-in",
        search: { redirect: safeInternalPath(href, "/drive") },
      });
    }
    return {
      user: session.user,
      session: session.session,
    };
  },
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
  const { user } = Route.useRouteContext();

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
