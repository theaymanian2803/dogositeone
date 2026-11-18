import type { Client } from "@libsql/client";

import { defaultStoreSettings, type StoreSettings, type StoreShipping } from "@/lib/store-settings";

const SETTING_KEYS = Object.keys(defaultStoreSettings) as Array<keyof StoreSettings>;

export async function getSettings(client: Client): Promise<StoreSettings> {
  const result = await client.execute("SELECT key, value FROM settings");
  const stored: Record<string, unknown> = {};

  for (const row of result.rows) {
    const key = String(row["key"]);
    if (!SETTING_KEYS.includes(key as keyof StoreSettings)) continue;
    try {
      stored[key] = JSON.parse(String(row["value"] ?? "null"));
    } catch {
      // Ignore malformed settings rows and keep the default.
    }
  }

  const merged: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) {
    const fallback = defaultStoreSettings[key];
    const value = stored[key];
    merged[key] =
      value && typeof value === "object" && !Array.isArray(value) && typeof fallback === "object"
        ? { ...(fallback as object), ...(value as object) }
        : (value ?? fallback);
  }

  return merged as StoreSettings;
}

export async function getShippingSettings(client: Client): Promise<StoreShipping> {
  const settings = await getSettings(client);
  return settings.store_shipping;
}

export async function setSetting(client: Client, key: string, value: unknown): Promise<void> {
  await client.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, JSON.stringify(value)],
  });
}

export async function getRawSetting(client: Client, key: string): Promise<unknown> {
  const result = await client.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [key],
  });
  const value = result.rows[0]?.["value"];
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return String(value);
  }
}
