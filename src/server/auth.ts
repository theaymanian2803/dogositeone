import type { Client } from "@libsql/client";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { ensureDatabase } from "./db";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "pace_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TTL_DAYS = 7;

export type Role = "admin" | "moderator" | "customer";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function countAdmins(client: Client): Promise<number> {
  const result = await client.execute({
    sql: "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'",
    args: [],
  });
  return Number(result.rows[0]?.["count"] ?? 0);
}

export async function createOwner(
  client: Client,
  input: { email: string; password: string; name?: string },
): Promise<SessionUser> {
  await ensureDatabase(client);
  const email = input.email.trim();
  const password = input.password;
  const name = (input.name ?? "").trim();

  if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.", 400);
  if (password.length < 8) {
    throw new AuthError("Use a password with at least 8 characters.", 400);
  }
  if (password.length > 128) throw new AuthError("That password is too long.", 400);
  if (name.length > 80) throw new AuthError("That name is too long.", 400);

  if ((await countAdmins(client)) > 0) {
    throw new AuthError("An owner account already exists. Sign in instead.", 409);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const displayName = name || email.split("@")[0] || "Owner";

  await client.batch(
    [
      {
        sql: "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        args: [userId, email, passwordHash, displayName],
      },
      {
        sql: `INSERT INTO profiles (id, user_id, display_name, email) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), userId, displayName, email],
      },
      {
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
        args: [crypto.randomUUID(), userId],
      },
    ],
    "write",
  );

  return { id: userId, email, name: displayName, role: "admin" };
}

export async function createSession(
  client: Client,
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = newSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await client.execute({
    sql: "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), userId, tokenHash, expiresAt],
  });
  return { token, expiresAt };
}

export async function getSessionUser(client: Client, token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.name, ur.role
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          WHERE s.token_hash = ? AND s.expires_at > ?
          ORDER BY CASE ur.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END
          LIMIT 1`,
    args: [tokenHash, new Date().toISOString()],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row["id"]),
    email: String(row["email"]),
    name: row["name"] ? String(row["name"]) : null,
    role: (String(row["role"] ?? "customer") as Role) ?? "customer",
  };
}

export async function destroySession(client: Client, token: string): Promise<void> {
  if (!token) return;
  const tokenHash = await hashToken(token);
  await client.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [tokenHash] });
}

export function setSessionCookie(token: string): void {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(): string | null {
  return getCookie(SESSION_COOKIE) ?? null;
}

export function sessionCookieMaxAge() {
  return SESSION_TTL_DAYS * 24 * 60 * 60;
}

export class AuthRateLimit {
  private attempts = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit = 10, windowMs = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

export const loginLimiter = new AuthRateLimit();

export async function requireAdmin(client: Client): Promise<SessionUser> {
  const token = readSessionCookie();
  if (!token) throw new AuthError("Sign in to continue.", 401);
  const user = await getSessionUser(client, token);
  if (!user) throw new AuthError("Your session expired. Sign in again.", 401);
  if (user.role !== "admin") throw new AuthError("Admin access is required.", 403);
  return user;
}

export async function requireStaff(client: Client): Promise<SessionUser> {
  const token = readSessionCookie();
  if (!token) throw new AuthError("Sign in to continue.", 401);
  const user = await getSessionUser(client, token);
  if (!user) throw new AuthError("Your session expired. Sign in again.", 401);
  if (user.role !== "admin" && user.role !== "moderator") {
    throw new AuthError("Staff access is required.", 403);
  }
  return user;
}

export async function getUserWithRole(client: Client, userId: string): Promise<SessionUser | null> {
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.name, ur.role
          FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
          WHERE u.id = ?
          ORDER BY CASE ur.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END
          LIMIT 1`,
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row["id"]),
    email: String(row["email"]),
    name: row["name"] ? String(row["name"]) : null,
    role: (String(row["role"] ?? "customer") as Role) ?? "customer",
  };
}

export async function authenticate(
  client: Client,
  input: { email: string; password: string },
): Promise<SessionUser> {
  const email = input.email.trim();
  if (!email || !input.password) throw new AuthError("Email and password are required.", 400);
  const result = await client.execute({
    sql: "SELECT id, password_hash FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });
  const row = result.rows[0];
  if (!row) throw new AuthError("Invalid email or password.", 401);
  const valid = await verifyPassword(input.password, String(row["password_hash"]));
  if (!valid) throw new AuthError("Invalid email or password.", 401);
  const user = await getUserWithRole(client, String(row["id"]));
  if (!user) throw new AuthError("Invalid email or password.", 401);
  return user;
}

export async function createCustomer(
  client: Client,
  input: { email: string; password: string; name?: string },
): Promise<SessionUser> {
  await ensureDatabase(client);
  const email = input.email.trim();
  const name = (input.name ?? "").trim();
  if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.", 400);
  if (input.password.length < 8) {
    throw new AuthError("Use a password with at least 8 characters.", 400);
  }
  if (input.password.length > 128) throw new AuthError("That password is too long.", 400);

  const existing = await client.execute({
    sql: "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });
  if (existing.rows.length > 0) throw new AuthError("An account with that email exists.", 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  const displayName = name || email.split("@")[0] || "Customer";

  await client.batch(
    [
      {
        sql: "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        args: [userId, email, passwordHash, displayName],
      },
      {
        sql: "INSERT INTO profiles (id, user_id, display_name, email) VALUES (?, ?, ?, ?)",
        args: [crypto.randomUUID(), userId, displayName, email],
      },
      {
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'customer')",
        args: [crypto.randomUUID(), userId],
      },
    ],
    "write",
  );

  return { id: userId, email, name: displayName, role: "customer" };
}

/* Account recovery --------------------------------------------------- */

export type PasswordResetRequest = {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  requestedAt: string;
  expiresAt: string | null;
};

const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (byte) => RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length],
  ).join("");
}

function normalizeRecoveryCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

async function latestPhoneForEmail(client: Client, email: string): Promise<string> {
  const result = await client.execute({
    sql: `SELECT phone FROM orders
          WHERE email = ? COLLATE NOCASE AND phone <> ''
          ORDER BY created_at DESC LIMIT 1`,
    args: [email],
  });
  return result.rows[0] ? String(result.rows[0]["phone"] ?? "") : "";
}

/**
 * Customers can ask the shop for a reset code without revealing whether the
 * email exists. The shop issues the code from Admin -> Customers.
 */
export async function requestPasswordReset(
  client: Client,
  input: { email: string },
): Promise<{ ok: true }> {
  await ensureDatabase(client);
  const email = input.email.trim();
  if (!isValidEmail(email)) return { ok: true };

  const user = await client.execute({
    sql: `SELECT u.id FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          WHERE u.email = ? COLLATE NOCASE AND ur.role = 'customer'
          LIMIT 1`,
    args: [email],
  });
  const userId = user.rows[0]?.["id"];
  if (!userId) return { ok: true };

  const recent = await client.execute({
    sql: `SELECT 1 FROM password_resets
          WHERE user_id = ? AND status IN ('pending', 'code_issued')
            AND created_at > datetime('now', '-10 minutes')
          LIMIT 1`,
    args: [String(userId)],
  });
  if (recent.rows.length > 0) return { ok: true };

  await client.execute({
    sql: `INSERT INTO password_resets (id, user_id, email, status)
          VALUES (?, ?, ?, 'pending')`,
    args: [crypto.randomUUID(), String(userId), email],
  });
  return { ok: true };
}

/** Admin view: pending requests that still need a code. */
export async function listPasswordResetRequests(client: Client): Promise<PasswordResetRequest[]> {
  await ensureDatabase(client);
  const result = await client.execute(`
    SELECT r.id, r.email, r.status, r.created_at, r.expires_at,
      COALESCE(u.name, '') AS name,
      COALESCE((SELECT o.phone FROM orders o
        WHERE o.email = r.email COLLATE NOCASE AND o.phone <> ''
        ORDER BY o.created_at DESC LIMIT 1), '') AS phone
    FROM password_resets r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.status = 'pending'
      AND r.created_at > datetime('now', '-7 days')
    ORDER BY r.created_at DESC
  `);
  return result.rows.map((row) => ({
    id: String(row["id"]),
    email: String(row["email"]),
    name: String(row["name"] ?? ""),
    phone: String(row["phone"] ?? ""),
    status: String(row["status"]),
    requestedAt: String(row["created_at"]),
    expiresAt: row["expires_at"] ? String(row["expires_at"]) : null,
  }));
}

/**
 * Admin generates a one-time code and sends it to the customer. The code is
 * hashed at rest and expires after 30 minutes.
 */
export async function issuePasswordReset(
  client: Client,
  input: { id?: string; email?: string },
): Promise<{ code: string; email: string; name: string; phone: string }> {
  await ensureDatabase(client);

  let userId = "";
  let email = input.email?.trim() ?? "";

  if (input.id) {
    const row = await client.execute({
      sql: "SELECT user_id, email FROM password_resets WHERE id = ? LIMIT 1",
      args: [input.id],
    });
    if (!row.rows[0]) throw new AuthError("That recovery request no longer exists.", 404);
    userId = String(row.rows[0]["user_id"]);
    email = String(row.rows[0]["email"]);
  } else {
    if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.", 400);
    const user = await client.execute({
      sql: `SELECT u.id FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.email = ? COLLATE NOCASE AND ur.role = 'customer'
            LIMIT 1`,
      args: [email],
    });
    if (!user.rows[0]) throw new AuthError("No customer account uses that email.", 404);
    userId = String(user.rows[0]["id"]);
  }

  const userRow = await client.execute({
    sql: "SELECT email, name FROM users WHERE id = ? LIMIT 1",
    args: [userId],
  });
  if (!userRow.rows[0]) throw new AuthError("That account no longer exists.", 404);
  email = String(userRow.rows[0]["email"]);
  const name = String(userRow.rows[0]["name"] ?? "");

  await client.execute({
    sql: `UPDATE password_resets SET status = 'cancelled'
          WHERE user_id = ? AND status IN ('pending', 'code_issued')`,
    args: [userId],
  });

  const code = newRecoveryCode();
  const codeHash = await hashPassword(code);
  await client.execute({
    sql: `INSERT INTO password_resets
      (id, user_id, email, code_hash, status, attempts, expires_at)
      VALUES (?, ?, ?, ?, 'code_issued', 0, datetime('now', '+30 minutes'))`,
    args: [crypto.randomUUID(), userId, email, codeHash],
  });

  return { code, email, name, phone: await latestPhoneForEmail(client, email) };
}

/** Customer completes recovery with the shop-issued code. */
export async function completePasswordReset(
  client: Client,
  input: { email: string; code: string; password: string },
): Promise<{ ok: true }> {
  await ensureDatabase(client);
  const email = input.email.trim();
  const code = normalizeRecoveryCode(input.code);

  if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.", 400);
  if (!code) throw new AuthError("Enter the code from the shop.", 400);
  if (input.password.length < 8) {
    throw new AuthError("Use a password with at least 8 characters.", 400);
  }
  if (input.password.length > 128) throw new AuthError("That password is too long.", 400);

  const result = await client.execute({
    sql: `SELECT id, user_id, code_hash, attempts FROM password_resets
          WHERE email = ? COLLATE NOCASE AND status = 'code_issued'
            AND expires_at > CURRENT_TIMESTAMP
          ORDER BY created_at DESC LIMIT 1`,
    args: [email],
  });
  const row = result.rows[0];
  if (!row) throw new AuthError("That code is invalid or has expired.", 400);

  const attempts = Number(row["attempts"] ?? 0);
  if (attempts >= 5) throw new AuthError("Too many attempts. Ask the shop for a new code.", 429);

  const valid = await verifyPassword(code, String(row["code_hash"]));
  if (!valid) {
    await client.execute({
      sql: "UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?",
      args: [String(row["id"])],
    });
    throw new AuthError("That code is invalid or has expired.", 400);
  }

  const passwordHash = await hashPassword(input.password);
  await client.batch(
    [
      {
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [passwordHash, String(row["user_id"])],
      },
      {
        sql: "DELETE FROM sessions WHERE user_id = ?",
        args: [String(row["user_id"])],
      },
      {
        sql: "UPDATE password_resets SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [String(row["id"])],
      },
    ],
    "write",
  );

  return { ok: true };
}
