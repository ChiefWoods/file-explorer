/** @vitest-environment jsdom */

import "#/test/dom-test-setup";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryClientMock = {
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  prefetchQuery: vi.fn().mockResolvedValue(undefined),
};

const routerMock = {
  invalidate: vi.fn().mockResolvedValue(undefined),
  navigate: vi.fn().mockResolvedValue(undefined),
};

const toastMock = {
  promise: vi.fn((promise: Promise<unknown>) => promise),
  error: vi.fn(),
};

const downloadMultipleFilesMock = vi.fn().mockResolvedValue(undefined);

const queryState: {
  data: unknown;
  isPending: boolean;
  isError: boolean;
  error: unknown;
} = {
  data: null,
  isPending: false,
  isError: false,
  error: null,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => queryState),
  useQueryClient: vi.fn(() => queryClientMock),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useRouter: vi.fn(() => routerMock),
}));

vi.mock("@tanstack/react-form", () => ({
  useForm: vi.fn(() => ({
    reset: vi.fn(),
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    Field: ({ children }: any) =>
      children({
        state: { value: [], meta: { errors: [] } },
        handleChange: vi.fn(),
        handleBlur: vi.fn(),
      }),
    Subscribe: ({ children }: any) => children([true, false]),
  })),
}));

vi.mock("#/components/drive/drive-action-button", () => ({
  DriveActionButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

let latestItemsViewProps: any = null;

vi.mock("#/components/drive/drive-items-view", () => ({
  DriveItemsView: (props: any) => {
    latestItemsViewProps = props;
    const firstFolder = props.items.find((item: any) => item.type === "folder");
    return (
      <div>
        <button type="button" onClick={() => props.onToggleSelect("file-1")}>
          select-file
        </button>
        <button type="button" onClick={() => props.onToggleSelect("folder-1")}>
          select-folder
        </button>
        <button type="button" onClick={() => props.onShareItem(firstFolder)}>
          share-first-folder
        </button>
        <button type="button" onClick={() => props.onOpenFolder(firstFolder)}>
          open-first-folder
        </button>
      </div>
    );
  },
}));

vi.mock("#/components/drive/drive-shell", () => ({
  DriveShell: ({ actions, topContent, children }: any) => (
    <div>
      <div>{actions}</div>
      <div>{topContent}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("#/components/drive/file-dropzone", () => ({
  FileDropzone: () => <div>dropzone</div>,
}));

vi.mock("#/components/ui/breadcrumb", () => ({
  Breadcrumb: ({ children }: any) => <div>{children}</div>,
  BreadcrumbItem: ({ children }: any) => <div>{children}</div>,
  BreadcrumbList: ({ children }: any) => <div>{children}</div>,
  BreadcrumbPage: ({ children }: any) => <span>{children}</span>,
  BreadcrumbSeparator: () => <span>/</span>,
}));

vi.mock("#/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("#/components/ui/button-group", () => ({
  ButtonGroup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("#/components/ui/calendar", () => ({
  Calendar: () => <div>calendar</div>,
}));

vi.mock("#/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock("#/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));

vi.mock("#/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("#/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("#/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => (
    <span>{typeof children === "function" ? children(null) : children}</span>
  ),
}));

vi.mock("#/lib/drive-download", () => ({
  downloadMultipleFiles: (...args: unknown[]) => downloadMultipleFilesMock(...args),
}));

vi.mock("#/lib/drive-listing", () => ({
  fetchDriveListing: vi.fn(),
}));

vi.mock("#/lib/drive-view-mode", () => ({
  persistDriveViewMode: vi.fn(),
  readDriveViewModeFromStorage: vi.fn(() => "list"),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { DriveFolderPage } from "#/components/drive/drive-folder-page";

function createListing() {
  return {
    folderId: "root-1",
    isOwner: true,
    viewMode: "list" as const,
    breadcrumbs: [{ id: "root-1", name: "Root" }],
    sidebarFolders: [],
    folders: [{ id: "folder-1", name: "Folder One", modifiedAt: "2026-05-01T00:00:00.000Z" }],
    files: [
      {
        id: "file-1",
        name: "File One.txt",
        modifiedAt: "2026-05-01T00:00:00.000Z",
        bytes: 42,
        mimeType: "text/plain",
      },
    ],
    storageUsedBytes: 42,
    storagePct: 0.01,
  };
}

describe("DriveFolderPage interactions", () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = "";
    queryState.data = null;
    queryState.isPending = false;
    queryState.isError = false;
    queryState.error = null;
    queryClientMock.invalidateQueries.mockClear();
    queryClientMock.prefetchQuery.mockClear();
    routerMock.invalidate.mockClear();
    routerMock.navigate.mockClear();
    toastMock.error.mockClear();
    toastMock.promise.mockClear();
    downloadMultipleFilesMock.mockClear();
    latestItemsViewProps = null;
    vi.restoreAllMocks();
  });

  it("supports selecting a file and bulk downloading", async () => {
    queryState.data = createListing();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ downloadUrl: "https://cdn.example/file-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const view = render(
      <DriveFolderPage
        user={null}
        initialData={createListing()}
        currentFolderId="root-1"
        pathSegments={[]}
      />,
    );

    fireEvent.click(view.getByText("select-file"));
    await waitFor(() => {
      expect(view.queryByText("1 selected")).not.toBeNull();
    });

    const downloadButton = await view.findByRole("button", { name: "Download" });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(downloadMultipleFilesMock).toHaveBeenCalledWith([
        { name: "File One.txt", downloadUrl: "https://cdn.example/file-1" },
      ]);
    });
  });

  it("supports bulk delete across selected items", async () => {
    queryState.data = createListing();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const view = render(
      <DriveFolderPage
        user={null}
        initialData={createListing()}
        currentFolderId="root-1"
        pathSegments={[]}
      />,
    );

    fireEvent.click(view.getByText("select-file"));
    fireEvent.click(view.getByText("select-folder"));
    await waitFor(() => {
      expect(view.queryByText("2 selected")).not.toBeNull();
    });

    fireEvent.click(view.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
      expect(fetchMock).toHaveBeenCalledWith("/api/drive/files/file-1", { method: "DELETE" });
      expect(fetchMock).toHaveBeenCalledWith("/api/drive/folders/folder-1", { method: "DELETE" });
    });
  });

  it("does not submit folder creation when folder name is empty", async () => {
    queryState.data = createListing();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "new-folder" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const view = render(
      <DriveFolderPage
        user={{ name: "Test User", email: "test@example.com" }}
        initialData={createListing()}
        currentFolderId="root-1"
        pathSegments={[]}
      />,
    );

    fireEvent.submit(view.getByLabelText("Folder name").closest("form")!);

    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(queryClientMock.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  it("opens folders by prefetching listing and navigating", async () => {
    queryState.data = createListing();

    const view = render(
      <DriveFolderPage
        user={{ name: "Test User", email: "test@example.com" }}
        initialData={createListing()}
        currentFolderId="root-1"
        pathSegments={["root-1"]}
      />,
    );

    fireEvent.click(view.getByText("open-first-folder"));

    await waitFor(() => {
      expect(queryClientMock.prefetchQuery).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith({
        to: "/drive/$",
        params: { _splat: "root-1/folder-1" },
      });
    });
  });

  it("reports share generation API errors", async () => {
    queryState.data = createListing();
    vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/drive/share?folderId=")) {
        return Promise.resolve(
          new Response(JSON.stringify({ links: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url === "/api/drive/share") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Cannot share now." } }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const view = render(
      <DriveFolderPage
        user={{ name: "Test User", email: "test@example.com" }}
        initialData={createListing()}
        currentFolderId="root-1"
        pathSegments={[]}
      />,
    );

    fireEvent.click(view.getByText("share-first-folder"));
    fireEvent.click(view.getByRole("button", { name: "Generate and copy link" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Cannot share now.");
    });
  });
});
