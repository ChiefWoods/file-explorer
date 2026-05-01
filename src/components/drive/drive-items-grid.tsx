import type { DriveItemRecord, DriveItemsViewProps } from "#/components/drive/drive-items.types";

import { DriveItemActionsMenuContent } from "#/components/drive/drive-item-actions-menu-content";
import { Button } from "#/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "#/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { formatBytes } from "#/lib/utils";
import { MoreHorizontal } from "lucide-react";

type DriveItemsGridProps = DriveItemsViewProps;

export function DriveItemsGrid({
  isAuthenticated,
  items,
  selectedIds,
  canDownloadSelected,
  isDownloadingSelected,
  isDeletingSelected,
  onToggleSelect,
  onContextMenuSelect,
  onOpenFolder,
  onRenameItem,
  onDownloadItem,
  onDownloadSelected,
  onShareItem,
  onDeleteItem,
  onDeleteSelected,
  deletingItemIds,
  renderItemIcon,
}: DriveItemsGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      {items.map((item) => {
        const selected = selectedIds.has(item.id);
        const useSelectedItemsActions = selected && selectedIds.size > 1;
        return (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger
              render={
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleSelect(item.id)}
                  onContextMenu={() => onContextMenuSelect(item.id)}
                  onDoubleClick={() => {
                    if (item.type === "folder") {
                      onOpenFolder(item as DriveItemRecord & { type: "folder" });
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleSelect(item.id);
                    }
                  }}
                  className={`flex min-h-[112px] flex-col rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary bg-(--surface)"
                      : "border-border bg-card hover:bg-(--surface)/60"
                  }`}
                />
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2 text-(--sea-ink)">
                  <span className="mt-0.5 shrink-0 self-start">{renderItemIcon(item)}</span>
                  <p className="m-0 min-w-0 text-sm font-semibold">{item.name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Open ${item.name} actions`}
                        onClick={(event) => event.stopPropagation()}
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-36">
                    <DriveItemActionsMenuContent
                      menuType="dropdown"
                      item={item}
                      isAuthenticated={isAuthenticated}
                      deletingItemIds={deletingItemIds}
                      canDownloadSelected={canDownloadSelected}
                      isDownloadingSelected={isDownloadingSelected}
                      isDeletingSelected={isDeletingSelected}
                      onRenameItem={onRenameItem}
                      onDownloadItem={onDownloadItem}
                      onDownloadSelected={onDownloadSelected}
                      onShareItem={onShareItem}
                      onDeleteItem={onDeleteItem}
                      onDeleteSelected={onDeleteSelected}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-auto pt-2 text-xs text-(--sea-ink-soft)">
                {item.modified} · {item.type === "folder" ? "Folder" : formatBytes(item.bytes)}
              </p>
            </ContextMenuTrigger>
            <ContextMenuContent align="end" className="min-w-36">
              <DriveItemActionsMenuContent
                menuType="context"
                item={item}
                isAuthenticated={isAuthenticated}
                deletingItemIds={deletingItemIds}
                disableRename={selectedIds.size > 1}
                canDownloadSelected={canDownloadSelected}
                isDownloadingSelected={isDownloadingSelected}
                isDeletingSelected={isDeletingSelected}
                useSelectedItemsActions={useSelectedItemsActions}
                onRenameItem={onRenameItem}
                onDownloadItem={onDownloadItem}
                onDownloadSelected={onDownloadSelected}
                onShareItem={onShareItem}
                onDeleteItem={onDeleteItem}
                onDeleteSelected={onDeleteSelected}
              />
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
