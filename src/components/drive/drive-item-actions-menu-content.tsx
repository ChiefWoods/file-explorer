import type { DriveItemRecord } from "#/components/drive/drive-items.types";

import { ContextMenuItem } from "#/components/ui/context-menu";
import { DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { Download, PencilLine, Share2, Trash2 } from "lucide-react";

type DriveItemActionsMenuContentProps = {
  menuType: "dropdown" | "context";
  item: DriveItemRecord;
  isAuthenticated: boolean;
  canDownloadSelected?: boolean;
  isDownloadingSelected?: boolean;
  isDeletingSelected?: boolean;
  useSelectedItemsActions?: boolean;
  deletingItemIds: Set<string>;
  disableRename?: boolean;
  onRenameItem: (item: DriveItemRecord) => void;
  onDownloadItem: (item: DriveItemRecord) => void;
  onDownloadSelected?: () => void;
  onShareItem: (item: DriveItemRecord) => void;
  onDeleteItem: (item: DriveItemRecord) => void;
  onDeleteSelected?: () => void;
};

export function DriveItemActionsMenuContent({
  menuType,
  item,
  isAuthenticated,
  canDownloadSelected = false,
  isDownloadingSelected = false,
  isDeletingSelected = false,
  useSelectedItemsActions = false,
  deletingItemIds,
  disableRename = false,
  onRenameItem,
  onDownloadItem,
  onDownloadSelected,
  onShareItem,
  onDeleteItem,
  onDeleteSelected,
}: DriveItemActionsMenuContentProps) {
  const MenuItem = menuType === "context" ? ContextMenuItem : DropdownMenuItem;
  const deleteDisabled = useSelectedItemsActions
    ? isDeletingSelected
    : deletingItemIds.has(item.id);
  const downloadDisabled = useSelectedItemsActions
    ? isDownloadingSelected || !canDownloadSelected
    : false;

  return (
    <>
      {isAuthenticated && (
        <MenuItem
          disabled={disableRename}
          onClick={(event) => {
            event.stopPropagation();
            onRenameItem(item);
          }}
        >
          <PencilLine />
          Rename
        </MenuItem>
      )}
      {item.type === "file" && (
        <MenuItem
          disabled={downloadDisabled}
          onClick={(event) => {
            event.stopPropagation();
            if (useSelectedItemsActions) {
              onDownloadSelected?.();
              return;
            }
            onDownloadItem(item);
          }}
        >
          <Download />
          Download
        </MenuItem>
      )}
      {isAuthenticated && item.type === "folder" && (
        <MenuItem
          onClick={(event) => {
            event.stopPropagation();
            onShareItem(item);
          }}
        >
          <Share2 />
          Share
        </MenuItem>
      )}
      {isAuthenticated && item.type === "folder" && (
        <MenuItem
          disabled={downloadDisabled}
          onClick={(event) => {
            event.stopPropagation();
            if (useSelectedItemsActions) {
              onDownloadSelected?.();
              return;
            }
            onDownloadItem(item);
          }}
        >
          <Download />
          Download
        </MenuItem>
      )}
      {isAuthenticated && (
        <MenuItem
          variant="destructive"
          disabled={deleteDisabled}
          onClick={(event) => {
            event.stopPropagation();
            if (useSelectedItemsActions) {
              onDeleteSelected?.();
              return;
            }
            onDeleteItem(item);
          }}
        >
          <Trash2 />
          {useSelectedItemsActions
            ? isDeletingSelected
              ? "Deleting..."
              : "Delete"
            : deletingItemIds.has(item.id)
              ? "Deleting..."
              : "Delete"}
        </MenuItem>
      )}
    </>
  );
}
