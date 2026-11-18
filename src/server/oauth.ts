import type { Client } from "@libsql/client";

import { getUserWithRole, type Role } from "./auth";

export type OAuthProfile = {
  email: string;
  name?: string | null;
  avatar?: string | null;
  provider: "google";
};

/**
 * Creates or links a shopper account for an OAuth identity. Staff accounts are
 * never created here; the caller must reject an existing admin/moderator from
 * signing in through Google.
 */
export async function upsertOAuthUser(
  client: Client,
  profile: OAuthProfile,
): Promise<{ userId: string; role: Role }> {
  const email = profile.email.trim();
  const name = (profile.name ?? "").trim();
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });

  if (existing.rows[0]) {
    const userId = String(existing.rows[0]["id"]);
    await client.execute({
      sql: `UPDATE profiles SET
        display_name = COALESCE(NULLIF(display_name, ''), ?),
        avatar_url = COALESCE(avatar_url, ?),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
      args: [name || null, profile.avatar || null, userId],
    });
    const user = await getUserWithRole(client, userId);
    return { userId, role: (user?.role ?? "customer") as Role };
  }

  const userId = crypto.randomUUID();
  const displayName = name || email.split("@")[0] || email;

  await client.batch(
    [
      {
        // A sentinel that can never verify as a PBKDF2 password.
        sql: "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        args: [userId, email, `oauth$${profile.provider}`, displayName],
      },
      {
        sql: "INSERT INTO profiles (id, user_id, display_name, avatar_url, email) VALUES (?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), userId, displayName, profile.avatar || null, email],
      },
      {
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'customer')",
        args: [crypto.randomUUID(), userId],
      },
    ],
    "write",
  );

  return { userId, role: "customer" };
}
