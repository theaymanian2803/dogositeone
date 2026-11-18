import type { Client } from "@libsql/client";

import type { Product } from "@/lib/storefront";
import { ensureDatabase, getDb } from "./db";
import { seedProducts } from "./seed";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  color: string;
  price: number;
  original_price: number | null;
  image: string;
  category: string;
  brand: string | null;
  badge: string | null;
  tagline: string;
  description: string;
  fabric: string;
  composition: string;
  care: string;
  fit: string;
  model_note: string;
  features: string;
  images: string | null;
  stock: number | null;
  active: number;
  sort_order: number;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function mapProductRow(row: ProductRow): Product {
  const originalPrice = toOptionalNumber(row.original_price);
  const brand = row.brand ? String(row.brand) : "";
  const stock = toOptionalNumber(row.stock);
  const images = toStringArray(row.images);

  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    price: Number(row.price),
    image: String(row.image),
    category: String(row.category) as Product["category"],
    ...(row.badge ? { badge: String(row.badge) } : {}),
    ...(originalPrice !== undefined ? { originalPrice } : {}),
    ...(brand ? { brand } : {}),
    ...(stock !== undefined ? { stock } : {}),
    ...(images.length > 0 ? { images } : {}),
    tagline: String(row.tagline),
    description: String(row.description),
    fabric: String(row.fabric),
    composition: toStringArray(row.composition),
    care: toStringArray(row.care),
    fit: String(row.fit),
    modelNote: String(row.model_note),
    features: toStringArray(row.features),
  };
}

export async function readProducts(client: Client): Promise<Product[]> {
  const result = await client.execute(
    "SELECT * FROM products WHERE active = 1 ORDER BY sort_order, name",
  );
  return result.rows.map((row) => mapProductRow(row as unknown as ProductRow));
}

export async function readProduct(client: Client, id: string): Promise<Product | null> {
  const result = await client.execute({
    sql: "SELECT * FROM products WHERE id = ? AND active = 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapProductRow(row as unknown as ProductRow) : null;
}

export async function listProducts(options: { client?: Client } = {}): Promise<Product[]> {
  try {
    const client = options.client ?? (await getDb());
    await ensureDatabase(client);
    return await readProducts(client);
  } catch (error) {
    console.error("[catalog] database unavailable, using seed catalog", error);
    return seedProducts;
  }
}

export async function getProductDetail(
  id: string,
  options: { client?: Client } = {},
): Promise<Product | null> {
  try {
    const client = options.client ?? (await getDb());
    await ensureDatabase(client);
    return await readProduct(client, id);
  } catch (error) {
    console.error("[catalog] database unavailable, using seed product", error);
    return seedProducts.find((product) => product.id === id) ?? null;
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export type ProductInput = {
  name: string;
  color: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  category: string;
  brand?: string;
  badge?: string | null;
  tagline: string;
  description: string;
  fabric: string;
  composition: string[];
  care: string[];
  fit: string;
  modelNote: string;
  features: string[];
  images?: string[];
  stock?: number;
  active?: boolean;
  sortOrder?: number;
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validateProduct(input: ProductInput) {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push("Name is required.");
  if (!input.color?.trim()) errors.push("Colour is required.");
  if (!Number.isFinite(input.price) || input.price < 0) errors.push("A valid price is required.");
  if (!input.image?.trim()) errors.push("Image is required.");
  if (!input.category?.trim()) errors.push("Category is required.");
  if (!input.tagline?.trim()) errors.push("Tagline is required.");
  if (!input.description?.trim()) errors.push("Description is required.");
  if (errors.length > 0) throw new Error(errors.join(" "));
}

async function uniqueSlug(client: Client, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || `piece-${Date.now().toString(36)}`;
  let candidate = root;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await client.execute({
      sql: "SELECT id FROM products WHERE slug = ?",
      args: [candidate],
    });
    const existing = result.rows[0]?.["id"];
    if (!existing || existing === ignoreId) return candidate;
    candidate = `${root}-${attempt + 2}`;
  }
  return `${root}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function listAllProducts(client: Client): Promise<Product[]> {
  await ensureDatabase(client);
  const result = await client.execute("SELECT * FROM products ORDER BY sort_order, name");
  return result.rows.map((row) => mapProductRow(row as unknown as ProductRow));
}

export async function createProduct(client: Client, input: ProductInput): Promise<Product> {
  validateProduct(input);
  await ensureDatabase(client);
  const id = `${slugify(input.name)}-${crypto.randomUUID().slice(0, 6)}`;
  const slug = await uniqueSlug(client, input.name);

  await client.execute({
    sql: `INSERT INTO products (
      id, slug, name, color, price, original_price, image, category, brand, badge,
      tagline, description, fabric, composition, care, fit, model_note, features,
      images, stock, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      slug,
      input.name.trim(),
      input.color.trim(),
      input.price,
      input.originalPrice ?? null,
      input.image.trim(),
      input.category.trim(),
      (input.brand ?? "PetPals").trim(),
      input.badge ?? null,
      input.tagline.trim(),
      input.description.trim(),
      input.fabric.trim(),
      JSON.stringify(input.composition ?? []),
      JSON.stringify(input.care ?? []),
      input.fit.trim(),
      input.modelNote.trim(),
      JSON.stringify(input.features ?? []),
      JSON.stringify(input.images ?? []),
      input.stock ?? 0,
      input.active === false ? 0 : 1,
      input.sortOrder ?? 0,
    ],
  });

  const created = await readProduct(client, id);
  if (!created) throw new Error("Could not load the new product.");
  return created;
}

export async function updateProduct(
  client: Client,
  id: string,
  input: ProductInput,
): Promise<Product> {
  validateProduct(input);
  await ensureDatabase(client);
  const existing = await client.execute({
    sql: "SELECT id FROM products WHERE id = ?",
    args: [id],
  });
  if (!existing.rows[0]) throw new Error("Product not found.");
  const slug = await uniqueSlug(client, input.name, id);

  await client.execute({
    sql: `UPDATE products SET
      slug = ?, name = ?, color = ?, price = ?, original_price = ?, image = ?, category = ?,
      brand = ?, badge = ?, tagline = ?, description = ?, fabric = ?, composition = ?, care = ?,
      fit = ?, model_note = ?, features = ?, images = ?, stock = ?, active = ?, sort_order = ?
      WHERE id = ?`,
    args: [
      slug,
      input.name.trim(),
      input.color.trim(),
      input.price,
      input.originalPrice ?? null,
      input.image.trim(),
      input.category.trim(),
      (input.brand ?? "PetPals").trim(),
      input.badge ?? null,
      input.tagline.trim(),
      input.description.trim(),
      input.fabric.trim(),
      JSON.stringify(input.composition ?? []),
      JSON.stringify(input.care ?? []),
      input.fit.trim(),
      input.modelNote.trim(),
      JSON.stringify(input.features ?? []),
      JSON.stringify(input.images ?? []),
      input.stock ?? 0,
      input.active === false ? 0 : 1,
      input.sortOrder ?? 0,
      id,
    ],
  });

  const updated = await client.execute({
    sql: "SELECT * FROM products WHERE id = ?",
    args: [id],
  });
  const row = updated.rows[0];
  if (!row) throw new Error("Could not load the updated product.");
  return mapProductRow(row as unknown as ProductRow);
}

export async function deleteProduct(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
}

/* Categories + brands ------------------------------------------------ */

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount?: number;
};
export type Brand = { id: string; name: string; logoUrl: string | null; productCount?: number };

export async function listCategories(client: Client): Promise<Category[]> {
  await ensureDatabase(client);
  const result = await client.execute(
    `SELECT c.id, c.name, c.slug, c.image, COUNT(p.id) AS product_count
     FROM categories c LEFT JOIN products p ON p.category = c.slug AND p.active = 1
     GROUP BY c.id ORDER BY c.name`,
  );
  return result.rows.map((row) => ({
    id: String(row["id"]),
    name: String(row["name"]),
    slug: String(row["slug"]),
    image: row["image"] ? String(row["image"]) : null,
    productCount: Number(row["product_count"] ?? 0),
  }));
}

export async function createCategory(
  client: Client,
  input: { name: string; image?: string | null },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  await ensureDatabase(client);
  const slug = slugify(name);
  await client.execute({
    sql: "INSERT INTO categories (id, name, slug, image) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), name, slug, input.image || null],
  });
}

export async function updateCategory(
  client: Client,
  id: string,
  input: { name: string; image?: string | null },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  await client.execute({
    sql: "UPDATE categories SET name = ?, slug = ?, image = ? WHERE id = ?",
    args: [name, slugify(name), input.image || null, id],
  });
}

export async function deleteCategory(client: Client, id: string): Promise<void> {
  const usage = await client.execute({
    sql: "SELECT 1 FROM products p JOIN categories c ON c.slug = p.category WHERE c.id = ? LIMIT 1",
    args: [id],
  });
  if (usage.rows.length > 0) throw new Error("Move the products in this category first.");
  await client.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [id] });
}

export async function listBrands(client: Client): Promise<Brand[]> {
  await ensureDatabase(client);
  const result = await client.execute(
    `SELECT b.id, b.name, b.logo_url, COUNT(p.id) AS product_count
     FROM brands b LEFT JOIN products p ON p.brand = b.name AND p.active = 1
     GROUP BY b.id ORDER BY b.name`,
  );
  return result.rows.map((row) => ({
    id: String(row["id"]),
    name: String(row["name"]),
    logoUrl: row["logo_url"] ? String(row["logo_url"]) : null,
    productCount: Number(row["product_count"] ?? 0),
  }));
}

export async function createBrand(
  client: Client,
  input: { name: string; logoUrl?: string | null },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Brand name is required.");
  await ensureDatabase(client);
  await client.execute({
    sql: "INSERT INTO brands (id, name, logo_url) VALUES (?, ?, ?)",
    args: [crypto.randomUUID(), name, input.logoUrl || null],
  });
}

export async function updateBrand(
  client: Client,
  id: string,
  input: { name: string; logoUrl?: string | null },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Brand name is required.");
  await client.execute({
    sql: "UPDATE brands SET name = ?, logo_url = ? WHERE id = ?",
    args: [name, input.logoUrl || null, id],
  });
}

export async function deleteBrand(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM brands WHERE id = ?", args: [id] });
}
