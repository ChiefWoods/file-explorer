import type { DriveViewMode } from "#/lib/drive-view-mode";

export type DriveSidebarFolderNode = {
  id: string;
  name: string;
  path: string;
  children: DriveSidebarFolderNode[];
};

export type DriveFolderListingResponse = {
  folderId: string;
  isOwner: boolean;
  viewMode: DriveViewMode;
  breadcrumbs: Array<{ id: string; name: string }>;
  sidebarFolders: DriveSidebarFolderNode[];
  folders: Array<{ id: string; name: string; modifiedAt: string }>;
  files: Array<{ id: string; name: string; modifiedAt: string; bytes: number; mimeType: string }>;
  storageUsedBytes: number;
};
