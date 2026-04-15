import { errorResponse, HttpError } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import { prisma } from "#/lib/db";
import { createFileRoute } from "@tanstack/react-router";

type HandlerArgs = { request: Request; params?: { shareId?: string } };

export const Route = createFileRoute("/api/drive/share/$shareId")({
  server: {
    handlers: {
      DELETE: ({ request, params }: HandlerArgs) => handleDeleteShareLink(request, params?.shareId),
    },
  },
});

async function handleDeleteShareLink(
  request: Request,
  shareIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const shareId = parseShareId(shareIdRaw);

    const shareLink = await prisma.shareLink.findFirst({
      where: {
        id: shareId,
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!shareLink) {
      throw new HttpError(404, "SHARE_LINK_NOT_FOUND", "Share link not found.");
    }

    await prisma.shareLink.delete({
      where: { id: shareLink.id },
    });

    return Response.json({
      deletedShareId: shareLink.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function parseShareId(shareId: string | undefined): string {
  if (!shareId) {
    throw new HttpError(400, "INVALID_SHARE_ID", "Missing shareId.");
  }
  return shareId;
}
