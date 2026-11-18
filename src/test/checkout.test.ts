// @vitest-environment node
import { describe, expect, it } from "vitest";

import { seedProducts } from "@/server/seed";
import {
  FLAT_SHIPPING,
  validateCheckout,
  type CheckoutCustomer,
  type CheckoutItem,
} from "@/lib/checkout";

const customer: CheckoutCustomer = {
  name: "Amina Vale",
  email: "amina@example.com",
  phone: "+1 555 0100",
  address: "12 Track Lane",
  city: "Portland",
  postalCode: "97201",
  country: "United States",
};

const validate = (items: CheckoutItem[]) => validateCheckout({ customer, items }, seedProducts);

describe("checkout validation", () => {
  it("prices two chew toys with flat shipping", () => {
    const result = validate([
      { productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 2 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.unitPrice).toBe(9.99);
    expect(result.totals).toEqual({
      subtotal: 19.98,
      shipping: FLAT_SHIPPING,
      discount: 0,
      total: 69.98,
    });
  });

  it("adds flat shipping below the threshold", () => {
    const result = validate([
      { productId: "organic-cat-treats-salmon-n6d5", size: "One Size", quantity: 1 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals).toEqual({
      subtotal: 7.99,
      shipping: FLAT_SHIPPING,
      discount: 0,
      total: 57.99,
    });
  });

  it("rejects an empty cart", () => {
    const result = validate([]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({ field: "items", message: "Add at least one piece." });
  });

  it("rejects an unknown product on its line", () => {
    const result = validate([{ productId: "ghost-99", size: "One Size", quantity: 1 }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.field).toBe("items.0.productId");
  });

  it("rejects an unsupported size", () => {
    const result = validate([
      { productId: "dog-chew-toy-beef-bone-9sl2", size: "XXL", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.field).toBe("items.0.size");
  });

  it("rejects quantities outside 1-10", () => {
    for (const quantity of [0, 11, 1.5]) {
      const result = validate([
        { productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity },
      ]);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.errors[0]?.field).toBe("items.0.quantity");
    }
  });

  it("rejects more than twenty lines", () => {
    const items = Array.from({ length: 21 }, () => ({
      productId: "dog-chew-toy-beef-bone-9sl2",
      size: "One Size",
      quantity: 1,
    }));

    const result = validate(items);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.field === "items")).toBe(true);
  });

  it("rejects a malformed email and a missing name", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, email: "not-an-email", name: "   " },
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["email", "name"]),
    );
  });

  it("ignores any client-supplied price and trims customer fields", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, name: "  Amina Vale  " },
        items: [
          {
            productId: "squeaky-plush-toy-set-3-pack-qa0h",
            size: "One Size",
            quantity: 1,
            unitPrice: 0.01,
          } as never,
        ],
      },
      seedProducts,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.customer.name).toBe("Amina Vale");
    expect(result.lines[0]?.unitPrice).toBe(16.99);
    expect(result.totals.total).toBe(66.99);
  });

  it("rejects non-text customer values", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, name: {} as never, notes: [] as never },
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["name", "notes"]),
    );
  });

  it("rejects overlong delivery values", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, name: "x".repeat(201), notes: "y".repeat(1001) },
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["name", "notes"]),
    );
  });

  it("accepts exactly twenty lines and rejects twenty-one", () => {
    const makeItems = (count: number) =>
      Array.from({ length: count }, () => ({
        productId: "organic-cat-treats-salmon-n6d5",
        size: "One Size",
        quantity: 1,
      }));

    expect(validate(makeItems(20)).ok).toBe(true);
    expect(validate(makeItems(21)).ok).toBe(false);
  });

  it("rejects non-string size and quantity values", () => {
    const result = validateCheckout(
      {
        customer,
        items: [
          {
            productId: "dog-chew-toy-beef-bone-9sl2",
            size: ["M"] as never,
            quantity: "2" as never,
          },
        ],
      },
      seedProducts,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["items.0.size", "items.0.quantity"]),
    );
  });

  it("handles a null payload without throwing", () => {
    const result = validateCheckout(null as never, seedProducts);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.field === "items")).toBe(true);
  });

  it("uses a delivery zone fee for a matching city", () => {
    const result = validateCheckout(
      {
        customer,
        items: [{ productId: "organic-cat-treats-salmon-n6d5", size: "One Size", quantity: 1 }],
      },
      seedProducts,
      {
        shipping: {
          flatRate: 12,
          freeThreshold: 150,
          zones: [{ city: "Portland", fee: 30 }],
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.shipping).toBe(30);
    expect(result.totals.total).toBe(37.99);
  });

  it("falls back to the flat rate for a city without a zone", () => {
    const result = validateCheckout(
      {
        customer,
        items: [{ productId: "organic-cat-treats-salmon-n6d5", size: "One Size", quantity: 1 }],
      },
      seedProducts,
      {
        shipping: {
          flatRate: 12,
          freeThreshold: 150,
          zones: [{ city: "Casablanca", fee: 30 }],
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.shipping).toBe(12);
  });

  it("lets a zone override the free-delivery threshold", () => {
    const result = validateCheckout(
      {
        customer,
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
      {
        shipping: {
          flatRate: 12,
          freeThreshold: 150,
          zones: [{ city: "Portland", fee: 30, freeThreshold: 200 }],
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.subtotal).toBe(9.99);
    expect(result.totals.shipping).toBe(30);
  });

  it("rejects an order below the minimum", () => {
    const result = validateCheckout(
      {
        customer,
        items: [{ productId: "organic-cat-treats-salmon-n6d5", size: "One Size", quantity: 1 }],
      },
      seedProducts,
      { shipping: { flatRate: 12, freeThreshold: 150, minOrder: 200 } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({ field: "items", message: "Minimum order is 200." });
  });

  it("rejects a phone number that is too short", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, phone: "123" },
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toContain("phone");
  });

  it("accepts a local phone number with spaces and punctuation", () => {
    const result = validateCheckout(
      {
        customer: { ...customer, phone: "06 12-34-56-78" },
        items: [{ productId: "dog-chew-toy-beef-bone-9sl2", size: "One Size", quantity: 1 }],
      },
      seedProducts,
    );

    expect(result.ok).toBe(true);
  });
});
