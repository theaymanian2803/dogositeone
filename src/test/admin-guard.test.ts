// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";

const cookieState = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => cookieState.token ?? undefined,
  setCookie: () => {},
  deleteCookie: () => {},
}));

import {
  createCustomer,
  createOwner,
  createSession,
  requireAdmin,
  requireStaff,
} from "@/server/auth";
import { createDb } from "@/server/db";

const clients: Client[] = [];
const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  cookieState.token = null;
  for (const client of clients.splice(0)) client.close();
});

describe("admin route protection", () => {
  it("rejects requests without a session", async () => {
    const db = makeDb();
    cookieState.token = null;

    await expect(requireAdmin(db)).rejects.toMatchObject({ status: 401 });
    await expect(requireStaff(db)).rejects.toMatchObject({ status: 401 });
  });

  it("accepts an admin session and rejects a customer session", async () => {
    const db = makeDb();
    const owner = await createOwner(db, {
      email: "guard-owner@pace.test",
      password: "a-strong-password",
    });
    const customer = await createCustomer(db, {
      email: "guard-customer@pace.test",
      password: "customer-pass",
    });

    const adminSession = await createSession(db, owner.id);
    cookieState.token = adminSession.token;
    const admin = await requireAdmin(db);
    expect(admin.role).toBe("admin");

    const customerSession = await createSession(db, customer.id);
    cookieState.token = customerSession.token;
    await expect(requireAdmin(db)).rejects.toMatchObject({ status: 403 });
    await expect(requireStaff(db)).rejects.toMatchObject({ status: 403 });
  });
});
