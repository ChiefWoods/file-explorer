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
  onToggleSelect: (itemId: string) => void;
  onOpenFolder: (item: DriveItemRecord & { type: "folder" }) => void;
  onRenameItem: (item: DriveItemRecord) => void;
  onDownloadItem: (item: DriveItemRecord) => void;
  onShareItem: (item: DriveItemRecord) => void;
  onDeleteItem: (item: DriveItemRecord) => void;
  renderItemIcon: (item: DriveItemRecord) => React.ReactNode;
};
