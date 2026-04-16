import { auth } from "#/lib/auth";
import { safeInternalPath } from "#/lib/nav-redirect";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type AuthContext = {
  session: SessionResult["session"] | null;
  user: SessionResult["user"] | null;
};

export const authRequestMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next, pathname, request }) => {
  const headers = new Headers(request.headers);
  const url = new URL(request.url);
  const sessionResult = await auth.api.getSession({ headers });
  const authContext: AuthContext = {
    session: sessionResult?.session ?? null,
    user: sessionResult?.user ?? null,
  };

  if (pathname.startsWith("/api/")) {
    return next({ context: authContext });
  }

  if (pathname === "/") {
    throw redirect({
      to: authContext.session ? "/drive" : "/sign-in",
      replace: true,
    });
  }

  const isDriveRoot = pathname === "/drive" || pathname === "/drive/";
  const isDriveNested = pathname.startsWith("/drive/");
  const isSharedRoute = pathname.startsWith("/shared");

  if ((isDriveRoot || isSharedRoute) && !authContext.session) {
    const target = safeInternalPath(`${pathname}${url.search}`, "/drive");
    throw redirect({
      to: "/sign-in",
      search: { redirect: target },
      replace: true,
    });
  }

  if (isDriveNested && !authContext.session) {
    return next({ context: authContext });
  }

  if (pathname === "/sign-in" && authContext.session) {
    const target = safeInternalPath(url.searchParams.get("redirect") ?? undefined, "/drive");
    throw redirect({ to: target, replace: true });
  }

  return next({ context: authContext });
});
