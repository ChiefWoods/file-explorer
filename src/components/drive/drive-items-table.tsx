import { Download, MoreHorizontal, PencilLine, Share2, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import type { DriveItemRecord, DriveItemsViewProps } from "#/components/drive/drive-items.types";

export type DriveTableItem = DriveItemRecord;

type DriveItemsTableProps = DriveItemsViewProps;

export function DriveItemsTable({
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
}: DriveItemsTableProps) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2 text-xs font-semibold tracking-wide text-(--sea-ink-soft) uppercase">
              Name
            </TableHead>
            <TableHead className="w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase">
              Last Modified
            </TableHead>
            <TableHead className="w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase">
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
            return (
              <TableRow
                key={item.id}
                tabIndex={0}
                onClick={() => onToggleSelect(item.id)}
                onDoubleClick={() => {
                  if (item.type === "folder") {
                    onOpenFolder(item as DriveTableItem & { type: "folder" });
                  }
                }}
                data-state={selected ? "selected" : undefined}
                className={cn(
                  "cursor-pointer outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted/70",
                  selected && "bg-muted data-[state=selected]:bg-muted",
                )}
              >
                <TableCell className="px-4 py-3 text-left">
                  <span className="flex items-center gap-2.5 text-sm text-(--sea-ink)">
                    {renderItemIcon(item)}
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft)">
                  {item.modified}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft)">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
