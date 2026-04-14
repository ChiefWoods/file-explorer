import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderPlus,
  Grid3X3,
  List,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DriveEmptyState } from "#/components/drive/drive-empty-state";
import { DriveErrorState } from "#/components/drive/drive-error-state";
import { DriveItemsGrid } from "#/components/drive/drive-items-grid";
import { DriveItemsTable, type DriveTableItem } from "#/components/drive/drive-items-table";
import { DriveShell } from "#/components/drive/drive-shell";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { auth } from "#/lib/auth";
import { getSession } from "#/lib/auth.functions";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { prisma } from "#/lib/db";
import { safeInternalPath } from "#/lib/nav-redirect";
import { queryKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/drive")({
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
  loader: async () => {
    return getRootDriveListing();
  },
  component: DrivePage,
});

type DriveItem = DriveTableItem & { mimeType?: string };

type DriveListingResponse = {
  folders: Array<{ id: string; name: string; modifiedAt: string }>;
  files: Array<{ id: string; name: string; modifiedAt: string; bytes: number; mimeType: string }>;
};

const getRootDriveListing = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriveListingResponse> => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error("Authentication required.");
    }

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId: session.user.id,
          parentId: null,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
      Promise.resolve(
        [] as Array<{ id: string; name: string; createdAt: Date; bytes: number; mimeType: string }>,
      ),
    ]);

    return {
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        modifiedAt: folder.updatedAt.toISOString(),
      })),
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        modifiedAt: file.createdAt.toISOString(),
        bytes: file.bytes,
        mimeType: file.mimeType,
      })),
    };
  },
);

const rootDriveListingQueryOptions = queryOptions({
  queryKey: queryKeys.drive.listing(null),
  queryFn: () => getRootDriveListing(),
  staleTime: 30_000,
});

function formatBytes(bytes?: number) {
  if (typeof bytes !== "number") return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatModifiedAt(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function mapListingToItems(listing: DriveListingResponse): DriveItem[] {
  const folders: DriveItem[] = listing.folders.map((folder) => ({
    id: folder.id,
    type: "folder",
    name: folder.name,
    modified: formatModifiedAt(folder.modifiedAt),
  }));

  const files: DriveItem[] = listing.files.map((file) => ({
    id: file.id,
    type: "file",
    name: file.name,
    modified: formatModifiedAt(file.modifiedAt),
    bytes: file.bytes,
    mimeType: file.mimeType,
  }));

  return [...folders, ...files];
}

function DriveItemIcon({ item }: { item: DriveItem }) {
  if (item.type === "folder") {
    return <FolderOpen className="size-4 text-[var(--primary)]" aria-hidden />;
  }
  if (item.mimeType?.startsWith("image/")) {
    return <FileImage className="size-4 text-[var(--primary)]" aria-hidden />;
  }
  if (item.mimeType?.includes("csv") || item.mimeType?.includes("excel")) {
    return <FileSpreadsheet className="size-4 text-[var(--primary)]" aria-hidden />;
  }
  return <FileText className="size-4 text-[var(--primary)]" aria-hidden />;
}

function DrivePage() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const initialRootListing = Route.useLoaderData();
  const rootListingQuery = useQuery({
    ...rootDriveListingQueryOptions,
    initialData: initialRootListing,
  });

  useEffect(() => {
    if (rootListingQuery.data) {
      setItems(mapListingToItems(rootListingQuery.data));
    }
  }, [rootListingQuery.data]);

  const storageUsed = useMemo(
    () => items.reduce((acc, item) => acc + (item.bytes ?? 0), 0),
    [items],
  );
  const storageTotal = USER_STORAGE_LIMIT_BYTES;
  const storagePct = Math.min(100, (storageUsed / storageTotal) * 100);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(error.message ?? "Could not sign out.");
        return;
      }

      await router.invalidate();
      await router.navigate({ to: "/sign-in", search: { redirect: undefined }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function toggleSelect(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    clearSelection();
    toast.success("Selected items deleted.");
  }

  const myDriveContent = rootListingQuery.isPending ? (
    <DriveEmptyState icon={FolderOpen} title="Loading drive..." description="" />
  ) : rootListingQuery.isError ? (
    <DriveErrorState
      title="Could not load drive"
      description={
        rootListingQuery.error instanceof Error
          ? rootListingQuery.error.message
          : "Something went wrong while loading your files."
      }
    />
  ) : items.length === 0 ? (
    <DriveEmptyState
      icon={FolderOpen}
      title="This folder is empty"
      description="Upload files or create a folder to get started."
    />
  ) : viewMode === "list" ? (
    <DriveItemsTable
      items={items}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      formatBytes={formatBytes}
      renderItemIcon={(item) => <DriveItemIcon item={item} />}
    />
  ) : (
    <DriveItemsGrid
      items={items}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      formatBytes={formatBytes}
      renderItemIcon={(item) => <DriveItemIcon item={item} />}
    />
  );

  return (
    <DriveShell
      user={user}
      storageUsed={storageUsed}
      storagePct={storagePct}
      isSigningOut={isSigningOut}
      onSignOut={() => void signOut()}
      title="My Drive"
      actions={
        <>
          <Button type="button" variant="outline" size="sm">
            <Upload data-icon="inline-start" />
            Upload
          </Button>
          <Button type="button" size="sm">
            <FolderPlus data-icon="inline-start" />
            New folder
          </Button>
          <div className="flex items-center rounded-[10px] border border-border bg-card p-0.5">
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List />
            </Button>
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 />
            </Button>
          </div>
        </>
      }
      topContent={
        selectedCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2.5 text-sm text-[var(--sea-ink)]">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <X />
              </Button>
              <span>{selectedCount} selected</span>
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        )
      }
    >
      {myDriveContent}
    </DriveShell>
  );
}
