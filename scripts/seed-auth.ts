import { createClient } from "@libsql/client";

const url = process.env.VITE_TURSO_DB_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing VITE_TURSO_DB_URL or VITE_TURSO_AUTH_TOKEN — make sure .env is present");
  process.exit(1);
}

const turso = createClient({ url, authToken });

async function seed() {
  console.log("Ensuring admins table exists...");
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id       TEXT PRIMARY KEY,
      email    TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  console.log("Ensuring users table exists...");
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id       TEXT PRIMARY KEY,
      email    TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name     TEXT NOT NULL
    )
  `);

  console.log("Ensuring reviews table exists...");
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id    TEXT,
      user_name  TEXT NOT NULL,
      rating     INTEGER NOT NULL,
      title      TEXT,
      body       TEXT NOT NULL,
      image_url  TEXT,
      status     TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Ensuring settings table exists...");
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const adminEmail = "sberechou@gmail.com";
  const adminPassword = "admin123";

  const existing = await turso.execute({
    sql: "SELECT id FROM admins WHERE email = ?",
    args: [adminEmail],
  });

  if (existing.rows.length === 0) {
    await turso.execute({
      sql: "INSERT INTO admins (id, email, password) VALUES (?, ?, ?)",
      args: [crypto.randomUUID(), adminEmail, adminPassword],
    });
    console.log(`  ✓ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`  - Admin already exists: ${adminEmail}`);
  }

  console.log("\nDone.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
