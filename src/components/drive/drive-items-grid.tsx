import type { DriveItemRecord, DriveItemsViewProps } from "#/components/drive/drive-items.types";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Download, MoreHorizontal, PencilLine, Share2, Trash2 } from "lucide-react";

type DriveItemsGridProps = DriveItemsViewProps;

export function DriveItemsGrid({
  items,
  selectedIds,
  onToggleSelect,
  onOpenFolder,
  onRenameItem,
  onDownloadItem,
  onShareItem,
  onDeleteItem,
  formatBytes,
  renderItemIcon,
}: DriveItemsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
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
            className={`rounded-xl border p-4 text-left transition ${
              selected
                ? "border-primary bg-(--surface)"
                : "border-border bg-card hover:bg-(--surface)/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-(--sea-ink)">
                {renderItemIcon(item)}
                <p className="m-0 text-sm font-semibold">{item.name}</p>
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
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onRenameItem(item);
                    }}
                  >
                    <PencilLine />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onDownloadItem(item);
                    }}
                  >
                    <Download />
                    Download
                  </DropdownMenuItem>
                  {item.type === "folder" && (
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
                  {item.type === "file" && (
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
            <p className="mt-2 text-xs text-(--sea-ink-soft)">
              {item.modified} · {item.type === "folder" ? "Folder" : formatBytes(item.bytes)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
