import type { DriveItemRecord, DriveItemsViewProps } from "#/components/drive/drive-items.types";

import { DriveItemActionsMenuContent } from "#/components/drive/drive-item-actions-menu-content";
import { Button } from "#/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "#/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { formatBytes } from "#/lib/utils";
import { cn } from "#/lib/utils";
import { MoreHorizontal } from "lucide-react";

type DriveTableItem = DriveItemRecord;

type DriveItemsTableProps = DriveItemsViewProps;

export function DriveItemsTable({
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
}: DriveItemsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2 text-xs font-semibold tracking-wide text-(--sea-ink-soft) uppercase">
              Name
            </TableHead>
            <TableHead className="hidden w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase sm:table-cell">
              Last Modified
            </TableHead>
            <TableHead className="hidden w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase sm:table-cell">
              Size
            </TableHead>
            <TableHead className="w-[40px] px-4 py-2 text-xs font-semibold tracking-wide text-(--sea-ink-soft) uppercase">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const selected = selectedIds.has(item.id);
            const useSelectedItemsActions = selected && selectedIds.size > 1;
            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      tabIndex={0}
                      onClick={() => onToggleSelect(item.id)}
                      onContextMenu={() => onContextMenuSelect(item.id)}
                      onDoubleClick={() => {
                        if (item.type === "folder") {
                          onOpenFolder(item as DriveTableItem & { type: "folder" });
                        }
                      }}
                      data-state={selected ? "selected" : undefined}
                      className={cn(
                        "cursor-pointer transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted/70",
                        selected && "bg-muted data-[state=selected]:bg-muted",
                      )}
                    />
                  }
                >
                  <TableCell className="px-4 py-3 text-left">
                    <div className="min-w-0">
                      <span className="flex items-center gap-2.5 text-sm text-(--sea-ink)">
                        {renderItemIcon(item)}
                        <span className="truncate">{item.name}</span>
                      </span>
                      <p className="mt-1 text-xs text-(--sea-ink-soft) sm:hidden">
                        {item.modified}
                        {item.type === "file" ? ` · ${formatBytes(item.bytes)}` : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft) sm:table-cell">
                    {item.modified}
                  </TableCell>
                  <TableCell className="hidden px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft) sm:table-cell">
                    {item.type === "folder" ? "" : formatBytes(item.bytes)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
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
                  </TableCell>
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
        </TableBody>
      </Table>
    </div>
  );
}
