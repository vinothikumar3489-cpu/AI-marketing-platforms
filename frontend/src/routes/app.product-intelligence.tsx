import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/product-intelligence")({
  beforeLoad: () => {
    throw redirect({ to: '/app/growth-workspace' });
  }
});
