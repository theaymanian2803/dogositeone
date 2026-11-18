import type { Client } from "@libsql/client";

import {
  validateCheckout,
  type CheckoutCustomer,
  type CheckoutError,
  type CheckoutItem,
  type CheckoutTotals,
} from "@/lib/checkout";
import { sendOrderEmails } from "./email";
import { sendOrderWhatsAppAlert } from "./whatsapp";
import { readProducts } from "./catalog";
import { checkCoupon, redeemCoupon } from "./commerce";
import { ensureDatabase } from "./db";
import { getSettings } from "./settings";

export class CheckoutValidationError extends Error {
  readonly errors: CheckoutError[];

  constructor(errors: CheckoutError[]) {
    super("The checkout details are invalid.");
    this.name = "CheckoutValidationError";
    this.errors = errors;
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The store database is unavailable.");
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
}

const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newOrderNumber(now = Date.now()) {
  const time = Math.max(0, Math.floor(now)).toString(36).toUpperCase();
  let suffix = "";
  for (let index = 0; index < 3; index += 1) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return `PET-${time}-${suffix}`;
}

export type PlaceOrderInput = {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
  idempotencyKey?: string;
  couponCode?: string;
  userId?: string;
};

export type PlacedOrder = {
  orderNumber: string;
  totals: CheckoutTotals;
};

async function findOrderByKey(client: Client, key: string): Promise<PlacedOrder | null> {
  const result = await client.execute({
    sql: "SELECT order_number, subtotal, shipping, discount, total FROM orders WHERE idempotency_key = ?",
    args: [key],
  });
  const row = result.rows[0];
  if (!row) return null;

  return {
    orderNumber: String(row["order_number"]),
    totals: {
      subtotal: Number(row["subtotal"]),
      shipping: Number(row["shipping"]),
      discount: Number(row["discount"] ?? 0),
      total: Number(row["total"]),
    },
  };
}

export async function placeOrder(input: PlaceOrderInput, client: Client): Promise<PlacedOrder> {
  const safeInput = (input && typeof input === "object" ? input : {}) as PlaceOrderInput;
  const rawKey = safeInput.idempotencyKey;
  const idempotencyKey =
    typeof rawKey === "string" && rawKey.trim() ? rawKey.trim().slice(0, 100) : null;

  try {
    await ensureDatabase(client);
  } catch (error) {
    throw new DatabaseUnavailableError(error);
  }

  if (idempotencyKey) {
    try {
      const existing = await findOrderByKey(client, idempotencyKey);
      if (existing) return existing;
    } catch (error) {
      throw new DatabaseUnavailableError(error);
    }
  }

  let catalog;
  let settings;
  try {
    catalog = await readProducts(client);
    settings = await getSettings(client);
  } catch (error) {
    throw new DatabaseUnavailableError(error);
  }

  const shipping = settings.store_shipping;

  const base = validateCheckout(safeInput, catalog, { shipping });
  if (!base.ok) throw new CheckoutValidationError(base.errors);

  let coupon: { code: string; discount: number } | undefined;
  let couponId: string | null = null;

  const rawCoupon = safeInput.couponCode;
  if (typeof rawCoupon === "string" && rawCoupon.trim()) {
    const check = await checkCoupon(client, rawCoupon, base.totals.subtotal);
    if (!check.ok) {
      throw new CheckoutValidationError([{ field: "coupon", message: check.message }]);
    }
    coupon = { code: check.coupon.code, discount: check.discount };
    couponId = check.coupon.id;
  }

  const validation = coupon ? validateCheckout(safeInput, catalog, { shipping, coupon }) : base;
  if (!validation.ok) throw new CheckoutValidationError(validation.errors);

  const { customer, lines, totals } = validation;
  const orderId = crypto.randomUUID();
  const orderNumber = newOrderNumber();

  const orderStatement = {
    sql: `INSERT INTO orders (
      id, order_number, user_id, customer_name, email, phone, address, city, postal_code,
      country, notes, subtotal, shipping, discount, total, coupon_code, currency, status,
      idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      orderId,
      orderNumber,
      safeInput.userId ?? null,
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
      customer.city,
      customer.postalCode,
      customer.country,
      customer.notes ?? null,
      totals.subtotal,
      totals.shipping,
      totals.discount,
      totals.total,
      coupon?.code ?? null,
      shipping.currency || "MAD",
      "new",
      idempotencyKey,
    ],
  };

  const itemStatements = lines.map((line) => ({
    sql: `INSERT INTO order_items (
      id, order_id, product_id, name, size, unit_price, quantity, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      orderId,
      line.productId,
      line.name,
      line.size,
      line.unitPrice,
      line.quantity,
      line.lineTotal,
    ],
  }));

  try {
    await client.batch([orderStatement, ...itemStatements], "write");
  } catch (error) {
    if (idempotencyKey) {
      try {
        const existing = await findOrderByKey(client, idempotencyKey);
        if (existing) return existing;
      } catch (lookupError) {
        throw new DatabaseUnavailableError(lookupError);
      }
    }
    throw new DatabaseUnavailableError(error);
  }

  if (couponId) await redeemCoupon(client, couponId);

  const currency = shipping.currency || "MAD";

  await sendOrderWhatsAppAlert(
    { orderNumber, customer, lines, totals, currency },
    { ownerNumber: settings.store_whatsapp.ownerNumber },
  );

  await sendOrderEmails({
    orderNumber,
    customer,
    lines,
    totals,
    currency,
    settings,
  });

  return { orderNumber, totals };
}
