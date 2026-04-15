import type { DriveViewMode } from "#/lib/drive-view-mode";

export type DriveFolderListingResponse = {
  folderId: string;
  isOwner: boolean;
  viewMode: DriveViewMode;
  breadcrumbs: Array<{ id: string; name: string }>;
  folders: Array<{ id: string; name: string; modifiedAt: string }>;
  files: Array<{ id: string; name: string; modifiedAt: string; bytes: number; mimeType: string }>;
  storageUsedBytes: number;
};
