import { ErrorPage } from "#/components/shared/error-page";
import { authRequestMiddleware } from "#/lib/auth-middleware";
import { getSession } from "#/lib/auth.functions";
import { getErrorCode } from "#/lib/utils";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var mode=stored==='light'||stored==='dark'?stored:(prefersDark?'dark':'light');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;}catch(e){}})();`;

export const Route = createRootRoute({
  server: {
    middleware: [authRequestMiddleware],
  },
  beforeLoad: async ({ serverContext }) => {
    if (serverContext) {
      return {
        user: serverContext.user ?? null,
        session: serverContext.session ?? null,
      };
    }

    const sessionResult = await getSession();

    return {
      user: sessionResult?.user ?? null,
      session: sessionResult?.session ?? null,
    };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "File Explorer",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon-light.svg",
        type: "image/svg+xml",
      },
      {
        rel: "icon",
        href: "/favicon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        rel: "icon",
        href: "/favicon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  }),
  errorComponent: ({ error }) => {
    if (isAbortLikeError(error)) {
      return null;
    }

    const code = getErrorCode(error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    return (
      <ErrorPage
        code={code}
        title={code === 404 ? "Page not found" : "Request failed"}
        description={message}
      />
    );
  },
  notFoundComponent: () => (
    <ErrorPage
      code={404}
      title="Page not found"
      description="The page you requested could not be found."
    />
  ),
  shellComponent: RootDocument,
});

function isAbortLikeError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  return name === "AbortError" || message.includes("abort") || message.includes("cancel");
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans wrap-anywhere antialiased selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Toaster position="bottom-right" richColors closeButton />
        <Scripts />
      </body>
    </html>
  );
}
