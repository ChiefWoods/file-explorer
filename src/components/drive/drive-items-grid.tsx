import type { DriveItemRecord, DriveItemsViewProps } from "#/components/drive/drive-items.types";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { formatBytes } from "#/lib/utils";
import { Download, MoreHorizontal, PencilLine, Share2, Trash2 } from "lucide-react";

type DriveItemsGridProps = DriveItemsViewProps;

export function DriveItemsGrid({
  isAuthenticated,
  items,
  selectedIds,
  onToggleSelect,
  onOpenFolder,
  onRenameItem,
  onDownloadItem,
  onShareItem,
  onDeleteItem,
  renderItemIcon,
}: DriveItemsGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      {items.map((item) => {
        const selected = selectedIds.has(item.id);
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggleSelect(item.id)}
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
                  {isAuthenticated && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onRenameItem(item);
                      }}
                    >
                      <PencilLine />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {item.type === "file" && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onDownloadItem(item);
                      }}
                    >
                      <Download />
                      Download
                    </DropdownMenuItem>
                  )}
                  {isAuthenticated && item.type === "folder" && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onShareItem(item);
                      }}
                    >
                      <Share2 />
                      Share
                    </DropdownMenuItem>
                  )}
                  {isAuthenticated && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteItem(item);
                      }}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="mt-auto pt-2 text-xs text-(--sea-ink-soft)">
              {item.modified} · {item.type === "folder" ? "Folder" : formatBytes(item.bytes)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
