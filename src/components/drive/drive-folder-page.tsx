import type { DriveItemRecord } from "#/components/drive/drive-items.types";
import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

import { DriveItemsView } from "#/components/drive/drive-items-view";
import { DriveShell } from "#/components/drive/drive-shell";
import { FileDropzone } from "#/components/drive/file-dropzone";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { Calendar } from "#/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { authClient } from "#/lib/auth-client";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { fetchDriveListing } from "#/lib/drive-listing";
import { persistDriveViewMode, readDriveViewModeFromStorage } from "#/lib/drive-view-mode";
import { formatFieldErrors } from "#/lib/field-errors";
import { formatBytes } from "#/lib/format-bytes";
import { queryKeys } from "#/lib/query-keys";
import { uploadFilesFormSchema } from "#/lib/schemas/drive-forms";
import { SHARE_DURATION_PRESETS, type ShareDurationPreset } from "#/lib/share-duration";
import { ALLOWED_UPLOAD_MIME_TYPES } from "#/lib/upload-policy";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
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
  Calendar as CalendarIcon,
  ChevronRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type DriveItem = DriveItemRecord & { mimeType?: string; modifiedAtMs: number };
type TypeFilterValue = "folders" | string;
type AddedFilterValue =
  | "today"
  | "last-7-days"
  | "last-30-days"
  | "this-year"
  | "last-year"
  | "custom-range";

const MIME_TYPE_FILTER_OPTIONS = [...ALLOWED_UPLOAD_MIME_TYPES].sort();

function formatMimeTypeLabel(mimeType: string): string {
  const [topLevel, subTypeRaw] = mimeType.split("/");
  const subType = (subTypeRaw ?? mimeType).split(".").pop() ?? mimeType;
  const normalized = subType.replace(/[-_+.]/g, " ").trim();
  const label =
    normalized.length > 0
      ? normalized.replace(/\b\w/g, (char) => char.toUpperCase())
      : mimeType.toUpperCase();

  if (topLevel === "application" && label.toLowerCase() === "json") {
    return "JSON";
  }

  return label;
}

type DriveFolderPageProps = {
  user: {
    name: string;
    email: string;
  } | null;
  initialData?: DriveFolderListingResponse;
  currentFolderId: string;
  pathSegments: string[];
};

function formatModifiedAt(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateInputLabel(date: Date | undefined, placeholder: string): string {
  if (!date) {
    return placeholder;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapListingToItems(listing: DriveFolderListingResponse): DriveItem[] {
  const folders: DriveItem[] = listing.folders.map((folder) => ({
    id: folder.id,
    type: "folder",
    name: folder.name,
    modified: formatModifiedAt(folder.modifiedAt),
    modifiedAtMs: new Date(folder.modifiedAt).getTime(),
  }));

  const files: DriveItem[] = listing.files.map((file) => ({
    id: file.id,
    type: "file",
    name: file.name,
    modified: formatModifiedAt(file.modifiedAt),
    modifiedAtMs: new Date(file.modifiedAt).getTime(),
    bytes: file.bytes,
    mimeType: file.mimeType,
  }));

  return [...folders, ...files];
}

function DriveItemIcon({ item }: { item: DriveItem }) {
  if (item.type === "folder") {
    return <FolderOpen className="size-4 text-primary" aria-hidden />;
  }
  if (item.mimeType?.startsWith("image/")) {
    return <FileImage className="size-4 text-primary" aria-hidden />;
  }
  if (item.mimeType?.includes("csv") || item.mimeType?.includes("excel")) {
    return <FileSpreadsheet className="size-4 text-primary" aria-hidden />;
  }
  return <FileText className="size-4 text-primary" aria-hidden />;
}

export function DriveFolderPage({
  user,
  initialData,
  currentFolderId,
  pathSegments,
}: DriveFolderPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      return readDriveViewModeFromStorage();
    }
    return initialData?.viewMode ?? "list";
  });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [renameTargetItem, setRenameTargetItem] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareDuration, setShareDuration] = useState<ShareDurationPreset>("7d");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");
  const [didCopyShareLink, setDidCopyShareLink] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue | null>(null);
  const [addedFilter, setAddedFilter] = useState<AddedFilterValue | null>(null);
  const [isAddedFilterOpen, setIsAddedFilterOpen] = useState(false);
  const [isAddedCustomRangeExpanded, setIsAddedCustomRangeExpanded] = useState(false);
  const [isCustomAfterPickerOpen, setIsCustomAfterPickerOpen] = useState(false);
  const [isCustomBeforePickerOpen, setIsCustomBeforePickerOpen] = useState(false);
  const [customAddedAfter, setCustomAddedAfter] = useState<Date | undefined>(undefined);
  const [customAddedBefore, setCustomAddedBefore] = useState<Date | undefined>(undefined);
  const [shareTargetFolder, setShareTargetFolder] = useState<
    (DriveItem & { type: "folder" }) | null
  >(null);
  const [existingShareReminder, setExistingShareReminder] = useState<string | null>(null);
  const [items, setItems] = useState<DriveItem[]>(() =>
    initialData ? mapListingToItems(initialData) : [],
  );
  const selectedCount = selectedIds.size;

  const listingQuery = useQuery({
    queryKey: queryKeys.drive.listing(currentFolderId),
    queryFn: () => fetchDriveListing(currentFolderId),
    initialData: initialData && initialData.folderId === currentFolderId ? initialData : undefined,
    staleTime: 30_000,
  });
  const listing = listingQuery.data ?? initialData;
  const resolvedFolderId = listing?.folderId ?? currentFolderId;

  useEffect(() => {
    if (!listing) {
      setItems([]);
      return;
    }
    setItems(mapListingToItems(listing));
    setSelectedIds(new Set());
  }, [listing]);

  useEffect(() => {
    persistDriveViewMode(viewMode);
  }, [viewMode]);

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
    setSelectedIds(new Set());
  }, [typeFilter, addedFilter, customAddedAfter, customAddedBefore]);

  const storageUsed = listing?.storageUsedBytes ?? 0;
  const storagePct = Math.min(100, (storageUsed / USER_STORAGE_LIMIT_BYTES) * 100);
  const breadcrumbs = listing?.breadcrumbs ?? [];
  const activeFolderName = breadcrumbs.at(-1)?.name ?? null;
  const visibleBreadcrumbs = breadcrumbs.slice(1);
  const sidebarNestedFolders = listing?.sidebarFolders ?? [];

  useEffect(() => {
    if (pathSegments.length === 0) {
      document.title = "My Drive - File Uploader";
      return;
    }
    document.title = activeFolderName
      ? `${activeFolderName} - File Uploader`
      : "My Drive - File Uploader";
  }, [activeFolderName, pathSegments.length]);

  const title = (
    <Breadcrumb>
      <BreadcrumbList className="text-lg font-bold text-(--sea-ink-soft)">
        <BreadcrumbItem>
          <Link
            to="/drive"
            className="text-lg font-bold text-(--sea-ink) transition-colors hover:text-(--sea-ink)"
          >
            My Drive
          </Link>
        </BreadcrumbItem>
        {visibleBreadcrumbs.map((crumb: { id: string; name: string }, index: number) => {
          const isLast = index === visibleBreadcrumbs.length - 1;
          const path = visibleBreadcrumbs
            .slice(0, index + 1)
            .map((segment: { id: string }) => segment.id)
            .join("/");

          return (
            <Fragment key={crumb.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-lg font-bold text-(--sea-ink)">
                    {crumb.name}
                  </BreadcrumbPage>
                ) : (
                  <Link
                    to="/drive/$"
                    params={{ _splat: path }}
                    className="text-lg font-bold text-(--sea-ink) transition-colors hover:text-(--sea-ink)"
                  >
                    {crumb.name}
                  </Link>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );

  async function refreshDriveListing() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.drive.listing(currentFolderId),
    });
    await listingQuery.refetch();
  }

  const uploadForm = useForm({
    defaultValues: {
      files: [] as File[],
    },
    validators: { onSubmit: uploadFilesFormSchema },
    onSubmit: async ({ value }) => {
      const formData = new FormData();
      formData.append("folderId", resolvedFolderId);
      for (const file of value.files) {
        formData.append("files", file);
      }

      const uploadPromise = (async () => {
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
        return value.files.length;
      })();

      toast.promise(uploadPromise, {
        loading: "Uploading files...",
        success: (fileCount) =>
          fileCount === 1 ? "File uploaded." : `${fileCount} files uploaded.`,
        error: (error) => (error instanceof Error ? error.message : "Could not upload files."),
      });

      await uploadPromise;
    },
  });

  useEffect(() => {
    uploadForm.reset({ files: [] });
  }, [resolvedFolderId]);

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

  function getItemDeleteEndpoint(item: DriveItem): string {
    return item.type === "file" ? `/api/drive/files/${item.id}` : `/api/drive/folders/${item.id}`;
  }

  async function deleteDriveItem(item: DriveItem): Promise<void> {
    const response = await fetch(getItemDeleteEndpoint(item), { method: "DELETE" });
    const json = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      throw new Error(
        json?.error?.message ?? `Could not delete ${item.type === "file" ? "file" : "folder"}.`,
      );
    }
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

  async function copyShareLinkToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setDidCopyShareLink(true);
    } catch {}
  }

  async function deleteSelected() {
    if (selectedIds.size === 0 || isDeletingSelected) {
      return;
    }

    setIsDeletingSelected(true);
    try {
      const deletePromise = (async () => {
        const selectedItems = items.filter((item) => selectedIds.has(item.id));
        const results = await Promise.allSettled(
          selectedItems.map(async (item) => {
            await deleteDriveItem(item);
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

        if (failedItemIds.size > 0) {
          const prefix =
            successCount > 0 ? `Deleted ${successCount} item${successCount > 1 ? "s" : ""}, ` : "";
          throw new Error(
            firstErrorMessage ??
              `${prefix}${failedItemIds.size} item${failedItemIds.size > 1 ? "s" : ""} could not be deleted.`,
          );
        }

        return { successCount };
      })();

      toast.promise(deletePromise, {
        loading: "Deleting selected items...",
        success: ({ successCount }) =>
          successCount === 1 ? "1 item deleted." : `${successCount} items deleted.`,
        error: (error) => (error instanceof Error ? error.message : "Could not delete items."),
      });

      await deletePromise;
    } finally {
      setIsDeletingSelected(false);
    }
  }

  async function handleDeleteItem(item: DriveItem) {
    const deletePromise = (async () => {
      await deleteDriveItem(item);
      await refreshDriveListing();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      return item.type;
    })();

    toast.promise(deletePromise, {
      loading: `Deleting ${item.type}...`,
      success: (itemType) => `${itemType === "file" ? "File" : "Folder"} deleted.`,
      error: (error) => (error instanceof Error ? error.message : "Could not delete item."),
    });

    await deletePromise;
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
      const renamePromise = renameItem(renameTargetItem, renameValue);
      toast.promise(renamePromise, {
        loading: `Renaming ${renameTargetItem.type}...`,
        success: `${renameTargetItem.type === "folder" ? "Folder" : "File"} renamed.`,
        error: (error) => (error instanceof Error ? error.message : "Could not rename item."),
      });
      await renamePromise;
      setRenameDialogOpen(false);
      setRenameTargetItem(null);
      setRenameValue("");
    } catch {
      // toast.promise handles the error UI.
    } finally {
      setIsRenamingItem(false);
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.share.links(null),
      });
      await copyShareLinkToClipboard(json.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate share link.");
    } finally {
      setIsGeneratingShare(false);
    }
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name || isCreatingFolder) {
      return;
    }

    setIsCreatingFolder(true);
    try {
      const createPromise = (async () => {
        const response = await fetch("/api/drive/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, parentId: resolvedFolderId }),
        });
        const json = (await response.json()) as { error?: { message?: string } };

        if (!response.ok) {
          throw new Error(json.error?.message ?? "Could not create folder.");
        }

        setNewFolderName("");
        setFolderDialogOpen(false);
        await refreshDriveListing();
      })();

      toast.promise(createPromise, {
        loading: "Creating folder...",
        success: "Folder created.",
        error: (error) => (error instanceof Error ? error.message : "Could not create folder."),
      });

      await createPromise;
    } finally {
      setIsCreatingFolder(false);
    }
  }

  function handleOpenFolder(item: DriveItem & { type: "folder" }) {
    const nextPath = [...pathSegments, item.id].join("/");
    void queryClient
      .prefetchQuery({
        queryKey: queryKeys.drive.listing(item.id),
        queryFn: () => fetchDriveListing(item.id),
        staleTime: 30_000,
      })
      .finally(() => {
        void router.navigate({
          to: "/drive/$",
          params: { _splat: nextPath },
        });
      });
  }

  function matchesTypeFilter(item: DriveItem): boolean {
    if (!typeFilter) {
      return true;
    }
    if (typeFilter === "folders") {
      return item.type === "folder";
    }
    if (item.type === "folder") {
      return false;
    }
    return item.mimeType?.toLowerCase() === typeFilter.toLowerCase();
  }

  function matchesAddedFilter(item: DriveItem): boolean {
    if (!addedFilter) {
      return true;
    }

    if (!Number.isFinite(item.modifiedAtMs)) {
      return false;
    }

    const now = new Date();
    const itemDate = new Date(item.modifiedAtMs);
    const nowYear = now.getFullYear();
    const itemYear = itemDate.getFullYear();

    if (addedFilter === "this-year") {
      return itemYear === nowYear;
    }
    if (addedFilter === "last-year") {
      return itemYear === nowYear - 1;
    }

    if (addedFilter === "today") {
      return (
        itemYear === nowYear &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate()
      );
    }

    if (addedFilter === "custom-range") {
      const itemTime = itemDate.getTime();

      if (customAddedAfter) {
        const afterStart = new Date(customAddedAfter);
        afterStart.setHours(0, 0, 0, 0);
        if (itemTime < afterStart.getTime()) {
          return false;
        }
      }

      if (customAddedBefore) {
        const beforeEnd = new Date(customAddedBefore);
        beforeEnd.setHours(23, 59, 59, 999);
        if (itemTime > beforeEnd.getTime()) {
          return false;
        }
      }

      return true;
    }

    const lookbackDays = addedFilter === "last-7-days" ? 7 : 30;
    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000;
    return now.getTime() - item.modifiedAtMs <= lookbackMs;
  }

  const filteredItems = items.filter(matchesTypeFilter).filter(matchesAddedFilter);
  const hasActiveAddedFilter =
    addedFilter !== null &&
    (addedFilter !== "custom-range" || !!customAddedAfter || !!customAddedBefore);

  const content = (
    <DriveItemsView
      isAuthenticated={!!user}
      viewMode={viewMode}
      isPending={listingQuery.isPending && !listing}
      isError={listingQuery.isError && !listing}
      errorCode={
        listingQuery.error && typeof listingQuery.error === "object"
          ? "statusCode" in listingQuery.error && typeof listingQuery.error.statusCode === "number"
            ? listingQuery.error.statusCode
            : "status" in listingQuery.error && typeof listingQuery.error.status === "number"
              ? listingQuery.error.status
              : undefined
          : undefined
      }
      errorMessage={
        listingQuery.error instanceof Error ? listingQuery.error.message : "Could not load folder."
      }
      pendingTitle="Loading folder..."
      emptyTitle="This folder is empty"
      emptyDescription="Upload files or create a folder to get started."
      items={filteredItems}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      onOpenFolder={(item) => {
        handleOpenFolder(item as DriveItem & { type: "folder" });
      }}
      onRenameItem={(item) => {
        handleRenameItem(item as DriveItem);
      }}
      onDownloadItem={(item) => {
        void downloadItem(item as DriveItem);
      }}
      onShareItem={(item) => {
        void shareItem(item as DriveItem);
      }}
      onDeleteItem={(item) => {
        void handleDeleteItem(item as DriveItem);
      }}
      formatBytes={formatBytes}
      renderItemIcon={(item) => <DriveItemIcon item={item as DriveItem} />}
    />
  );

  const selectionRibbon = (
    <div className="flex h-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2.5 text-sm text-(--sea-ink)">
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
  );

  const filterRibbon = (
    <div className="flex h-full items-center gap-2">
      <Select
        value={typeFilter}
        onValueChange={(value) => setTypeFilter(value ? (String(value) as TypeFilterValue) : null)}
      >
        <SelectTrigger size="sm" className="min-w-[144px]">
          <SelectValue>
            {(value) => {
              if (!value) {
                return "Type";
              }
              if (value === "folders") {
                return "Folders";
              }
              return formatMimeTypeLabel(String(value));
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value={null} label="Type">
            Type
          </SelectItem>
          <SelectItem value="folders" label="Folders">
            Folders
          </SelectItem>
          {MIME_TYPE_FILTER_OPTIONS.map((mimeType) => (
            <SelectItem key={mimeType} value={mimeType} label={formatMimeTypeLabel(mimeType)}>
              {formatMimeTypeLabel(mimeType)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        open={isAddedFilterOpen}
        onOpenChange={setIsAddedFilterOpen}
        value={addedFilter}
        onValueChange={(value) => {
          const nextValue = value ? (String(value) as AddedFilterValue) : null;
          setAddedFilter(nextValue);
          if (nextValue === "custom-range") {
            setIsAddedCustomRangeExpanded(true);
            setTimeout(() => {
              setIsAddedFilterOpen(true);
            }, 0);
          } else {
            setIsAddedCustomRangeExpanded(false);
            setCustomAddedAfter(undefined);
            setCustomAddedBefore(undefined);
          }
        }}
      >
        <SelectTrigger size="sm" className="min-w-[168px]">
          <SelectValue>
            {(value) => {
              if (!value) {
                return "Added";
              }
              if (value === "today") {
                return "Today";
              }
              if (value === "last-7-days") {
                return "Last 7 days";
              }
              if (value === "last-30-days") {
                return "Last 30 days";
              }
              if (value === "this-year") {
                return `This year (${new Date().getFullYear()})`;
              }
              if (value === "last-year") {
                return `Last year (${new Date().getFullYear() - 1})`;
              }
              if (value === "custom-range") {
                if (customAddedAfter && customAddedBefore) {
                  const afterLabel = formatDateInputLabel(customAddedAfter, "Any");
                  const beforeLabel = formatDateInputLabel(customAddedBefore, "Any");
                  return `${afterLabel} - ${beforeLabel}`;
                }
                if (customAddedAfter) {
                  return `After ${formatDateInputLabel(customAddedAfter, "Any")}`;
                }
                if (customAddedBefore) {
                  return `Before ${formatDateInputLabel(customAddedBefore, "Any")}`;
                }
                return "Custom range";
              }
              return "Added";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value={null} label="Added">
            Added
          </SelectItem>
          <SelectItem value="today" label="Today">
            Today
          </SelectItem>
          <SelectItem value="last-7-days" label="Last 7 days">
            Last 7 days
          </SelectItem>
          <SelectItem value="last-30-days" label="Last 30 days">
            Last 30 days
          </SelectItem>
          <SelectItem value="this-year" label={`This year (${new Date().getFullYear()})`}>
            This year ({new Date().getFullYear()})
          </SelectItem>
          <SelectItem value="last-year" label={`Last year (${new Date().getFullYear() - 1})`}>
            Last year ({new Date().getFullYear() - 1})
          </SelectItem>
          <button
            type="button"
            className="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setAddedFilter("custom-range");
              setIsAddedCustomRangeExpanded((prev) => !prev);
            }}
          >
            <span className="flex flex-1 items-center gap-2 whitespace-nowrap">
              Custom date range
            </span>
            <ChevronRight
              className={`size-4 text-muted-foreground transition-transform ${isAddedCustomRangeExpanded ? "rotate-90" : ""}`}
            />
          </button>
          {isAddedCustomRangeExpanded && (
            <div className="mt-1 space-y-2 border-t border-border p-2">
              <Popover open={isCustomAfterPickerOpen} onOpenChange={setIsCustomAfterPickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    />
                  }
                >
                  <CalendarIcon />
                  {formatDateInputLabel(customAddedAfter, "After")}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customAddedAfter}
                    onSelect={(date) => {
                      setCustomAddedAfter(date ?? undefined);
                      if (customAddedBefore && date && customAddedBefore < date) {
                        setCustomAddedBefore(date);
                      }
                      setIsCustomAfterPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Popover open={isCustomBeforePickerOpen} onOpenChange={setIsCustomBeforePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    />
                  }
                >
                  <CalendarIcon />
                  {formatDateInputLabel(customAddedBefore, "Before")}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customAddedBefore}
                    onSelect={(date) => {
                      setCustomAddedBefore(date ?? undefined);
                      if (customAddedAfter && date && customAddedAfter > date) {
                        setCustomAddedAfter(date);
                      }
                      setIsCustomBeforePickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </SelectContent>
      </Select>
      {(typeFilter || hasActiveAddedFilter) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTypeFilter(null);
            setAddedFilter(null);
            setIsAddedCustomRangeExpanded(false);
            setCustomAddedAfter(undefined);
            setCustomAddedBefore(undefined);
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <DriveShell
      user={user}
      storageUsed={storageUsed}
      storagePct={storagePct}
      isSigningOut={isSigningOut}
      onSignOut={() => void signOut()}
      currentFolderId={resolvedFolderId}
      nestedFolders={sidebarNestedFolders}
      title={title}
      actions={
        <>
          {!!user && (
            <Dialog
              open={uploadDialogOpen}
              onOpenChange={(nextOpen) => {
                setUploadDialogOpen(nextOpen);
                uploadForm.reset({ files: [] });
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
                  className="min-w-0 space-y-4 overflow-x-hidden overflow-y-hidden"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void uploadForm.handleSubmit().catch(() => {});
                  }}
                >
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
          )}

          {!!user && (
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger render={<Button type="button" size="sm" />}>
                <FolderPlus data-icon="inline-start" />
                New folder
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New folder</DialogTitle>
                  <DialogDescription>Create a new folder in this location.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(event) => void handleCreateFolder(event)}>
                  <div className="space-y-2">
                    <Label htmlFor="new-nested-folder-name">Folder name</Label>
                    <Input
                      id="new-nested-folder-name"
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
          )}

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
        <div className="h-11">
          {selectedCount > 0 && selectionRibbon}
          {selectedCount === 0 && filterRibbon}
        </div>
      }
    >
      {content}

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
              <Label htmlFor="rename-nested-item-name">Name</Label>
              <Input
                id="rename-nested-item-name"
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
            <div className="space-y-2">
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-(--sea-ink-soft)">
                {existingShareReminder}
              </p>
              <p className="text-xs text-(--sea-ink-soft)">
                Generating a new link will replace the current share link.
              </p>
            </div>
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
                  {preset === "never" ? "Never Expire" : preset}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {generatedShareUrl && (
            <div className="space-y-2">
              <Label htmlFor="generated-share-link-nested">Generated link</Label>
              <div className="flex gap-2">
                <Input
                  id="generated-share-link-nested"
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
    </DriveShell>
  );
}
