// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import { createOwner } from "@/server/auth";
import { createDb, ensureDatabase } from "@/server/db";
import { upsertOAuthUser } from "@/server/oauth";

const clients: Client[] = [];
const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("OAuth account linking", () => {
  it("creates a customer and reuses it on the next sign-in", async () => {
    const db = makeDb();
    await ensureDatabase(db);

    const first = await upsertOAuthUser(db, {
      email: "oauth@pace.test",
      name: "OAuth Shopper",
      provider: "google",
    });
    expect(first.role).toBe("customer");

    const second = await upsertOAuthUser(db, {
      email: "OAUTH@pace.test",
      name: "OAuth Shopper",
      provider: "google",
    });
    expect(second.userId).toBe(first.userId);
    expect(second.role).toBe("customer");
  });

  it("never downgrades an existing admin", async () => {
    const db = makeDb();
    const owner = await createOwner(db, {
      email: "oauth-staff@pace.test",
      password: "a-strong-password",
    });

    const linked = await upsertOAuthUser(db, {
      email: "oauth-staff@pace.test",
      provider: "google",
    });

    expect(linked.userId).toBe(owner.id);
    expect(linked.role).toBe("admin");
  });
});
