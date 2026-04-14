import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, parseJsonBody } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import { requireOwnedFolder } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { createShareLinkInputSchema, isShareExpired, resolveShareExpiry } from "#/lib/share-link";

type HandlerArgs = { request: Request };

const listShareSearchSchema = z.object({
  folderId: z.string().trim().min(1).optional(),
  includeExpired: z.enum(["true", "false"]).optional(),
});

export const Route = createFileRoute("/api/drive/share")({
  server: {
    handlers: {
      GET: ({ request }: HandlerArgs) => handleListShares(request),
      POST: ({ request }: HandlerArgs) => handleCreateShareLink(request),
    },
  },
});

async function handleListShares(request: Request): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const url = new URL(request.url);
    const search = listShareSearchSchema.parse({
      folderId: url.searchParams.get("folderId") ?? undefined,
      includeExpired: url.searchParams.get("includeExpired") ?? undefined,
    });

    if (search.folderId) {
      await requireOwnedFolder(session.user.id, search.folderId);
    }

    const includeExpired = search.includeExpired === "true";
    const links = await prisma.shareLink.findMany({
      where: {
        createdByUserId: session.user.id,
        ...(search.folderId ? { folderId: search.folderId } : {}),
        ...(!includeExpired
          ? {
              OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        folderId: true,
        expiresAt: true,
        createdAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return Response.json({
      links: links.map((link) => ({
        ...link,
        isExpired: isShareExpired(link.expiresAt),
        url: buildPublicShareUrl(request, link.folderId),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleCreateShareLink(request: Request): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const body = await parseJsonBody(request, createShareLinkInputSchema);
    await requireOwnedFolder(session.user.id, body.folderId);

    const expiresAt = resolveShareExpiry({
      duration: body.duration,
      expiresAt: body.expiresAt,
    });

    const deterministicToken = `folder:${body.folderId}`;
    const link = await prisma.shareLink.upsert({
      where: { token: deterministicToken },
      create: {
        token: deterministicToken,
        folderId: body.folderId,
        createdByUserId: session.user.id,
        expiresAt,
      },
      update: {
        expiresAt,
      },
      select: {
        id: true,
        folderId: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        ...link,
        url: buildPublicShareUrl(request, link.folderId),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function buildPublicShareUrl(request: Request, folderId: string): string {
  const url = new URL(request.url);
  return `${url.origin}/drive?folderId=${folderId}`;
}
