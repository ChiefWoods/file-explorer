import { FolderOpen } from "lucide-react";

import { DriveEmptyState } from "#/components/drive/drive-empty-state";
import { DriveItemsGrid } from "#/components/drive/drive-items-grid";
import { DriveItemsTable } from "#/components/drive/drive-items-table";
import { ErrorPage } from "#/components/shared/error-page";
import type { DriveItemsViewProps } from "#/components/drive/drive-items.types";

type DriveItemsStateViewProps = DriveItemsViewProps & {
  viewMode: "list" | "grid";
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  pendingTitle: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function DriveItemsView({
  viewMode,
  isPending,
  isError,
  errorMessage,
  pendingTitle,
  emptyTitle,
  emptyDescription,
  ...itemsProps
}: DriveItemsStateViewProps) {
  if (isPending) {
    return <DriveEmptyState icon={FolderOpen} title={pendingTitle} description="" />;
  }

  if (isError) {
    return (
      <ErrorPage
        compact
        title="Could not load drive"
        description={errorMessage ?? "Something went wrong while loading your files."}
      />
    );
  }

  if (itemsProps.items.length === 0) {
    return <DriveEmptyState icon={FolderOpen} title={emptyTitle} description={emptyDescription} />;
  }

  if (viewMode === "list") {
    return <DriveItemsTable {...itemsProps} />;
  }

  return <DriveItemsGrid {...itemsProps} />;
}
