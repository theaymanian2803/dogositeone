// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";

import { createCustomer, createOwner } from "@/server/auth";
import {
  checkCoupon,
  createCoupon,
  createReview,
  listReviews,
  listWishlist,
  toggleWishlist,
  updateCustomerRole,
} from "@/server/commerce";
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

describe("coupons", () => {
  it("applies a percentage discount", async () => {
    const db = makeDb();
    await createCoupon(db, { code: "welcome10", type: "percentage", value: 10 });

    const result = await checkCoupon(db, "WELCOME10", 200);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discount).toBe(20);
    expect(result.coupon.code).toBe("WELCOME10");
  });

  it("applies a fixed discount without exceeding the subtotal", async () => {
    const db = makeDb();
    await createCoupon(db, { code: "BIG", type: "fixed", value: 500 });

    const result = await checkCoupon(db, "BIG", 120);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discount).toBe(120);
  });

  it("rejects below the minimum, expired and unknown codes", async () => {
    const db = makeDb();
    await createCoupon(db, { code: "MIN50", type: "fixed", value: 10, minOrder: 50 });
    await createCoupon(db, {
      code: "OLD",
      type: "fixed",
      value: 10,
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    const below = await checkCoupon(db, "MIN50", 20);
    expect(below.ok).toBe(false);
    const expired = await checkCoupon(db, "OLD", 100);
    expect(expired.ok).toBe(false);
    const missing = await checkCoupon(db, "NOPE", 100);
    expect(missing.ok).toBe(false);
  });
});

describe("reviews", () => {
  it("hides pending reviews from the public list", async () => {
    const db = makeDb();
    await createReview(db, {
      productId: "dog-chew-toy-beef-bone-9sl2",
      authorName: "Amina",
      rating: 5,
      title: "Great set",
      body: "Fits well.",
      status: "pending",
    });
    await createReview(db, {
      productId: "dog-chew-toy-beef-bone-9sl2",
      authorName: "Noah",
      rating: 4,
      status: "approved",
    });

    expect(await listReviews(db, { productId: "dog-chew-toy-beef-bone-9sl2" })).toHaveLength(2);
    expect(
      await listReviews(db, { productId: "dog-chew-toy-beef-bone-9sl2", approvedOnly: true }),
    ).toHaveLength(1);
  });
});

describe("customers", () => {
  it("toggles a wishlist item on and off", async () => {
    const db = makeDb();
    const customer = await createCustomer(db, {
      email: "wish@pace.test",
      password: "wishlist-pass",
    });

    expect(await toggleWishlist(db, customer.id, "dog-chew-toy-beef-bone-9sl2")).toBe(true);
    expect(await listWishlist(db, customer.id)).toEqual(["dog-chew-toy-beef-bone-9sl2"]);
    expect(await toggleWishlist(db, customer.id, "dog-chew-toy-beef-bone-9sl2")).toBe(false);
    expect(await listWishlist(db, customer.id)).toEqual([]);
  });

  it("refuses to remove the last admin role", async () => {
    const db = makeDb();
    const owner = await createOwner(db, {
      email: "last-admin@pace.test",
      password: "a-strong-password",
    });

    await expect(updateCustomerRole(db, owner.id, "customer")).rejects.toThrow(/one admin/i);
  });
});
