import { auth } from "#/lib/auth";
import { safeInternalPath } from "#/lib/nav-redirect";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type AuthContext = {
  session: SessionResult["session"] | null;
  user: SessionResult["user"] | null;
};

const PROTECTED_ROUTES = ["/drive", "/drive/shared"];

export const authRequestMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next, pathname, request }) => {
  const url = new URL(request.url);
  const sessionResult = await auth.api.getSession({ headers: request.headers });
  const authContext: AuthContext = {
    session: sessionResult?.session ?? null,
    user: sessionResult?.user ?? null,
  };

  if (pathname === "/") {
    throw redirect({
      to: authContext.session ? "/drive" : "/sign-in",
      replace: true,
    });
  }

  if (PROTECTED_ROUTES.includes(pathname) && !authContext.session) {
    const target = safeInternalPath(`${pathname}${url.search}`, "/drive");
    throw redirect({
      to: "/sign-in",
      search: { redirect: target },
      replace: true,
    });
  }

  if (pathname === "/sign-in" && authContext.session) {
    const target = safeInternalPath(url.searchParams.get("redirect") ?? undefined, "/drive");
    throw redirect({ to: target, replace: true });
  }

  return next({ context: authContext });
});
