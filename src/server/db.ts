import { createClient, type Client } from "@libsql/client";

import { defaultPages, defaultSections, defaultSettings } from "./defaults";
import { hashPassword } from "./password";
import { COLUMN_MIGRATIONS, SCHEMA_SQL } from "./schema";
import { seedProducts } from "./seed";

export const DEFAULT_DB_URL = "file:.data/petpals.db";

/** User-requested default owner. Rotate before a public launch. */
export const DEFAULT_ADMIN_EMAIL = "admin@email.com";
export const DEFAULT_ADMIN_PASSWORD = "123456789";
const DEFAULT_ADMIN_NAME = "Admin";

const CONFIG_TTL = 30_000;

export function createDb(url = process.env["TURSO_DATABASE_URL"] || DEFAULT_DB_URL): Client {
  const token = process.env["TURSO_AUTH_TOKEN"];
  return createClient({
    url,
    ...(token ? { authToken: token } : {}),
  });
}

let baseClient: Client | null = null;

function getBaseClient(): Client {
  if (!baseClient) baseClient = createDb();
  return baseClient;
}

/** The bootstrap database (env config), used for runtime DB switching and grants. */
export function getBaseDb(): Client {
  return getBaseClient();
}

type DbConfig = { url: string; token: string };

let customConfig: DbConfig | null = null;
let customClient: Client | null = null;
let configFetchedAt = 0;

/** Re-reads the buyer's saved DB config from the bootstrap database (TTL cached). */
export async function refreshDbConfig(force = false): Promise<void> {
  if (!force && Date.now() - configFetchedAt < CONFIG_TTL) return;
  configFetchedAt = Date.now();

  try {
    const base = getBaseClient();
    await ensureDatabase(base);
    const result = await base.execute({
      sql: "SELECT key, value FROM settings WHERE key IN ('db_url', 'db_token')",
      args: [],
    });
    const map: Record<string, string> = {};
    for (const row of result.rows) map[String(row["key"])] = String(row["value"] ?? "");
    const next =
      map["db_url"] && map["db_token"] ? { url: map["db_url"], token: map["db_token"] } : null;
    if (next?.url !== customConfig?.url) customClient = null;
    customConfig = next;
  } catch {
    // Bootstrap unreachable: keep the current effective client.
  }
}

/** The effective database client: the buyer's configured DB if present, else env/local. */
export async function getDb(): Promise<Client> {
  await refreshDbConfig();
  if (customConfig) {
    if (!customClient) {
      customClient = createClient({ url: customConfig.url, authToken: customConfig.token });
    }
    return customClient;
  }
  return getBaseClient();
}

export async function testTursoConnection(
  url: string,
  token: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const probe = createClient({ url: url.trim(), authToken: token.trim() });
    await probe.execute("SELECT 1");
    probe.close();
    return { ok: true, message: "Connected" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Connection failed" };
  }
}

export function maskUrl(url: string): string {
  const clean = url.replace(/^libsql:\/\//, "").replace(/^file:/, "file:");
  return clean.length <= 28 ? clean : `${clean.slice(0, 28)}…`;
}

export async function readDbConfig(): Promise<{ usingCustom: boolean; url: string | null }> {
  const base = getBaseClient();
  await ensureDatabase(base);
  const result = await base.execute({
    sql: "SELECT key, value FROM settings WHERE key IN ('db_url', 'db_token')",
    args: [],
  });
  const map: Record<string, string> = {};
  for (const row of result.rows) map[String(row["key"])] = String(row["value"] ?? "");
  const usingCustom = Boolean(map["db_url"] && map["db_token"]);
  return { usingCustom, url: usingCustom ? maskUrl(map["db_url"]!) : null };
}

export async function setDbConfig(
  url: string,
  token: string,
  options: { seed?: boolean } = {},
): Promise<{ seeded: boolean }> {
  const cleanUrl = url.trim();
  const cleanToken = token.trim();
  if (!cleanUrl || !cleanToken) throw new Error("Database URL and token are required.");

  const probe = createClient({ url: cleanUrl, authToken: cleanToken });
  await probe.execute("SELECT 1");
  const seed = options.seed !== false;
  await ensureDatabase(probe, { seed });
  probe.close();

  const base = getBaseClient();
  await ensureDatabase(base);
  await base.batch(
    [
      {
        sql: "INSERT INTO settings (key, value) VALUES ('db_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [cleanUrl],
      },
      {
        sql: "INSERT INTO settings (key, value) VALUES ('db_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [cleanToken],
      },
    ],
    "write",
  );

  customConfig = { url: cleanUrl, token: cleanToken };
  customClient = null;
  configFetchedAt = Date.now();
  return { seeded: seed };
}

export async function clearDbConfig(): Promise<void> {
  const base = getBaseClient();
  await ensureDatabase(base);
  await base.execute("DELETE FROM settings WHERE key IN ('db_url', 'db_token')");
  customConfig = null;
  customClient = null;
  configFetchedAt = Date.now();
}

const initByClient = new WeakMap<Client, Promise<void>>();

/** Creates/upgrades the schema and optionally seeds the default store once per client. */
export function ensureDatabase(client: Client, options: { seed?: boolean } = {}): Promise<void> {
  const seed = options.seed !== false;
  let pending = initByClient.get(client);
  if (!pending) {
    pending = init(client, seed).catch((error) => {
      initByClient.delete(client);
      throw error;
    });
    initByClient.set(client, pending);
  }
  return pending;
}

async function init(client: Client, seed: boolean) {
  await client.batch(SCHEMA_SQL, "write");

  for (const migration of COLUMN_MIGRATIONS) {
    const info = await client.execute(`PRAGMA table_info(${migration.table})`);
    const exists = info.rows.some((row) => String(row["name"]) === migration.column);
    if (!exists) await client.execute(migration.sql);
  }

  await client.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key)",
  );

  if (!seed) return;

  await seedCatalog(client);
  await seedSettings(client);
  await seedSections(client);
  await seedPages(client);
  await seedReviews(client);
  await seedDefaultOwner(client);
}

async function seedCatalog(client: Client) {
  const insert = `INSERT OR IGNORE INTO products (
    id, slug, name, color, price, original_price, image, category, brand, badge,
    tagline, description, fabric, composition, care, fit, model_note, features,
    images, stock, active, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const statements = seedProducts.map((product, index) => ({
    sql: insert,
    args: [
      product.id,
      product.id,
      product.name,
      product.color,
      product.price,
      null,
      product.image,
      product.category,
      product.brand ?? "PetPals",
      product.badge ?? null,
      product.tagline,
      product.description,
      product.fabric,
      JSON.stringify(product.composition),
      JSON.stringify(product.care),
      product.fit,
      product.modelNote,
      JSON.stringify(product.features),
      "[]",
      25,
      1,
      index,
    ],
  }));

  if (statements.length > 0) await client.batch(statements, "write");

  const categories = [
    {
      id: "cat-dogs",
      name: "Dogs",
      slug: "dogs",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80",
    },
    {
      id: "cat-cats",
      name: "Cats",
      slug: "cats",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
    },
    { id: "cat-foods", name: "Food", slug: "foods", image: "/products/biscuit.jpg" },
    { id: "cat-groom", name: "Grooming", slug: "groom", image: "/products/groom.jpg" },
    { id: "cat-bed", name: "Beds", slug: "bed", image: "/products/bed.jpg" },
    { id: "cat-toys", name: "Toys", slug: "toys", image: "/products/bone.jpg" },
  ];
  await client.batch(
    categories.map((category) => ({
      sql: "INSERT OR IGNORE INTO categories (id, name, slug, image) VALUES (?, ?, ?, ?)",
      args: [category.id, category.name, category.slug, category.image],
    })),
    "write",
  );
  await client.execute({
    sql: "INSERT OR IGNORE INTO brands (id, name, logo_url) VALUES (?, ?, ?)",
    args: ["brand-petpals", "PetPals", null],
  });
}

async function seedReviews(client: Client) {
  const reviews = [
    {
      id: "review-petpals-1",
      productId: "organic-cat-treats-salmon-n6d5",
      author: "Amina",
      rating: 5,
      title: "My cat loves it!",
      body: "The salmon treats disappeared in minutes. Clean ingredients and a very happy cat.",
    },
    {
      id: "review-petpals-2",
      productId: "donut-cat-bed-washable-eqc3",
      author: "Yasmine B.",
      rating: 5,
      title: "Cozy and easy to wash",
      body: "My cat sleeps in it all day. It washes well and still holds its shape.",
    },
    {
      id: "review-petpals-3",
      productId: "pet-grooming-brush-deshedding-tool-3033",
      author: "Omar K.",
      rating: 5,
      title: "Great quality, fast delivery",
      body: "The deshedding brush works exactly as described. Quick delivery too.",
    },
    {
      id: "review-petpals-4",
      productId: "grain-free-puppy-food-lamb-cztm",
      author: "Salma R.",
      rating: 4,
      title: "Happy puppy",
      body: "Bought this for my puppy and she finishes every bowl. Gentle on her stomach.",
    },
  ];

  await client.batch(
    reviews.map((review) => ({
      sql: `INSERT OR IGNORE INTO reviews
        (id, product_id, user_id, author_name, rating, title, body, image_url, status, created_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, 'approved', CURRENT_TIMESTAMP)`,
      args: [review.id, review.productId, review.author, review.rating, review.title, review.body],
    })),
    "write",
  );
}

async function seedSettings(client: Client) {
  const statements = Object.entries(defaultSettings).map(([key, value]) => ({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
    args: [key, JSON.stringify(value)],
  }));
  if (statements.length > 0) await client.batch(statements, "write");
}

async function seedSections(client: Client) {
  const statements = defaultSections.map((section) => ({
    sql: `INSERT OR IGNORE INTO landing_sections
      (id, section_key, type, title, subtitle, image_url, visible, sort_order, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `sec-${section.key}`,
      section.key,
      section.type,
      section.title,
      section.subtitle,
      section.image,
      section.visible,
      section.sort,
      JSON.stringify(section.config),
    ],
  }));
  if (statements.length > 0) await client.batch(statements, "write");
}

async function seedPages(client: Client) {
  const statements = defaultPages.map((page) => ({
    sql: `INSERT OR IGNORE INTO page_content (page_key, locale, content)
      VALUES (?, 'en', ?)`,
    args: [page.key, JSON.stringify({ title: page.title, body: page.body })],
  }));
  if (statements.length > 0) await client.batch(statements, "write");
}

async function seedDefaultOwner(client: Client) {
  // Tests create disposable databases and manage their own owners.
  if (process.env["VITEST"] === "true" || process.env["NODE_ENV"] === "test") return;

  const admins = await client.execute(
    "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'",
  );
  if (Number(admins.rows[0]?.["count"] ?? 0) > 0) return;

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  await client.batch(
    [
      {
        sql: "INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        args: [userId, DEFAULT_ADMIN_EMAIL, passwordHash, DEFAULT_ADMIN_NAME],
      },
      {
        sql: `INSERT OR IGNORE INTO profiles (id, user_id, display_name, email)
          VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), userId, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL],
      },
      {
        sql: "INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
        args: [crypto.randomUUID(), userId],
      },
    ],
    "write",
  );
}
