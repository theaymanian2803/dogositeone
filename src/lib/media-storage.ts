export type MediaStorageMode = "auto" | "r2" | "database";

/**
 * Picks where an upload should go.
 * - `database`: always the database.
 * - `r2`: R2 when configured, otherwise `unavailable` so the admin sees the error.
 * - `auto`: R2 when configured, otherwise the database.
 */
export function resolveMediaStorage(
  mode: MediaStorageMode,
  r2Available: boolean,
): "r2" | "database" | "unavailable" {
  if (mode === "database") return "database";
  if (r2Available) return "r2";
  return mode === "r2" ? "unavailable" : "database";
}

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** Database ids are bare hex; R2 keys always contain a path separator. */
export function isR2ObjectId(id: string): boolean {
  return id.includes("/");
}

export function mimeForKey(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[extension] ?? "image/*";
}
