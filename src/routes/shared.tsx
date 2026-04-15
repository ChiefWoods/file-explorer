import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Copy, CopyCheck, Share2, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DriveEmptyState } from "#/components/drive/drive-empty-state";
import { DriveShell } from "#/components/drive/drive-shell";
import { ErrorPage } from "#/components/shared/error-page";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";
import { auth } from "#/lib/auth";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { getFolderIdPath } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { safeInternalPath } from "#/lib/nav-redirect";
import { queryKeys } from "#/lib/query-keys";
import { Button } from "#/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";

type SharedLoaderData = {
  storageUsed: number;
  links: Array<{
    id: string;
    folderId: string;
    folderName: string;
    createdAt: string;
    expiresAt: string | null;
    url: string;
  }>;
};

const getSharedLoaderData = createServerFn({ method: "GET" }).handler(
  async (): Promise<SharedLoaderData> => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error("Authentication required.");
    }

    const aggregate = await prisma.file.aggregate({
      where: { userId: session.user.id },
      _sum: { bytes: true },
    });
    const links = await prisma.shareLink.findMany({
      where: {
        createdByUserId: session.user.id,
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        folderId: true,
        createdAt: true,
        expiresAt: true,
        folder: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      storageUsed: aggregate._sum.bytes ?? 0,
      links: await Promise.all(
        links.map(async (link) => {
          const folderPathIds = await getFolderIdPath(session.user.id, link.folderId);
          return {
            id: link.id,
            folderId: link.folderId,
            folderName: link.folder.name,
            createdAt: link.createdAt.toISOString(),
            expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
            url: `${new URL(headers.get("origin") ?? "http://localhost:3000").origin}/drive/${folderPathIds.join("/")}`,
          };
        }),
      ),
    };
  },
);

const sharedLoaderQueryOptions = queryOptions({
  queryKey: queryKeys.share.links(null),
  queryFn: () => getSharedLoaderData(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/shared")({
  head: () => ({
    meta: [{ title: "Shared - File Uploader" }],
  }),
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session?.session) {
      const href = `${location.pathname}${location.searchStr}`;
      throw redirect({
        to: "/sign-in",
        search: { redirect: safeInternalPath(href, "/shared") },
      });
    }
    return {
      user: session.user,
      session: session.session,
    };
  },
  loader: async () => {
    return getSharedLoaderData();
  },
  component: SharedPage,
});

function SharedPage() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [deletingShareIds, setDeletingShareIds] = useState<Set<string>>(new Set());
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialData = Route.useLoaderData();
  const query = useQuery({
    ...sharedLoaderQueryOptions,
    initialData,
  });

  const data = query.data ?? initialData;
  const storageUsed = useMemo(() => data.storageUsed, [data]);
  const storagePct = Math.min(100, (storageUsed / USER_STORAGE_LIMIT_BYTES) * 100);
  const links = data.links;

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(error.message ?? "Could not sign out.");
        return;
      }

      await router.invalidate();
      await router.navigate({ to: "/sign-in", search: { redirect: undefined }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function deleteShareLink(shareId: string) {
    if (deletingShareIds.has(shareId)) {
      return;
    }

    setDeletingShareIds((prev) => new Set(prev).add(shareId));
    try {
      const response = await fetch(`/api/drive/share/${shareId}`, {
        method: "DELETE",
      });
      const json = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Could not delete share link.");
      }

      await query.refetch();
      toast.success("Share link deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete share link.");
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
    } catch {}
  }

  return (
    <DriveShell
      user={user}
      storageUsed={storageUsed}
      storagePct={storagePct}
      isSigningOut={isSigningOut}
      onSignOut={() => void signOut()}
      title="Shared"
    >
      {query.isPending && !query.data ? (
        <DriveEmptyState icon={Share2} title="Loading shared links..." description="" />
      ) : query.isError ? (
        <ErrorPage
          compact
          title="Could not load shared links"
          description={
            query.error instanceof Error
              ? query.error.message
              : "Something went wrong while loading shared links."
          }
        />
      ) : links.length === 0 ? (
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
                <TableHead className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Folder
                </TableHead>
                <TableHead className="w-[1%] whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Created
                </TableHead>
                <TableHead className="w-[1%] whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Expires
                </TableHead>
                <TableHead className="w-[240px] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Link
                </TableHead>
                <TableHead className="w-[1%] whitespace-nowrap px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id} className="hover:!bg-[var(--surface)]/60">
                  <TableCell className="px-4 py-3 text-left text-sm text-[var(--sea-ink)]">
                    {link.folderName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--sea-ink-soft)]">
                    {new Date(link.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--sea-ink-soft)]">
                    {link.expiresAt
                      ? new Date(link.expiresAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="truncate text-sm text-[var(--sea-ink-soft)]">{link.url}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-right">
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
