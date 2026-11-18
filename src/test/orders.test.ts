// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import type { CheckoutCustomer } from "@/lib/checkout";
import { FLAT_SHIPPING } from "@/lib/checkout";
import { createDb, ensureDatabase } from "@/server/db";
import {
  CheckoutValidationError,
  DatabaseUnavailableError,
  newOrderNumber,
  placeOrder,
} from "@/server/orders";

const customer: CheckoutCustomer = {
  name: "Amina Vale",
  email: "amina@example.com",
  phone: "+1 555 0100",
  address: "12 Track Lane",
  city: "Portland",
  postalCode: "97201",
  country: "United States",
};

const clients: Client[] = [];

const makeDb = () => {
  const client = createDb(":memory:");
  clients.push(client);
  return client;
};

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("placeOrder", () => {
  it("creates one order with its line items and server totals", async () => {
    const db = makeDb();

    const result = await placeOrder(
      {
        customer,
        items: [
          { productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 2 },
          { productId: "organic-cat-treats-salmon-n6d5", size: "One Size", quantity: 1 },
        ],
      },
      db,
    );

    expect(result.orderNumber).toMatch(/^PET-[A-Z0-9]+-[A-Z0-9]{3}$/);
    expect(result.totals).toEqual({
      subtotal: 27.97,
      shipping: FLAT_SHIPPING,
      discount: 0,
      total: 77.97,
    });

    const orders = await db.execute("SELECT * FROM orders");
    expect(orders.rows).toHaveLength(1);
    expect(Number(orders.rows[0]?.["total"])).toBe(77.97);
    expect(String(orders.rows[0]?.["order_number"])).toBe(result.orderNumber);

    const items = await db.execute("SELECT * FROM order_items ORDER BY name");
    expect(items.rows).toHaveLength(2);
    expect(Number(items.rows[0]?.["quantity"])).toBe(2);
    expect(Number(items.rows[1]?.["quantity"])).toBe(1);
    expect(Number(items.rows[0]?.["line_total"])).toBe(19.98);
  });

  it("writes nothing when the cart is invalid", async () => {
    const db = makeDb();

    await expect(placeOrder({ customer, items: [] }, db)).rejects.toBeInstanceOf(
      CheckoutValidationError,
    );

    const orders = await db.execute("SELECT COUNT(*) AS count FROM orders");
    const items = await db.execute("SELECT COUNT(*) AS count FROM order_items");
    expect(Number(orders.rows[0]?.["count"])).toBe(0);
    expect(Number(items.rows[0]?.["count"])).toBe(0);
  });

  it("ignores client prices", async () => {
    const db = makeDb();

    const result = await placeOrder(
      {
        customer,
        items: [
          {
            productId: "squeaky-plush-toy-set-3-pack-qa0h",
            size: "One Size",
            quantity: 1,
            unitPrice: 1,
          } as never,
        ],
      },
      db,
    );

    expect(result.totals).toEqual({
      subtotal: 16.99,
      shipping: FLAT_SHIPPING,
      discount: 0,
      total: 66.99,
    });
  });

  it("persists the delivery details with the order", async () => {
    const db = makeDb();

    await placeOrder(
      {
        customer,
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      db,
    );

    const orders = await db.execute("SELECT * FROM orders");
    const row = orders.rows[0];
    expect(row?.["customer_name"]).toBe("Amina Vale");
    expect(row?.["email"]).toBe("amina@example.com");
    expect(row?.["address"]).toBe("12 Track Lane");
    expect(row?.["status"]).toBe("new");
    expect(row?.["currency"]).toBe("MAD");
  });

  it("returns the same order for a repeated idempotency key", async () => {
    const db = makeDb();
    const input = {
      customer,
      items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      idempotencyKey: "checkout-attempt-1",
    };

    const first = await placeOrder(input, db);
    const second = await placeOrder(input, db);

    expect(second.orderNumber).toBe(first.orderNumber);
    expect(second.totals.total).toBe(first.totals.total);

    const orders = await db.execute("SELECT COUNT(*) AS count FROM orders");
    expect(Number(orders.rows[0]?.["count"])).toBe(1);
  });

  it("rejects a product that is no longer active", async () => {
    const db = makeDb();
    await ensureDatabase(db);
    await db.execute("UPDATE products SET active = 0 WHERE id = 'dog-chew-toy-beef-bone-9sl2'");

    await expect(
      placeOrder(
        {
          customer,
          items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
        },
        db,
      ),
    ).rejects.toBeInstanceOf(CheckoutValidationError);

    const orders = await db.execute("SELECT COUNT(*) AS count FROM orders");
    expect(Number(orders.rows[0]?.["count"])).toBe(0);
  });

  it("reports a closed database as unavailable", async () => {
    const db = makeDb();
    await ensureDatabase(db);
    db.close();

    await expect(
      placeOrder(
        {
          customer,
          items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
        },
        db,
      ),
    ).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("newOrderNumber", () => {
  it("uses the PET prefix and stays unique across calls", () => {
    const first = newOrderNumber();
    const second = newOrderNumber();

    expect(first).toMatch(/^PET-[A-Z0-9]+-[A-Z0-9]{3}$/);
    expect(first).not.toBe(second);
  });
});
