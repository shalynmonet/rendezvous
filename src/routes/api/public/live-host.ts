import { createFileRoute } from "@tanstack/react-router";
import { hostLiveChat } from "@/lib/live-host.server";
export const Route = createFileRoute("/api/public/live-host")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const origin = request.headers.get("origin");
        if (!origin || origin !== new URL(request.url).origin)
          return new Response("Forbidden", { status: 403 });
        return hostLiveChat(request);
      },
    },
  },
});
