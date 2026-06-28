import { createClient } from "@libsql/client/web";

const url = import.meta.env.VITE_TURSO_DB_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Missing VITE_TURSO_DB_URL or VITE_TURSO_AUTH_TOKEN");
}

export const turso = createClient({ url, authToken });
