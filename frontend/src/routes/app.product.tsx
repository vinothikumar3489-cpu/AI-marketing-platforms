import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/product")({
  beforeLoad: () => {
    throw redirect({ to: "/app/product-intelligence" });
  },
});
