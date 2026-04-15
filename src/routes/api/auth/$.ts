import { auth } from "#/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

async function handleAuth(request: Request) {
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleAuth(request),
      POST: ({ request }: { request: Request }) => handleAuth(request),
      PATCH: ({ request }: { request: Request }) => handleAuth(request),
      PUT: ({ request }: { request: Request }) => handleAuth(request),
      DELETE: ({ request }: { request: Request }) => handleAuth(request),
    },
  },
});
