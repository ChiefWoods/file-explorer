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
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-3">
      {items.map((item) => {
        const selected = selectedIds.has(item.id);
        const useSelectedItemsActions = selected && selectedIds.size > 1;
        return (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger
              render={
                <button
                  type="button"
                  onClick={() => onToggleSelect(item.id)}
                  onContextMenu={() => onContextMenuSelect(item.id)}
                  onDoubleClick={() => {
                    if (item.type === "folder") {
                      onOpenFolder(item as DriveItemRecord & { type: "folder" });
                    }
                  }}
                  className={`flex min-h-[96px] flex-col rounded-xl border p-3 text-left transition sm:min-h-[112px] sm:p-4 ${
                    selected
                      ? "border-primary bg-(--surface)"
                      : "border-border bg-card hover:bg-(--surface)/60"
                  }`}
                />
              }
            >
              <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                <div className="flex min-w-0 items-start gap-1.5 text-(--sea-ink) sm:gap-2">
                  <span className="mt-0.5 shrink-0 self-start">{renderItemIcon(item)}</span>
                  <p className="m-0 min-w-0 text-sm leading-snug font-semibold">{item.name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="sm:size-8"
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
              <p className="mt-auto pt-1.5 text-xs text-(--sea-ink-soft) sm:pt-2">
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
