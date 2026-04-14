import { MoreHorizontal } from "lucide-react";

import { Button } from "#/components/ui/button";
import type { DriveTableItem } from "#/components/drive/drive-items-table";

type DriveItemsGridProps = {
  items: DriveTableItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
  formatBytes: (bytes?: number) => string;
  renderItemIcon: (item: DriveTableItem) => React.ReactNode;
};

export function DriveItemsGrid({
  items,
  selectedIds,
  onToggleSelect,
  formatBytes,
  renderItemIcon,
}: DriveItemsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {items.map((item) => {
        const selected = selectedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleSelect(item.id)}
            className={`rounded-xl border p-4 text-left transition ${
              selected
                ? "border-[var(--primary)] bg-[var(--surface)]"
                : "border-border bg-card hover:bg-[var(--surface)]/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-[var(--sea-ink)]">
                {renderItemIcon(item)}
                <p className="m-0 text-sm font-semibold">{item.name}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Open ${item.name} actions`}
              >
                <MoreHorizontal />
              </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              {item.modified} · {item.type === "folder" ? "Folder" : formatBytes(item.bytes)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
