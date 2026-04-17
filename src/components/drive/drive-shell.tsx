import type { DriveSidebarFolderNode } from "#/lib/drive-listing.types";

import { DriveSidebar } from "#/components/drive/drive-sidebar";
import { SidebarProvider } from "#/components/ui/sidebar";

type SidebarUser = {
  name: string;
  email: string;
};

type DriveShellProps = {
  user: SidebarUser | null;
  storageUsed: number;
  storagePct: number;
  currentFolderId?: string;
  nestedFolders?: DriveSidebarFolderNode[];
  title: React.ReactNode;
  actions?: React.ReactNode;
  topContent?: React.ReactNode;
  children: React.ReactNode;
};

export function DriveShell({
  user,
  storageUsed,
  storagePct,
  currentFolderId,
  nestedFolders,
  title,
  actions,
  topContent,
  children,
}: DriveShellProps) {
  return (
    <SidebarProvider>
      <main className="min-h-screen min-w-screen">
        <div className="island-shell flex min-h-screen w-full overflow-hidden rounded-none">
          <DriveSidebar
            user={user}
            storageUsed={storageUsed}
            storagePct={storagePct}
            currentFolderId={currentFolderId}
            nestedFolders={nestedFolders}
          />

          <section className="flex min-w-0 flex-1 flex-col gap-4 bg-(--bg-base) p-6">
            <div className="flex flex-col gap-2">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <div className="min-w-0 text-lg font-bold text-(--sea-ink)">{title}</div>
                <div className="flex min-h-9 items-center gap-2.5">{actions}</div>
              </div>
              {topContent}
            </div>
            {children}
          </section>
        </div>
      </main>
    </SidebarProvider>
  );
}
