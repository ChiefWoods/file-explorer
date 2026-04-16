import type { DriveItemsViewProps } from "#/components/drive/drive-items.types";

import { DriveEmptyState } from "#/components/drive/drive-empty-state";
import { DriveItemsGrid } from "#/components/drive/drive-items-grid";
import { DriveItemsTable } from "#/components/drive/drive-items-table";
import { ErrorPage } from "#/components/shared/error-page";
import { FolderOpen } from "lucide-react";

type DriveItemsStateViewProps = DriveItemsViewProps & {
  viewMode: "list" | "grid";
  isPending: boolean;
  isError: boolean;
  errorCode?: number;
  errorMessage?: string;
  pendingTitle: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function DriveItemsView({
  viewMode,
  isPending,
  isError,
  errorCode,
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
    const errorTitle =
      errorCode === 401 ? "Unauthorized" : errorCode === 403 ? "Forbidden" : "Could not load drive";
    return (
      <ErrorPage
        compact
        code={errorCode}
        title={errorTitle}
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
