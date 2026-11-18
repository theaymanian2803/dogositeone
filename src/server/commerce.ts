import type { Client } from "@libsql/client";

import type {
  Coupon,
  CouponInput,
  CouponType,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  Review,
  ReviewStatus,
} from "@/lib/commerce";
import { ORDER_STATUSES } from "@/lib/commerce";
import { ensureDatabase } from "./db";

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string | null;
  subtotal: number;
  shipping: number;
  discount: number | null;
  total: number;
  coupon_code: string | null;
  currency: string;
  status: string;
  created_at: string;
};

function mapOrder(row: OrderRow): Order {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    userId: row.user_id ? String(row.user_id) : null,
    customerName: String(row.customer_name),
    email: String(row.email),
    phone: String(row.phone),
    address: String(row.address),
    city: String(row.city),
    postalCode: String(row.postal_code),
    country: String(row.country),
    notes: row.notes ? String(row.notes) : null,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    discount: Number(row.discount ?? 0),
    total: Number(row.total),
    couponCode: row.coupon_code ? String(row.coupon_code) : null,
    currency: String(row.currency ?? "MAD"),
    status: String(row.status) as OrderStatus,
    createdAt: String(row.created_at),
    items: [],
  };
}

async function attachItems(client: Client, orders: Order[]): Promise<Order[]> {
  if (orders.length === 0) return orders;
  const placeholders = orders.map(() => "?").join(", ");
  const result = await client.execute({
    sql: `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY name`,
    args: orders.map((order) => order.id),
  });

  const byOrder = new Map<string, OrderItem[]>();
  for (const row of result.rows) {
    const orderId = String(row["order_id"]);
    const item: OrderItem = {
      id: String(row["id"]),
      productId: String(row["product_id"]),
      name: String(row["name"]),
      size: String(row["size"]),
      unitPrice: Number(row["unit_price"]),
      quantity: Number(row["quantity"]),
      lineTotal: Number(row["line_total"]),
    };
    byOrder.set(orderId, [...(byOrder.get(orderId) ?? []), item]);
  }

  return orders.map((order) => ({ ...order, items: byOrder.get(order.id) ?? [] }));
}

export async function listOrders(
  client: Client,
  options: { limit?: number } = {},
): Promise<Order[]> {
  await ensureDatabase(client);
  const limit = options.limit ?? 100;
  const result = await client.execute({
    sql: `SELECT * FROM orders ORDER BY created_at DESC LIMIT ${Math.max(1, Math.min(limit, 500))}`,
    args: [],
  });
  const orders = result.rows.map((row) => mapOrder(row as unknown as OrderRow));
  return attachItems(client, orders);
}

export async function getOrder(client: Client, id: string): Promise<Order | null> {
  const result = await client.execute({ sql: "SELECT * FROM orders WHERE id = ?", args: [id] });
  const row = result.rows[0];
  if (!row) return null;
  const [order] = await attachItems(client, [mapOrder(row as unknown as OrderRow)]);
  return order ?? null;
}

export async function updateOrderStatus(
  client: Client,
  id: string,
  status: OrderStatus,
): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new Error("Unknown order status.");
  await client.execute({ sql: "UPDATE orders SET status = ? WHERE id = ?", args: [status, id] });
}

export async function listCustomerOrders(client: Client, userId: string): Promise<Order[]> {
  const result = await client.execute({
    sql: "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  const orders = result.rows.map((row) => mapOrder(row as unknown as OrderRow));
  return attachItems(client, orders);
}

/* Reviews ----------------------------------------------------------- */

type ReviewRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

function mapReview(row: ReviewRow): Review {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    ...(row.product_name ? { productName: String(row.product_name) } : {}),
    userId: row.user_id ? String(row.user_id) : null,
    authorName: String(row.author_name),
    rating: Number(row.rating),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    status: String(row.status) as ReviewStatus,
    createdAt: String(row.created_at),
  };
}

export async function listReviews(
  client: Client,
  options: { productId?: string; approvedOnly?: boolean } = {},
): Promise<Review[]> {
  await ensureDatabase(client);
  const where: string[] = [];
  const args: Array<string | number | null> = [];
  if (options.productId) {
    where.push("r.product_id = ?");
    args.push(options.productId);
  }
  if (options.approvedOnly) where.push("r.status = 'approved'");

  const result = await client.execute({
    sql: `SELECT r.*, p.name AS product_name FROM reviews r
          LEFT JOIN products p ON p.id = r.product_id
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY r.created_at DESC`,
    args,
  });
  return result.rows.map((row) => mapReview(row as unknown as ReviewRow));
}

export async function createReview(
  client: Client,
  input: {
    productId: string;
    authorName: string;
    rating: number;
    title?: string;
    body?: string;
    imageUrl?: string | null;
    userId?: string | null;
    status?: ReviewStatus;
  },
): Promise<Review> {
  await ensureDatabase(client);
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Choose a rating from 1 to 5.");
  }
  if (!input.authorName?.trim()) throw new Error("A name is required.");
  if (!input.productId) throw new Error("A product is required.");

  const product = await client.execute({
    sql: "SELECT 1 FROM products WHERE id = ?",
    args: [input.productId],
  });
  if (!product.rows[0]) throw new Error("Product not found.");

  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO reviews (id, product_id, user_id, author_name, rating, title, body, image_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.productId,
      input.userId ?? null,
      input.authorName.trim().slice(0, 80),
      rating,
      (input.title ?? "").trim().slice(0, 120) || null,
      (input.body ?? "").trim().slice(0, 2000) || null,
      input.imageUrl || null,
      input.status ?? "pending",
    ],
  });

  const created = await client.execute({
    sql: `SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.id = ?`,
    args: [id],
  });
  return mapReview(created.rows[0] as unknown as ReviewRow);
}

export async function updateReviewStatus(
  client: Client,
  id: string,
  status: ReviewStatus,
): Promise<void> {
  if (status !== "pending" && status !== "approved") throw new Error("Unknown review status.");
  await client.execute({ sql: "UPDATE reviews SET status = ? WHERE id = ?", args: [status, id] });
}

export async function deleteReview(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM reviews WHERE id = ?", args: [id] });
}

/* Coupons ----------------------------------------------------------- */

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  active: number;
  expires_at: string | null;
};

function mapCoupon(row: CouponRow): Coupon {
  return {
    id: String(row.id),
    code: String(row.code),
    type: String(row.type) as CouponType,
    value: Number(row.value),
    minOrder: Number(row.min_order ?? 0),
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count ?? 0),
    active: Number(row.active) === 1,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function listCoupons(client: Client): Promise<Coupon[]> {
  await ensureDatabase(client);
  const result = await client.execute("SELECT * FROM coupons ORDER BY created_at DESC");
  return result.rows.map((row) => mapCoupon(row as unknown as CouponRow));
}

function validateCoupon(input: CouponInput) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new Error("Codes use 3–32 letters, numbers, dashes or underscores.");
  }
  if (input.type !== "percentage" && input.type !== "fixed")
    throw new Error("Unknown discount type.");
  if (!Number.isFinite(input.value) || input.value <= 0) throw new Error("Enter a discount value.");
  if (input.type === "percentage" && input.value > 100) {
    throw new Error("A percentage discount cannot exceed 100%.");
  }
  return code;
}

export async function createCoupon(client: Client, input: CouponInput): Promise<void> {
  await ensureDatabase(client);
  const code = validateCoupon(input);
  await client.execute({
    sql: `INSERT INTO coupons (id, code, type, value, min_order, max_uses, active, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      code,
      input.type,
      input.value,
      input.minOrder ?? 0,
      input.maxUses ?? null,
      input.active === false ? 0 : 1,
      input.expiresAt || null,
    ],
  });
}

export async function updateCoupon(client: Client, id: string, input: CouponInput): Promise<void> {
  const code = validateCoupon(input);
  await client.execute({
    sql: `UPDATE coupons SET code = ?, type = ?, value = ?, min_order = ?, max_uses = ?,
          active = ?, expires_at = ? WHERE id = ?`,
    args: [
      code,
      input.type,
      input.value,
      input.minOrder ?? 0,
      input.maxUses ?? null,
      input.active === false ? 0 : 1,
      input.expiresAt || null,
      id,
    ],
  });
}

export async function deleteCoupon(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM coupons WHERE id = ?", args: [id] });
}

export type CouponCheck =
  { ok: true; coupon: Coupon; discount: number } | { ok: false; message: string };

export async function checkCoupon(
  client: Client,
  code: string,
  subtotal: number,
): Promise<CouponCheck> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, message: "Enter a code." };

  const result = await client.execute({
    sql: "SELECT * FROM coupons WHERE code = ? COLLATE NOCASE",
    args: [clean],
  });
  const row = result.rows[0];
  if (!row) return { ok: false, message: "That code is not valid." };

  const coupon = mapCoupon(row as unknown as CouponRow);
  if (!coupon.active) return { ok: false, message: "That code is no longer active." };
  if (coupon.expiresAt && coupon.expiresAt < new Date().toISOString()) {
    return { ok: false, message: "That code has expired." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: "That code has reached its limit." };
  }
  if (subtotal < coupon.minOrder) {
    return { ok: false, message: `Spend $${coupon.minOrder.toFixed(2)} to use this code.` };
  }

  const raw = coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;
  const discount = Math.round(Math.min(raw, subtotal) * 100) / 100;
  return { ok: true, coupon, discount };
}

export async function redeemCoupon(client: Client, id: string): Promise<void> {
  await client.execute({
    sql: "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
    args: [id],
  });
}

/* Customers --------------------------------------------------------- */

export async function listCustomers(client: Client): Promise<Customer[]> {
  await ensureDatabase(client);
  const result = await client.execute(`
    SELECT u.id, u.email, u.name, u.created_at,
      COALESCE(ur.role, 'customer') AS role,
      COUNT(o.id) AS order_count,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS order_total
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return result.rows.map((row) => ({
    id: String(row["id"]),
    email: String(row["email"]),
    name: String(row["name"] ?? ""),
    role: String(row["role"] ?? "customer") as Customer["role"],
    createdAt: String(row["created_at"]),
    orderCount: Number(row["order_count"] ?? 0),
    orderTotal: Number(row["order_total"] ?? 0),
  }));
}

export async function updateCustomerRole(
  client: Client,
  userId: string,
  role: "admin" | "moderator" | "customer",
): Promise<void> {
  if (role !== "admin" && role !== "moderator" && role !== "customer") {
    throw new Error("Unknown role.");
  }
  const admins = await client.execute(
    "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'",
  );
  const isAdmin = await client.execute({
    sql: "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
    args: [userId],
  });
  if (role !== "admin" && isAdmin.rows[0] && Number(admins.rows[0]?.["count"] ?? 0) <= 1) {
    throw new Error("Keep at least one admin account.");
  }

  await client.batch(
    [
      { sql: "DELETE FROM user_roles WHERE user_id = ?", args: [userId] },
      {
        sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
        args: [crypto.randomUUID(), userId, role],
      },
    ],
    "write",
  );
}

export async function deleteCustomer(client: Client, userId: string): Promise<void> {
  const admins = await client.execute(
    "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'",
  );
  const isAdmin = await client.execute({
    sql: "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
    args: [userId],
  });
  if (isAdmin.rows[0] && Number(admins.rows[0]?.["count"] ?? 0) <= 1) {
    throw new Error("Keep at least one admin account.");
  }
  await client.batch(
    [
      { sql: "DELETE FROM wishlist WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM sessions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM user_roles WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM profiles WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM users WHERE id = ?", args: [userId] },
    ],
    "write",
  );
}

/* Wishlist ---------------------------------------------------------- */

export async function listWishlist(client: Client, userId: string): Promise<string[]> {
  const result = await client.execute({
    sql: "SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((row) => String(row["product_id"]));
}

export async function toggleWishlist(
  client: Client,
  userId: string,
  productId: string,
): Promise<boolean> {
  const existing = await client.execute({
    sql: "SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?",
    args: [userId, productId],
  });
  if (existing.rows[0]) {
    await client.execute({
      sql: "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?",
      args: [userId, productId],
    });
    return false;
  }
  await client.execute({
    sql: "INSERT INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)",
    args: [crypto.randomUUID(), userId, productId],
  });
  return true;
}
