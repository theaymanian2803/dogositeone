// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import { getProductDetail, listProducts, readProducts } from "@/server/catalog";
import { createDb, ensureDatabase } from "@/server/db";
import { seedProducts } from "@/server/seed";

const clients: Client[] = [];

const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("catalog database", () => {
  it("seeds the thirteen pieces once", async () => {
    const db = makeDb();
    await ensureDatabase(db);
    await ensureDatabase(db);

    const rows = await readProducts(db);
    expect(rows).toHaveLength(13);
    expect(seedProducts).toHaveLength(13);
  });

  it("returns a product with parsed JSON detail columns", async () => {
    const db = makeDb();
    await ensureDatabase(db);

    const product = await getProductDetail("dog-chew-toy-beef-bone-9sl2", { client: db });
    expect(product?.name).toBe("Dog Chew Toy — Beef Bone");
    expect(product?.features.length).toBeGreaterThan(0);
    expect(product?.care.length).toBeGreaterThan(0);
    expect(product?.image).toBe("/products/bone.jpg");
  });

  it("falls back to the seed catalog when the database is unavailable", async () => {
    const db = makeDb();
    db.close();

    const rows = await listProducts({ client: db });
    expect(rows).toHaveLength(13);
  });

  it("falls back to the seed product for a detail lookup when the database is down", async () => {
    const db = makeDb();
    db.close();

    const product = await getProductDetail("dog-chew-toy-beef-bone-9sl2", { client: db });
    expect(product?.name).toBe("Dog Chew Toy — Beef Bone");
  });

  it("returns an empty catalog when the database is reachable but has no active products", async () => {
    const db = makeDb();
    await ensureDatabase(db);
    await db.execute("DELETE FROM products");

    const rows = await listProducts({ client: db });
    expect(rows).toEqual([]);
  });
});
