import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rulette")({
  beforeLoad: () => {
    throw redirect({ to: "/ru-lette", replace: true });
  },
});
