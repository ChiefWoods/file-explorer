export type DriveItemRecord = {
  id: string;
  type: "folder" | "file";
  name: string;
  modified: string;
  bytes?: number;
};

export type DriveItemsViewProps = {
  isAuthenticated: boolean;
  items: DriveItemRecord[];
  selectedIds: Set<string>;
  canDownloadSelected: boolean;
  isDownloadingSelected: boolean;
  isDeletingSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onContextMenuSelect: (itemId: string) => void;
  onOpenFolder: (item: DriveItemRecord & { type: "folder" }) => void;
  onRenameItem: (item: DriveItemRecord) => void;
  onDownloadItem: (item: DriveItemRecord) => void;
  onDownloadSelected: () => void;
  onShareItem: (item: DriveItemRecord) => void;
  onDeleteItem: (item: DriveItemRecord) => void;
  onDeleteSelected: () => void;
  deletingItemIds: Set<string>;
  renderItemIcon: (item: DriveItemRecord) => React.ReactNode;
};
