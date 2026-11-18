import { getDb } from "@/server/db";
import { getMedia } from "@/server/media";

export async function serveMedia(id: string): Promise<Response> {
  try {
    const client = await getDb();
    const media = await getMedia(client, id);
    if (!media) return new Response("Not found", { status: 404 });

    return new Response(media.data as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": media.mime,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 503 });
  }
}
