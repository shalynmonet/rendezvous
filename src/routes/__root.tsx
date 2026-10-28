import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AccountProvider, useAccount } from "@/components/account-provider";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Ru can't find this table</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rendezvous — Ru knows." },
      { name: "description", content: "A taste-aware relationship host powered by Qloo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Karla:wght@400;500;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/profile", label: "My tastes" },
  { to: "/connections", label: "People" },
  { to: "/reveal", label: "Reveal" },
  { to: "/chat", label: "Chat" },
  { to: "/ru-lette", label: "Ru-lette" },
  { to: "/plan", label: "Plan a date" },
  { to: "/concierge", label: "Concierge" },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <AppShell />
      </AccountProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { user } = useAccount();
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <nav className="banner-velvet sticky top-0 z-30 border-b">
          <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-5 py-3">
            <Link to="/" className="font-display text-2xl font-semibold italic text-gold">
              Rendezvous
            </Link>
            <div className="ml-auto flex gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  activeProps={{ className: "bg-muted text-foreground" }}
                >
                  {n.label}
                </Link>
              ))}
              <Link to="/auth" className="whitespace-nowrap px-3 py-1.5 text-sm text-gold">
                {user ? "Account" : "Save my tastes"}
              </Link>
            </div>
          </div>
        </nav>
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="banner-velvet border-t py-6 text-center text-xs text-foreground">
          Ru knows. · Taste data by Qloo ·{" "}
          <Link to="/admin" className="underline">
            Concierge desk
          </Link>
        </footer>
      </div>
      <Toaster />
    </>
  );
}
