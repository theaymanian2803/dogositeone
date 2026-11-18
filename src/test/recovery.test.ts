// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import {
  authenticate,
  completePasswordReset,
  createCustomer,
  createSession,
  issuePasswordReset,
  listPasswordResetRequests,
  requestPasswordReset,
} from "@/server/auth";
import { createDb, ensureDatabase } from "@/server/db";

const clients: Client[] = [];

const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

async function customer(db: Client, email = "recover@example.com") {
  await ensureDatabase(db);
  return createCustomer(db, { email, password: "old-password" });
}

describe("account recovery", () => {
  it("does not reveal whether an email exists", async () => {
    const db = makeDb();
    await ensureDatabase(db);

    const result = await requestPasswordReset(db, { email: "ghost@example.com" });
    const rows = await db.execute("SELECT COUNT(*) AS count FROM password_resets");

    expect(result.ok).toBe(true);
    expect(Number(rows.rows[0]?.["count"])).toBe(0);
  });

  it("creates one pending request for a customer", async () => {
    const db = makeDb();
    await customer(db);

    await requestPasswordReset(db, { email: "recover@example.com" });
    await requestPasswordReset(db, { email: "recover@example.com" });

    const rows = await db.execute("SELECT status FROM password_resets");
    const requests = await listPasswordResetRequests(db);

    expect(rows.rows).toHaveLength(1);
    expect(String(rows.rows[0]?.["status"])).toBe("pending");
    expect(requests[0]?.email).toBe("recover@example.com");
  });

  it("issues a hashed one-time code and resets the password", async () => {
    const db = makeDb();
    const user = await customer(db);
    await createSession(db, user.id);
    await requestPasswordReset(db, { email: "recover@example.com" });

    const [request] = await listPasswordResetRequests(db);
    const issued = await issuePasswordReset(db, { id: request!.id });

    expect(issued.code).toMatch(/^[A-Z2-9]{8}$/);
    const stored = await db.execute(
      "SELECT code_hash, status FROM password_resets WHERE status = 'code_issued' LIMIT 1",
    );
    expect(String(stored.rows[0]?.["code_hash"])).not.toBe(issued.code);
    expect(String(stored.rows[0]?.["status"])).toBe("code_issued");

    await completePasswordReset(db, {
      email: "recover@example.com",
      code: issued.code,
      password: "new-password",
    });

    await expect(
      authenticate(db, { email: "recover@example.com", password: "old-password" }),
    ).rejects.toThrow(/invalid/i);
    const user2 = await authenticate(db, {
      email: "recover@example.com",
      password: "new-password",
    });
    expect(user2.email).toBe("recover@example.com");

    const sessions = await db.execute("SELECT COUNT(*) AS count FROM sessions");
    expect(Number(sessions.rows[0]?.["count"])).toBe(0);

    await expect(
      completePasswordReset(db, {
        email: "recover@example.com",
        code: issued.code,
        password: "another-password",
      }),
    ).rejects.toThrow(/invalid|expired/i);
  });

  it("counts wrong attempts and locks after five", async () => {
    const db = makeDb();
    await customer(db);
    await requestPasswordReset(db, { email: "recover@example.com" });
    const [request] = await listPasswordResetRequests(db);
    const issued = await issuePasswordReset(db, { id: request!.id });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        completePasswordReset(db, {
          email: "recover@example.com",
          code: "WRONG123",
          password: "new-password",
        }),
      ).rejects.toThrow(/invalid|expired/i);
    }

    await expect(
      completePasswordReset(db, {
        email: "recover@example.com",
        code: issued.code,
        password: "new-password",
      }),
    ).rejects.toThrow(/too many/i);
  });

  it("rejects an expired code", async () => {
    const db = makeDb();
    await customer(db);
    const issued = await issuePasswordReset(db, { email: "recover@example.com" });
    await db.execute("UPDATE password_resets SET expires_at = datetime('now', '-1 minute')");

    await expect(
      completePasswordReset(db, {
        email: "recover@example.com",
        code: issued.code,
        password: "new-password",
      }),
    ).rejects.toThrow(/invalid|expired/i);
  });

  it("issues directly from an email without a request", async () => {
    const db = makeDb();
    await customer(db, "direct@example.com");

    const issued = await issuePasswordReset(db, { email: "direct@example.com" });

    expect(issued.email).toBe("direct@example.com");
    expect(issued.code).toHaveLength(8);
  });

  it("refuses to issue a code for staff accounts", async () => {
    const db = makeDb();
    await ensureDatabase(db);
    await db.batch(
      [
        {
          sql: "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
          args: ["admin-1", "boss@example.com", "x", "Boss"],
        },
        {
          sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
          args: ["role-1", "admin-1"],
        },
      ],
      "write",
    );

    await expect(issuePasswordReset(db, { email: "boss@example.com" })).rejects.toThrow(
      /no customer/i,
    );
  });

  it("rejects short passwords", async () => {
    const db = makeDb();
    await customer(db);
    const issued = await issuePasswordReset(db, { email: "recover@example.com" });

    await expect(
      completePasswordReset(db, {
        email: "recover@example.com",
        code: issued.code,
        password: "short",
      }),
    ).rejects.toThrow(/8 characters/i);
  });
});
