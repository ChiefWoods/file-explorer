/** @vitest-environment jsdom */

import "#/test/dom-test-setup";
import { cleanup, render } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/components/ui/context-menu", () => ({
  ContextMenuItem: ({ children, onClick, disabled, variant }: any) => (
    <button type="button" data-variant={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("#/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({ children, onClick, disabled, variant }: any) => (
    <button type="button" data-variant={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

import { DriveItemActionsMenuContent } from "#/components/drive/drive-item-actions-menu-content";

describe("DriveItemActionsMenuContent", () => {
  const onRenameItem = vi.fn();
  const onDownloadItem = vi.fn();
  const onDownloadSelected = vi.fn();
  const onShareItem = vi.fn();
  const onDeleteItem = vi.fn();
  const onDeleteSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.innerHTML = "";
  });

  it("hides authenticated-only actions for public viewers", () => {
    const view = render(
      <DriveItemActionsMenuContent
        menuType="dropdown"
        item={{ id: "f1", type: "file", name: "Report", modified: "Today", bytes: 10 }}
        isAuthenticated={false}
        deletingItemIds={new Set()}
        onRenameItem={onRenameItem}
        onDownloadItem={onDownloadItem}
        onShareItem={onShareItem}
        onDeleteItem={onDeleteItem}
      />,
    );

    expect(view.queryByText("Rename")).toBeNull();
    expect(view.queryByText("Delete")).toBeNull();
    expect(view.queryByText("Download")).not.toBeNull();
  });

  it("routes selected-item actions to bulk callbacks", async () => {
    const view = render(
      <DriveItemActionsMenuContent
        menuType="context"
        item={{ id: "f1", type: "file", name: "Report", modified: "Today", bytes: 10 }}
        isAuthenticated
        useSelectedItemsActions
        canDownloadSelected
        deletingItemIds={new Set()}
        onRenameItem={onRenameItem}
        onDownloadItem={onDownloadItem}
        onDownloadSelected={onDownloadSelected}
        onShareItem={onShareItem}
        onDeleteItem={onDeleteItem}
        onDeleteSelected={onDeleteSelected}
      />,
    );

    fireEvent.click(view.getByText("Download"));
    fireEvent.click(view.getByText("Delete"));

    expect(onDownloadSelected).toHaveBeenCalledOnce();
    expect(onDeleteSelected).toHaveBeenCalledOnce();
    expect(onDownloadItem).not.toHaveBeenCalled();
    expect(onDeleteItem).not.toHaveBeenCalled();
  });

  it("disables actions based on delete/download state", () => {
    const view = render(
      <DriveItemActionsMenuContent
        menuType="context"
        item={{ id: "f1", type: "file", name: "Report", modified: "Today", bytes: 10 }}
        isAuthenticated
        useSelectedItemsActions
        canDownloadSelected={false}
        isDownloadingSelected
        isDeletingSelected
        deletingItemIds={new Set(["f1"])}
        onRenameItem={onRenameItem}
        onDownloadItem={onDownloadItem}
        onDownloadSelected={onDownloadSelected}
        onShareItem={onShareItem}
        onDeleteItem={onDeleteItem}
        onDeleteSelected={onDeleteSelected}
      />,
    );

    expect(view.getByText("Download").hasAttribute("disabled")).toBe(true);
    expect(view.getByText("Deleting...").hasAttribute("disabled")).toBe(true);
  });
});
