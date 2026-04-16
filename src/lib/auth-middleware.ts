import { auth } from "#/lib/auth";
import { safeInternalPath } from "#/lib/nav-redirect";
import { createMiddleware } from "@tanstack/react-start";

type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type AuthContext = {
  isAuthenticated: boolean;
  session: SessionResult["session"] | null;
  user: SessionResult["user"] | null;
};

function toRedirectResponse(origin: string, path: string) {
  return Response.redirect(new URL(path, origin), 307);
}

export const authRequestMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, pathname, request }) => {
    const headers = new Headers(request.headers);
    const url = new URL(request.url);
    const sessionResult = await auth.api.getSession({ headers });
    const authContext: AuthContext = {
      isAuthenticated: Boolean(sessionResult?.session),
      session: sessionResult?.session ?? null,
      user: sessionResult?.user ?? null,
    };

    if (pathname.startsWith("/api/")) {
      return next({ context: authContext });
    }

    if (pathname === "/") {
      return toRedirectResponse(url.origin, authContext.isAuthenticated ? "/drive" : "/sign-in");
    }

    if (
      (pathname.startsWith("/drive") || pathname.startsWith("/shared")) &&
      !authContext.isAuthenticated
    ) {
      const target = safeInternalPath(`${pathname}${url.search}`, "/drive");
      const signInUrl = new URL("/sign-in", url.origin);
      signInUrl.searchParams.set("redirect", target);
      return Response.redirect(signInUrl, 307);
    }

    if (pathname === "/sign-in" && authContext.isAuthenticated) {
      const target = safeInternalPath(url.searchParams.get("redirect") ?? undefined, "/drive");
      return toRedirectResponse(url.origin, target);
    }

    return next({ context: authContext });
  },
);
