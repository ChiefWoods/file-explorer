export type DriveItemRecord = {
  id: string;
  type: "folder" | "file";
  name: string;
  modified: string;
  bytes?: number;
};

export type DriveItemsViewProps = {
  items: DriveItemRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
  onOpenFolder: (item: DriveItemRecord & { type: "folder" }) => void;
  onRenameItem: (item: DriveItemRecord) => void;
  onDownloadItem: (item: DriveItemRecord) => void;
  onShareItem: (item: DriveItemRecord) => void;
  onDeleteItem: (item: DriveItemRecord) => void;
  formatBytes: (bytes?: number) => string;
  renderItemIcon: (item: DriveItemRecord) => React.ReactNode;
};
