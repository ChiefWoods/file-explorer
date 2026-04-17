import { DriveEmptyState } from "#/components/drive/drive-empty-state";
import { DriveShell } from "#/components/drive/drive-shell";
import { Button } from "#/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { prisma } from "#/lib/db";
import { getFolderIdPath } from "#/lib/drive-repository";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Copy, CopyCheck, Share2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type SharedLink = {
  id: string;
  folderId: string;
  folderName: string;
  createdAt: string;
  expiresAt: string | null;
  url: string;
};

const getSharedLinks = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }): Promise<SharedLink[]> => {
    const links = await prisma.shareLink.findMany({
      where: {
        createdByUserId: data.userId,
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        folderId: true,
        createdAt: true,
        expiresAt: true,
        folder: { select: { name: true } },
      },
    });

    return Promise.all(
      links.map(async (link) => {
        const folderPathIds = await getFolderIdPath(data.userId, link.folderId);
        return {
          id: link.id,
          folderId: link.folderId,
          folderName: link.folder.name,
          createdAt: link.createdAt.toISOString(),
          expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
          url: `${process.env.VITE_BASE_URL!}/drive/${folderPathIds.join("/")}`,
        };
      }),
    );
  });

export const Route = createFileRoute("/drive/_layout/shared")({
  head: () => ({
    meta: [{ title: "Shared - File Uploader" }],
  }),
  beforeLoad: ({ context }) => {
    if (!context.user || !context.session) {
      throw new Error("Authentication required.");
    }
    return { user: context.user, session: context.session };
  },
  loader: ({ context }) => getSharedLinks({ data: { userId: context.user.id } }),
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const links = Route.useLoaderData();
  const [deletingShareIds, setDeletingShareIds] = useState<Set<string>>(new Set());
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function deleteShareLink(shareId: string) {
    if (deletingShareIds.has(shareId)) {
      return;
    }

    setDeletingShareIds((prev) => new Set(prev).add(shareId));
    try {
      const deletePromise = (async () => {
        const response = await fetch(`/api/drive/share/${shareId}`, {
          method: "DELETE",
        });
        const json = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;

        if (!response.ok) {
          throw new Error(json?.error?.message ?? "Could not delete share link.");
        }

        await router.invalidate();
      })();

      toast.promise(deletePromise, {
        loading: "Deleting share link...",
        success: "Share link deleted.",
        error: (error) => (error instanceof Error ? error.message : "Could not delete share link."),
      });

      await deletePromise;
    } finally {
      setDeletingShareIds((prev) => {
        const next = new Set(prev);
        next.delete(shareId);
        return next;
      });
    }
  }

  async function copyShareLink(shareId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareId(shareId);
      if (copiedResetTimer.current) {
        clearTimeout(copiedResetTimer.current);
      }
      copiedResetTimer.current = setTimeout(() => {
        setCopiedShareId(null);
      }, 1200);
    } catch {
      throw new Error("Unable to copy share link to clipboard.");
    }
  }

  return (
    <DriveShell title="Shared">
      {links.length === 0 ? (
        <DriveEmptyState
          icon={Share2}
          title="No shared links yet"
          description="Create a share link from a folder menu and it will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-2 text-xs font-semibold tracking-wide text-(--sea-ink-soft) uppercase">
                  Folder
                </TableHead>
                <TableHead className="w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase">
                  Created
                </TableHead>
                <TableHead className="w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase">
                  Expires
                </TableHead>
                <TableHead className="w-[240px] px-4 py-2 text-xs font-semibold tracking-wide text-(--sea-ink-soft) uppercase">
                  Link
                </TableHead>
                <TableHead className="w-[1%] px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-(--sea-ink-soft) uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id} className="hover:bg-(--surface)/60!">
                  <TableCell className="px-4 py-3 text-left text-sm text-(--sea-ink)">
                    {link.folderName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft)">
                    {new Date(link.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm whitespace-nowrap text-(--sea-ink-soft)">
                    {link.expiresAt
                      ? new Date(link.expiresAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="truncate text-sm text-(--sea-ink-soft)">{link.url}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Copy share link"
                        onClick={() => void copyShareLink(link.id, link.url)}
                      >
                        {copiedShareId === link.id ? (
                          <CopyCheck className="rounded-[4px] text-emerald-600" />
                        ) : (
                          <Copy />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete share link"
                        disabled={deletingShareIds.has(link.id)}
                        onClick={() => void deleteShareLink(link.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DriveShell>
  );
}
