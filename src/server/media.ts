import type { Client } from "@libsql/client";

import { ensureDatabase } from "./db";
import {
  isR2ObjectId,
  mimeForKey,
  resolveMediaStorage,
  type MediaStorageMode,
} from "@/lib/media-storage";
import { getSettings } from "./settings";
import { parseDataUrl } from "./image-data";
import { deleteR2Object, listR2Images, r2Configured, uploadImageToR2 } from "./r2";

export type MediaRecord = {
  id: string;
  mime: string;
  url: string;
  createdAt: string;
};

export async function saveMedia(client: Client, dataUrl: string): Promise<MediaRecord> {
  const settings = await getSettings(client);
  const mode: MediaStorageMode = settings.store_media?.storage ?? "auto";
  const target = resolveMediaStorage(mode, r2Configured());

  if (target === "unavailable") {
    throw new Error(
      "Cloudflare R2 is selected but not configured. Add the R2_* environment variables or switch image storage to Database.",
    );
  }

  if (target === "r2") {
    try {
      return await uploadImageToR2(dataUrl);
    } catch (error) {
      if (mode !== "auto") throw error;
      console.error("[media] R2 upload failed, falling back to the database", error);
    }
  }

  await ensureDatabase(client);
  const { mime, bytes } = parseDataUrl(dataUrl);
  const id = crypto.randomUUID().replace(/-/g, "");
  await client.execute({
    sql: "INSERT INTO media (id, mime, data) VALUES (?, ?, ?)",
    args: [id, mime, bytes],
  });
  return { id, mime, url: `/api/media/${id}`, createdAt: new Date().toISOString() };
}

export async function getMedia(
  client: Client,
  id: string,
): Promise<{ mime: string; data: Uint8Array } | null> {
  const result = await client.execute({
    sql: "SELECT mime, data FROM media WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  const raw = row["data"];
  const data =
    raw instanceof Uint8Array
      ? raw
      : raw instanceof ArrayBuffer
        ? new Uint8Array(raw)
        : new Uint8Array(raw as unknown as ArrayBuffer);
  return { mime: String(row["mime"]), data };
}

export async function listMedia(client: Client): Promise<MediaRecord[]> {
  await ensureDatabase(client);
  const result = await client.execute(
    "SELECT id, mime, created_at FROM media ORDER BY created_at DESC LIMIT 200",
  );
  return result.rows.map((row) => ({
    id: String(row["id"]),
    mime: String(row["mime"]),
    url: `/api/media/${String(row["id"])}`,
    createdAt: String(row["created_at"]),
  }));
}

export async function deleteMedia(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM media WHERE id = ?", args: [id] });
}

export type MediaEntry = {
  id: string;
  storage: "r2" | "database";
  url: string;
  mime: string;
  size?: number;
  createdAt: string;
};

/** Merges database media with the objects in this project's R2 prefix. */
export async function listAllMedia(client: Client): Promise<MediaEntry[]> {
  const entries: MediaEntry[] = (await listMedia(client)).map((item) => ({
    id: item.id,
    storage: "database" as const,
    url: item.url,
    mime: item.mime,
    createdAt: item.createdAt,
  }));

  if (r2Configured()) {
    try {
      const objects = await listR2Images();
      entries.push(
        ...objects.map((object) => ({
          id: object.key,
          storage: "r2" as const,
          url: object.url,
          mime: mimeForKey(object.key),
          size: object.size,
          createdAt: object.updatedAt,
        })),
      );
    } catch (error) {
      console.error("[media] could not list R2 objects", error);
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteMediaEntry(client: Client, id: string): Promise<void> {
  if (isR2ObjectId(id)) {
    await deleteR2Object(id);
    return;
  }
  await deleteMedia(client, id);
}
