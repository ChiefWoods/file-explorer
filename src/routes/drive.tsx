import {
  Copy,
  CopyCheck,
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
import { useForm } from "@tanstack/react-form";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FileDropzone } from "#/components/drive/file-dropzone";
import { DriveItemsView } from "#/components/drive/drive-items-view";
import type { DriveItemRecord } from "#/components/drive/drive-items.types";
import { DriveShell } from "#/components/drive/drive-shell";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { authClient } from "#/lib/auth-client";
import { auth } from "#/lib/auth";
import { getSession } from "#/lib/auth.functions";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { ensureUserRootFolder } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { formatFieldErrors } from "#/lib/field-errors";
import { safeInternalPath } from "#/lib/nav-redirect";
import { queryKeys } from "#/lib/query-keys";
import { SHARE_DURATION_PRESETS, type ShareDurationPreset } from "#/lib/share-duration";
import { uploadFilesFormSchema } from "#/lib/schemas/drive-forms";

const DRIVE_VIEW_MODE_STORAGE_KEY = "drive:view-mode";

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
  loader: async () => {
    return getRootDriveListing();
  },
  component: DrivePage,
});

type DriveItem = DriveTableItem & { mimeType?: string };

type DriveListingResponse = {
  rootFolderId: string;
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

    const rootFolder = await ensureUserRootFolder(session.user.id);

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId: session.user.id,
          parentId: rootFolder.id,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
      prisma.file.findMany({
        where: {
          userId: session.user.id,
          folderId: rootFolder.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          bytes: true,
          mimeType: true,
        },
      }),
    ]);

    return {
      rootFolderId: rootFolder.id,
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
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [renameTargetItem, setRenameTargetItem] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareDuration, setShareDuration] = useState<ShareDurationPreset>("7d");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");
  const [didCopyShareLink, setDidCopyShareLink] = useState(false);
  const [shareTargetFolder, setShareTargetFolder] = useState<
    (DriveItem & { type: "folder" }) | null
  >(null);
  const [existingShareReminder, setExistingShareReminder] = useState<string | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") {
      return "list";
    }

    const stored = window.localStorage.getItem(DRIVE_VIEW_MODE_STORAGE_KEY);
    return stored === "grid" || stored === "list" ? stored : "list";
  });
  const initialRootListing = Route.useLoaderData();
  const rootFolderId = initialRootListing.rootFolderId;
  const [items, setItems] = useState<DriveItem[]>(() => mapListingToItems(initialRootListing));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const rootListingQuery = useQuery({
    ...rootDriveListingQueryOptions,
    initialData: initialRootListing,
  });

  useEffect(() => {
    if (rootListingQuery.data) {
      setItems(mapListingToItems(rootListingQuery.data));
    }
  }, [rootListingQuery.data]);

  useEffect(() => {
    if (!didCopyShareLink) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDidCopyShareLink(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [didCopyShareLink]);

  useEffect(() => {
    window.localStorage.setItem(DRIVE_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const folderItems = useMemo(
    () => items.filter((item): item is DriveItem & { type: "folder" } => item.type === "folder"),
    [items],
  );

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

  async function deleteSelected() {
    if (selectedIds.size === 0 || isDeletingSelected) {
      return;
    }

    setIsDeletingSelected(true);
    try {
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      const results = await Promise.allSettled(
        selectedItems.map(async (item) => {
          const endpoint =
            item.type === "file" ? `/api/drive/files/${item.id}` : `/api/drive/folders/${item.id}`;

          const response = await fetch(endpoint, { method: "DELETE" });
          const json = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;

          if (!response.ok) {
            throw new Error(
              json?.error?.message ??
                `Could not delete ${item.type === "file" ? "file" : "folder"}.`,
            );
          }

          return item.id;
        }),
      );

      const failedItemIds = new Set<string>();
      let successCount = 0;
      let firstErrorMessage: string | null = null;

      for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        if (result.status === "fulfilled") {
          successCount += 1;
          continue;
        }

        failedItemIds.add(selectedItems[index].id);
        if (!firstErrorMessage && result.reason instanceof Error) {
          firstErrorMessage = result.reason.message;
        }
      }

      await refreshDriveListing();
      setSelectedIds(failedItemIds);

      if (successCount > 0) {
        toast.success(successCount === 1 ? "1 item deleted." : `${successCount} items deleted.`);
      }

      if (failedItemIds.size > 0) {
        toast.error(
          firstErrorMessage ??
            `${failedItemIds.size} item${failedItemIds.size > 1 ? "s" : ""} could not be deleted.`,
        );
      }
    } finally {
      setIsDeletingSelected(false);
    }
  }

  async function refreshDriveListing() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.drive.listing(null) });
    await rootListingQuery.refetch();
  }

  function getApiErrorMessage(json: unknown, fallback: string): string {
    if (
      json &&
      typeof json === "object" &&
      "error" in json &&
      json.error &&
      typeof json.error === "object" &&
      "message" in json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
    ) {
      return (json.error as { message: string }).message;
    }

    return fallback;
  }

  async function renameItem(item: DriveItem, nextNameRaw: string) {
    const nextName = nextNameRaw.trim();
    if (!nextName || nextName === item.name) {
      return;
    }

    const endpoint =
      item.type === "folder" ? `/api/drive/folders/${item.id}` : `/api/drive/files/${item.id}`;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(json, `Could not rename ${item.type}.`));
    }

    await refreshDriveListing();
    toast.success(`${item.type === "folder" ? "Folder" : "File"} renamed.`);
  }

  async function downloadItem(item: DriveItem) {
    if (item.type === "folder") {
      toast.error("Folder download is not available yet.");
      return;
    }

    const response = await fetch(`/api/drive/files/${item.id}`);
    const json = (await response.json().catch(() => null)) as {
      downloadUrl?: string;
      error?: { message?: string };
    } | null;

    if (!response.ok || !json?.downloadUrl) {
      throw new Error(getApiErrorMessage(json, "Could not get download link."));
    }

    window.location.assign(json.downloadUrl);
  }

  async function shareItem(item: DriveItem) {
    if (item.type !== "folder") {
      return;
    }

    const folderItem = item as DriveItem & { type: "folder" };
    setShareTargetFolder(folderItem);
    setShareDuration("7d");
    setGeneratedShareUrl("");
    setExistingShareReminder(null);
    setShareDialogOpen(true);

    const response = await fetch(`/api/drive/share?folderId=${folderItem.id}`);
    const json = (await response.json().catch(() => null)) as {
      links?: Array<{ url?: string; expiresAt?: string | null }>;
      error?: { message?: string };
    } | null;

    if (!response.ok || !json?.links) {
      return;
    }

    const link = json.links[0];
    if (!link?.url) {
      return;
    }

    setExistingShareReminder(
      link.expiresAt
        ? `This folder already has a share link. It expires on ${formatExactExpiry(link.expiresAt)}.`
        : "This folder already has a share link. It never expires.",
    );
  }

  function formatShareDurationLabel(duration: ShareDurationPreset): string {
    if (duration === "never") {
      return "Never Expire";
    }
    return duration;
  }

  async function copyShareLinkToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setDidCopyShareLink(true);
    } catch {}
  }

  function formatExactExpiry(expiresAtRaw: string): string {
    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) {
      return "an unknown date/time";
    }

    return expiresAt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleRenameItem(item: DriveItem) {
    setRenameTargetItem(item);
    setRenameValue(item.name);
    setRenameDialogOpen(true);
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renameTargetItem || isRenamingItem) {
      return;
    }

    setIsRenamingItem(true);
    try {
      await renameItem(renameTargetItem, renameValue);
      setRenameDialogOpen(false);
      setRenameTargetItem(null);
      setRenameValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename item.");
    } finally {
      setIsRenamingItem(false);
    }
  }

  async function handleDownloadItem(item: DriveItem) {
    try {
      await downloadItem(item);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download item.");
    }
  }

  async function handleDeleteItem(item: DriveItem) {
    try {
      const endpoint =
        item.type === "file" ? `/api/drive/files/${item.id}` : `/api/drive/folders/${item.id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      const json = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(
          json?.error?.message ?? `Could not delete ${item.type === "file" ? "file" : "folder"}.`,
        );
      }

      await refreshDriveListing();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.success(`${item.type === "file" ? "File" : "Folder"} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item.");
    }
  }

  async function handleShareItem(item: DriveItem) {
    try {
      await shareItem(item);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share item.");
    }
  }

  async function handleGenerateShareLink() {
    if (!shareTargetFolder || isGeneratingShare) {
      return;
    }

    setIsGeneratingShare(true);
    try {
      const response = await fetch("/api/drive/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: shareTargetFolder.id,
          duration: shareDuration,
        }),
      });

      const json = (await response.json().catch(() => null)) as {
        url?: string;
        error?: { message?: string };
      } | null;

      if (!response.ok || !json?.url) {
        throw new Error(getApiErrorMessage(json, "Could not create share link."));
      }

      setGeneratedShareUrl(json.url);
      await queryClient.invalidateQueries({ queryKey: queryKeys.share.links(null) });
      await copyShareLinkToClipboard(json.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate share link.");
    } finally {
      setIsGeneratingShare(false);
    }
  }

  const uploadForm = useForm({
    defaultValues: {
      folderId: "root",
      files: [] as File[],
    },
    validators: { onSubmit: uploadFilesFormSchema },
    onSubmit: async ({ value }) => {
      const formData = new FormData();
      formData.append("folderId", value.folderId);
      for (const file of value.files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/drive/uploads", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(json.error?.message ?? "Could not upload files.");
      }

      setUploadDialogOpen(false);
      uploadForm.reset();
      await refreshDriveListing();
      toast.success(
        value.files.length === 1 ? "File uploaded." : `${value.files.length} files uploaded.`,
      );
    },
  });

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name || isCreatingFolder) {
      return;
    }

    setIsCreatingFolder(true);
    try {
      const response = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: rootFolderId }),
      });
      const json = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(json.error?.message ?? "Could not create folder.");
      }

      setNewFolderName("");
      setFolderDialogOpen(false);
      await refreshDriveListing();
      toast.success("Folder created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  }

  const myDriveContent = (
    <DriveItemsView
      viewMode={viewMode}
      isPending={rootListingQuery.isPending}
      isError={rootListingQuery.isError}
      errorMessage={
        rootListingQuery.error instanceof Error
          ? rootListingQuery.error.message
          : "Something went wrong while loading your files."
      }
      pendingTitle="Loading drive..."
      emptyTitle="This folder is empty"
      emptyDescription="Upload files or create a folder to get started."
      items={items}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      onRenameItem={handleRenameItem}
      onDownloadItem={(item) => {
        void handleDownloadItem(item as DriveItem);
      }}
      onShareItem={(item) => {
        void handleShareItem(item as DriveItem);
      }}
      onDeleteItem={(item) => {
        void handleDeleteItem(item as DriveItem);
      }}
      formatBytes={formatBytes}
      renderItemIcon={(item) => <DriveItemIcon item={item as DriveItem} />}
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
          <Dialog
            open={uploadDialogOpen}
            onOpenChange={(nextOpen) => {
              setUploadDialogOpen(nextOpen);
              if (!nextOpen) {
                uploadForm.reset();
              }
            }}
          >
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <Upload data-icon="inline-start" />
              Upload
            </DialogTrigger>
            <DialogContent className="overflow-x-hidden overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload files</DialogTitle>
                <DialogDescription>
                  Pick a destination folder, then choose files or drag-and-drop them here.
                </DialogDescription>
              </DialogHeader>
              <form
                className="min-w-0 space-y-4 overflow-x-hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  void uploadForm.handleSubmit().catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Could not upload files.");
                  });
                }}
              >
                <uploadForm.Field
                  name="folderId"
                  children={(field) => {
                    const errors = formatFieldErrors(field.state.meta.errors);
                    return (
                      <div className="min-w-0 space-y-2">
                        <Label>Destination folder</Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(String(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="root">Root</SelectItem>
                            {folderItems.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {folderItems.length === 0 && (
                          <p className="text-xs text-[var(--sea-ink-soft)]">
                            No folders created yet.
                          </p>
                        )}
                        {errors.length > 0 && (
                          <p className="text-xs text-destructive">{errors.join(" ")}</p>
                        )}
                      </div>
                    );
                  }}
                />

                <uploadForm.Field
                  name="files"
                  children={(field) => {
                    const errors = formatFieldErrors(field.state.meta.errors);
                    return (
                      <div className="min-w-0 space-y-2">
                        <FileDropzone
                          files={field.state.value}
                          onFilesChange={field.handleChange}
                        />
                        {errors.length > 0 && (
                          <p className="text-xs text-destructive">{errors.join(" ")}</p>
                        )}
                      </div>
                    );
                  }}
                />

                <uploadForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting] as const}
                  children={([canSubmit, isSubmitting]) => (
                    <DialogFooter>
                      <Button type="submit" disabled={!canSubmit || isSubmitting}>
                        {isSubmitting ? "Uploading..." : "Upload"}
                      </Button>
                    </DialogFooter>
                  )}
                />
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
              <FolderPlus data-icon="inline-start" />
              New folder
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New folder</DialogTitle>
                <DialogDescription>Create a new folder in My Drive.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(event) => void handleCreateFolder(event)}>
                <div className="space-y-2">
                  <Label htmlFor="new-folder-name">Folder name</Label>
                  <Input
                    id="new-folder-name"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Enter folder name"
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreatingFolder || !newFolderName.trim()}>
                    {isCreatingFolder ? "Creating..." : "Create folder"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={renameDialogOpen}
            onOpenChange={(nextOpen) => {
              setRenameDialogOpen(nextOpen);
              if (!nextOpen) {
                setRenameTargetItem(null);
                setRenameValue("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Rename {renameTargetItem?.type === "folder" ? "folder" : "file"}
                </DialogTitle>
                <DialogDescription>
                  Enter a new name for {renameTargetItem?.name ?? "this item"}.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(event) => void handleRenameSubmit(event)}>
                <div className="space-y-2">
                  <Label htmlFor="rename-item-name">Name</Label>
                  <Input
                    id="rename-item-name"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder="Enter new name"
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isRenamingItem || !renameValue.trim()}>
                    {isRenamingItem ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={shareDialogOpen}
            onOpenChange={(nextOpen) => {
              setShareDialogOpen(nextOpen);
              if (!nextOpen) {
                setShareTargetFolder(null);
                setShareDuration("7d");
                setGeneratedShareUrl("");
                setDidCopyShareLink(false);
                setExistingShareReminder(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share folder</DialogTitle>
                <DialogDescription>
                  Generate a deterministic link for {shareTargetFolder?.name ?? "this folder"}.
                </DialogDescription>
              </DialogHeader>
              {existingShareReminder && (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-[var(--sea-ink-soft)]">
                  {existingShareReminder}
                </p>
              )}

              <div className="space-y-2">
                <Label>Duration</Label>
                <ButtonGroup className="w-full">
                  {SHARE_DURATION_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={shareDuration === preset ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setShareDuration(preset)}
                    >
                      {formatShareDurationLabel(preset)}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>

              {generatedShareUrl && (
                <div className="space-y-2">
                  <Label htmlFor="generated-share-link">Generated link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="generated-share-link"
                      value={generatedShareUrl}
                      onChange={(event) => setGeneratedShareUrl(event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copyShareLinkToClipboard(generatedShareUrl)}
                    >
                      {didCopyShareLink ? (
                        <CopyCheck className="rounded-[4px] text-emerald-600" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={() => void handleGenerateShareLink()}
                disabled={!shareTargetFolder || isGeneratingShare}
              >
                {isGeneratingShare ? "Generating..." : "Generate and copy link"}
              </Button>
            </DialogContent>
          </Dialog>

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
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void deleteSelected()}
              disabled={isDeletingSelected || selectedCount === 0}
            >
              <Trash2 data-icon="inline-start" />
              {isDeletingSelected ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )
      }
    >
      {myDriveContent}
    </DriveShell>
  );
}
