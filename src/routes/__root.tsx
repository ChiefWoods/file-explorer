import { useEffect } from "react";
import { HeadContent, Scripts, createRootRoute, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import { getSession } from "#/lib/auth.functions";

import appCss from "../styles.css?url";
import { Toaster } from "sonner";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var mode=stored==='light'||stored==='dark'?stored:(prefersDark?'dark':'light');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;}catch(e){}})();`;

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/") {
      const session = await getSession();
      throw redirect({ to: session?.session ? "/drive" : "/sign-in" });
    }
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

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return (
      <main className="page-wrap px-4 pb-16 pt-10">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-destructive/35 bg-destructive/10 p-6">
          <h1 className="m-0 text-lg font-semibold text-destructive">Something went wrong</h1>
          <p className="mt-2 text-sm text-destructive/90">{message}</p>
        </div>
      </main>
    );
  },
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
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
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
