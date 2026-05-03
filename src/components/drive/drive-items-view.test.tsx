/** @vitest-environment jsdom */

import type { DriveItemsViewProps } from "#/components/drive/drive-items.types";

import "#/test/dom-test-setup";
import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/components/drive/drive-empty-state", () => ({
  DriveEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("#/components/drive/drive-items-grid", () => ({
  DriveItemsGrid: ({ items }: DriveItemsViewProps) => <div>grid:{items.length}</div>,
}));

vi.mock("#/components/drive/drive-items-table", () => ({
  DriveItemsTable: ({ items }: DriveItemsViewProps) => <div>list:{items.length}</div>,
}));

vi.mock("#/components/shared/error-page", () => ({
  ErrorPage: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
}));

import { DriveItemsView } from "#/components/drive/drive-items-view";

const baseProps: DriveItemsViewProps = {
  isAuthenticated: true,
  items: [
    {
      id: "folder-1",
      type: "folder",
      name: "Folder",
      modified: "Today",
    },
  ],
  selectedIds: new Set<string>(),
  canDownloadSelected: false,
  isDownloadingSelected: false,
  isDeletingSelected: false,
  onToggleSelect: vi.fn(),
  onContextMenuSelect: vi.fn(),
  onOpenFolder: vi.fn(),
  onRenameItem: vi.fn(),
  onDownloadItem: vi.fn(),
  onDownloadSelected: vi.fn(),
  onShareItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onDeleteSelected: vi.fn(),
  deletingItemIds: new Set<string>(),
  renderItemIcon: () => <span>icon</span>,
};

describe("DriveItemsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders pending state", () => {
    const view = render(
      <DriveItemsView
        {...baseProps}
        viewMode="list"
        isPending
        isError={false}
        pendingTitle="Loading folder..."
        emptyTitle="Empty"
        emptyDescription="No files"
      />,
    );

    expect(view.queryByText("Loading folder...")).not.toBeNull();
  });

  it("renders contextual error titles", () => {
    const view = render(
      <DriveItemsView
        {...baseProps}
        viewMode="list"
        isPending={false}
        isError
        errorCode={401}
        errorMessage="auth error"
        pendingTitle="Loading folder..."
        emptyTitle="Empty"
        emptyDescription="No files"
      />,
    );

    expect(view.queryByText("Unauthorized")).not.toBeNull();
    expect(view.queryByText("auth error")).not.toBeNull();

    view.rerender(
      <DriveItemsView
        {...baseProps}
        viewMode="list"
        isPending={false}
        isError
        errorCode={403}
        errorMessage="forbidden error"
        pendingTitle="Loading folder..."
        emptyTitle="Empty"
        emptyDescription="No files"
      />,
    );
    expect(view.queryByText("Forbidden")).not.toBeNull();
  });

  it("renders empty state when no items", () => {
    const view = render(
      <DriveItemsView
        {...baseProps}
        items={[]}
        viewMode="list"
        isPending={false}
        isError={false}
        pendingTitle="Loading folder..."
        emptyTitle="This folder is empty"
        emptyDescription="Upload files to get started."
      />,
    );

    expect(view.queryByText("This folder is empty")).not.toBeNull();
  });

  it("switches between list and grid views", () => {
    const view = render(
      <DriveItemsView
        {...baseProps}
        viewMode="list"
        isPending={false}
        isError={false}
        pendingTitle="Loading folder..."
        emptyTitle="Empty"
        emptyDescription="No files"
      />,
    );
    expect(view.queryByText("list:1")).not.toBeNull();

    view.rerender(
      <DriveItemsView
        {...baseProps}
        viewMode="grid"
        isPending={false}
        isError={false}
        pendingTitle="Loading folder..."
        emptyTitle="Empty"
        emptyDescription="No files"
      />,
    );
    expect(view.queryByText("grid:1")).not.toBeNull();
  });
});
