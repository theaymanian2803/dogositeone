import { createFileRoute } from "@tanstack/react-router";

import { googleConfigured, handleGoogleStart } from "@/lib/google-oauth.server";

export const Route = createFileRoute("/api/auth/google/")({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (googleConfigured()) return handleGoogleStart(request);
        return new Response(null, {
          status: 303,
          headers: { location: "/account?google=unconfigured" },
        });
      },
    },
  },
});
