import { createFileRoute } from "@tanstack/react-router";

import { handleGoogleCallback } from "@/lib/google-oauth.server";

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: ({ request }) => handleGoogleCallback(request),
    },
  },
});
