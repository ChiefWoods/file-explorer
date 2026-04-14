import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { auth } from "#/lib/auth";
import { getSession } from "#/lib/auth.functions";
import { prisma } from "#/lib/db";
import { safeInternalPath } from "#/lib/nav-redirect";

export const Route = createFileRoute("/drive/$")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session?.session) {
      const href = `${location.pathname}${location.searchStr}`;
      throw redirect({
        to: "/sign-in",
        search: { redirect: safeInternalPath(href, "/drive") },
      });
    }
    return {
      user: session.user,
    };
  },
  loader: async ({ params }) => {
    const folderId = getFolderIdFromSplat(params);
    if (!folderId) {
      return null;
    }

    const access = await resolveDrivePathAccess({ data: { folderId } });
    if (!access) {
      throw redirect({ to: "/drive" });
    }

    return access;
  },
  component: DriveAbsoluteFolderRoutePage,
});

const resolveDrivePathAccess = createServerFn({ method: "GET" })
  .inputValidator(z.object({ folderId: z.string().trim().min(1) }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session?.user?.id) {
      return null;
    }

    const folder = await prisma.folder.findUnique({
      where: { id: data.folderId },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    if (!folder) {
      return null;
    }

    const isOwner = folder.userId === session.user.id;
    if (!isOwner) {
      const hasActiveShare = await prisma.shareLink.findFirst({
        where: {
          folderId: folder.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });

      if (!hasActiveShare) {
        return null;
      }
    }

    return {
      folderId: folder.id,
      folderName: folder.name,
      isOwner,
    };
  });

function DriveAbsoluteFolderRoutePage() {
  // Temporary placeholder until nested /drive folder rendering is implemented.
  const data = Route.useLoaderData();
  if (!data) {
    return null;
  }
  const { folderId, folderName, isOwner } = data;

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6">
        <h1 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">{folderName}</h1>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Access granted for folder path{" "}
          <code className="rounded bg-muted px-1 py-0.5">/drive/.../{folderId}</code>.
        </p>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          {isOwner
            ? "You are the owner of this folder path."
            : "You are viewing this folder path through an active share link."}
        </p>
        <div className="mt-4">
          <Link to="/drive" className="text-sm font-medium text-[var(--primary)] hover:underline">
            Back to My Drive
          </Link>
        </div>
      </div>
    </main>
  );
}

function getFolderIdFromSplat(params: Record<string, unknown>): string | null {
  const raw =
    (typeof params._splat === "string" && params._splat) ||
    (typeof params["*"] === "string" && params["*"]) ||
    "";

  if (!raw) {
    return null;
  }

  const segments = raw.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  return segments[segments.length - 1];
}
