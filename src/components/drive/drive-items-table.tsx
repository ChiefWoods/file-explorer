import { MoreHorizontal } from "lucide-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";

export type DriveTableItem = {
  id: string;
  type: "folder" | "file";
  name: string;
  modified: string;
  bytes?: number;
};

type DriveItemsTableProps = {
  items: DriveTableItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
  formatBytes: (bytes?: number) => string;
  renderItemIcon: (item: DriveTableItem) => React.ReactNode;
};

export function DriveItemsTable({
  items,
  selectedIds,
  onToggleSelect,
  formatBytes,
  renderItemIcon,
}: DriveItemsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Name
            </TableHead>
            <TableHead className="w-[1%] whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Last Modified
            </TableHead>
            <TableHead className="w-[1%] whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Size
            </TableHead>
            <TableHead className="w-[40px] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
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
                data-state={selected ? "selected" : undefined}
                className={cn(
                  "cursor-pointer outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted/70",
                  selected && "bg-muted data-[state=selected]:bg-muted",
                )}
              >
                <TableCell className="px-4 py-3 text-left">
                  <span className="flex items-center gap-2.5 text-sm text-[var(--sea-ink)]">
                    {renderItemIcon(item)}
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--sea-ink-soft)]">
                  {item.modified}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--sea-ink-soft)]">
                  {item.type === "folder" ? "" : formatBytes(item.bytes)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open ${item.name} actions`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
