// @vitest-environment node
import type { Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

import { createSection, getSection, updateSection } from "@/server/cms";
import { createDb } from "@/server/db";

const clients: Client[] = [];

function makeDb() {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("section design persistence", () => {
  it("saves and reloads alignment", async () => {
    const db = makeDb();
    const created = await createSection(db, { type: "promo", title: "Test", config: {} });

    await updateSection(db, created.id, {
      type: "promo",
      title: "Test",
      config: { style: { align: "center" } },
    });

    const after = await getSection(db, created.id);
    expect(after?.config).toEqual({ style: { align: "center" } });
  });

  it("keeps alignment alongside other keys", async () => {
    const db = makeDb();
    const created = await createSection(db, {
      type: "categories",
      title: "Test",
      config: { eyebrow: "Hi" },
    });

    await updateSection(db, created.id, {
      type: "categories",
      title: "Test",
      config: { eyebrow: "Hi", category_ids: ["c1"], style: { align: "right" } },
    });

    const after = await getSection(db, created.id);
    expect(after?.config).toEqual({
      eyebrow: "Hi",
      category_ids: ["c1"],
      style: { align: "right" },
    });
  });
});
