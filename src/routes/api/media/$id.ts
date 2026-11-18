import { createFileRoute } from "@tanstack/react-router";

import { serveMedia } from "@/lib/media-route.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => serveMedia(params.id),
    },
  },
});
