// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import {
  authenticate,
  countAdmins,
  createCustomer,
  createOwner,
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  verifyPassword,
} from "@/server/auth";
import { createDb } from "@/server/db";

const clients: Client[] = [];
const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
});

describe("owner setup and sessions", () => {
  it("creates exactly one owner and signs a session", async () => {
    const db = makeDb();
    const owner = await createOwner(db, {
      email: "owner@pace.test",
      password: "a-strong-password",
      name: "Owner",
    });

    expect(owner.role).toBe("admin");
    expect(await countAdmins(db)).toBe(1);

    const session = await createSession(db, owner.id);
    const user = await getSessionUser(db, session.token);
    expect(user?.email).toBe("owner@pace.test");
    expect(user?.role).toBe("admin");

    await destroySession(db, session.token);
    expect(await getSessionUser(db, session.token)).toBeNull();
  });

  it("refuses a second owner", async () => {
    const db = makeDb();
    await createOwner(db, { email: "one@pace.test", password: "a-strong-password" });
    await expect(
      createOwner(db, { email: "two@pace.test", password: "a-strong-password" }),
    ).rejects.toThrow(/owner account already exists/i);
  });

  it("authenticates a customer and keeps the role", async () => {
    const db = makeDb();
    const customer = await createCustomer(db, {
      email: "shopper@pace.test",
      password: "shopper-pass",
      name: "Shopper",
    });

    const signedIn = await authenticate(db, {
      email: "SHOPPER@pace.test",
      password: "shopper-pass",
    });
    expect(signedIn.id).toBe(customer.id);
    expect(signedIn.role).toBe("customer");

    await expect(
      authenticate(db, { email: "shopper@pace.test", password: "nope" }),
    ).rejects.toThrow(/invalid email or password/i);
  });
});
