import type { Client } from "@libsql/client";

import {
  AuthError,
  countAdmins,
  getUserWithRole,
  hashPassword,
  isValidEmail,
  verifyPassword,
  type SessionUser,
} from "./auth";
import {
  clearDbConfig,
  ensureDatabase,
  maskUrl,
  readDbConfig,
  setDbConfig,
  testTursoConnection,
} from "./db";
import { getLicenseStatus, type LicenseStatus } from "./license";
import { googleConfigured } from "@/lib/google-oauth.server";

export type SetupStatus = {
  db: { usingCustom: boolean; url: string | null; defaultUrl: string };
  counts: { products: number; orders: number; customers: number; admins: number };
  license: LicenseStatus;
  auth: { google: boolean };
  seed: { productsSeeded: boolean };
};

async function count(client: Client, sql: string): Promise<number> {
  const result = await client.execute(sql);
  return Number(result.rows[0]?.["count"] ?? 0);
}

export async function getSetupStatus(client: Client): Promise<SetupStatus> {
  await ensureDatabase(client);

  const [db, products, orders, customers, admins, license] = await Promise.all([
    readDbConfig(),
    count(client, "SELECT COUNT(*) AS count FROM products"),
    count(client, "SELECT COUNT(*) AS count FROM orders"),
    count(client, "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'customer'"),
    countAdmins(client),
    getLicenseStatus(),
  ]);

  return {
    db: { ...db, defaultUrl: maskUrl("file:.data/petpals.db") },
    counts: { products, orders, customers, admins },
    license,
    auth: { google: googleConfigured() },
    seed: { productsSeeded: products > 0 },
  };
}

export async function connectDatabase(
  url: string,
  token: string,
  keepSeed: boolean,
): Promise<{ seeded: boolean }> {
  return setDbConfig(url, token, { seed: keepSeed });
}

export async function disconnectDatabase(): Promise<void> {
  await clearDbConfig();
}

export async function changeCredentials(
  client: Client,
  userId: string,
  input: { currentPassword: string; email?: string; newPassword?: string },
): Promise<SessionUser> {
  const result = await client.execute({
    sql: "SELECT email, password_hash FROM users WHERE id = ?",
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) throw new AuthError("Account not found.", 404);

  const valid = await verifyPassword(input.currentPassword, String(row["password_hash"]));
  if (!valid) throw new AuthError("Current password is incorrect.", 400);

  const email = input.email?.trim();
  const newPassword = input.newPassword;

  if (email && !isValidEmail(email)) throw new AuthError("Enter a valid email address.", 400);
  if (newPassword && newPassword.length < 10) {
    throw new AuthError("Use a new password with at least 10 characters.", 400);
  }
  if (newPassword && newPassword.length > 128) {
    throw new AuthError("That password is too long.", 400);
  }

  if (email && email.toLowerCase() !== String(row["email"]).toLowerCase()) {
    const taken = await client.execute({
      sql: "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE AND id <> ?",
      args: [email, userId],
    });
    if (taken.rows.length > 0) throw new AuthError("That email is already in use.", 409);
    await client.execute({ sql: "UPDATE users SET email = ? WHERE id = ?", args: [email, userId] });
    await client.execute({
      sql: "UPDATE profiles SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      args: [email, userId],
    });
  }

  if (newPassword) {
    const passwordHash = await hashPassword(newPassword);
    await client.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [passwordHash, userId],
    });
  }

  // Any change invalidates every existing session; the caller issues a fresh one.
  await client.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [userId] });

  const user = await getUserWithRole(client, userId);
  if (!user) throw new AuthError("Account not found.", 404);
  return user;
}

export { testTursoConnection };
