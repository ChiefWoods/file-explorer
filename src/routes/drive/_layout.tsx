import { DriveSidebar } from "#/components/drive/drive-sidebar";
import { SidebarProvider } from "#/components/ui/sidebar";
import { loadDriveListing } from "#/lib/drive-listing.server-fns";
import { getFolderIdFromSplat } from "#/lib/utils";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/drive/_layout")({
  loader: async ({ params }) => {
    return await loadDriveListing({ data: { folderId: getFolderIdFromSplat(params) } });
  },
  head: ({ params }) => ({
    meta: [{ title: `${getFolderIdFromSplat(params)} - File Uploader` }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { sidebarFolders, storageUsedBytes, storagePct, folderId } = Route.useLoaderData();

  return (
    <SidebarProvider>
      <main className="min-h-screen min-w-screen">
        <div className="island-shell flex min-h-screen w-full overflow-hidden rounded-none">
          <DriveSidebar
            storageUsed={storageUsedBytes}
            storagePct={storagePct}
            currentFolderId={folderId}
            nestedFolders={sidebarFolders}
          />
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
