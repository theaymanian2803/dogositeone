import type { Client } from "@libsql/client";

import type {
  JsonValue,
  PageBlock,
  PageContent,
  PageLayout,
  PageSection,
  SectionType,
} from "@/lib/cms";
import {
  cleanPageBlocks,
  cleanPageLayout,
  cleanSectionStyle,
  pageBodyFromBlocks,
  pageContentFromStored,
  withSectionStyle,
} from "@/lib/cms";
import { ensureDatabase } from "./db";

type SectionRow = {
  id: string;
  section_key: string;
  type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  visible: number;
  sort_order: number;
  config: string;
};

function parseConfig(value: unknown): Record<string, JsonValue> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, JsonValue>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Persists only recognised style tokens. The admin writes `config.style`, and
 * this guard keeps any hand-edited JSON from injecting arbitrary CSS.
 */
function serializeConfig(config: Record<string, JsonValue> | undefined): string {
  const base = { ...(config ?? {}) };
  if (!("style" in base)) return JSON.stringify(base);
  return JSON.stringify(withSectionStyle(base, cleanSectionStyle(base["style"])));
}

function mapSection(row: SectionRow): PageSection {
  return {
    id: String(row.id),
    key: String(row.section_key),
    type: String(row.type) as SectionType,
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    imageUrl: String(row.image_url ?? ""),
    visible: Number(row.visible) === 1,
    sortOrder: Number(row.sort_order ?? 0),
    config: parseConfig(row.config),
  };
}

export async function listSections(
  client: Client,
  options: { visibleOnly?: boolean } = {},
): Promise<PageSection[]> {
  await ensureDatabase(client);
  const result = await client.execute(
    `SELECT * FROM landing_sections ${options.visibleOnly ? "WHERE visible = 1" : ""}
     ORDER BY sort_order, created_at`,
  );
  return result.rows.map((row) => mapSection(row as unknown as SectionRow));
}

export async function getSection(client: Client, id: string): Promise<PageSection | null> {
  const result = await client.execute({
    sql: "SELECT * FROM landing_sections WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapSection(row as unknown as SectionRow) : null;
}

export type SectionInput = {
  type: SectionType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  visible?: boolean;
  sortOrder?: number;
  config?: Record<string, JsonValue>;
};

export async function createSection(client: Client, input: SectionInput): Promise<PageSection> {
  await ensureDatabase(client);
  const id = crypto.randomUUID();
  const key = `${input.type}_${Date.now().toString(36)}`;
  const max = await client.execute(
    "SELECT COALESCE(MAX(sort_order), -1) AS max FROM landing_sections",
  );
  const sortOrder = input.sortOrder ?? Number(max.rows[0]?.["max"] ?? -1) + 1;

  await client.execute({
    sql: `INSERT INTO landing_sections
      (id, section_key, type, title, subtitle, image_url, visible, sort_order, config, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [
      id,
      key,
      input.type,
      input.title.trim(),
      (input.subtitle ?? "").trim(),
      (input.imageUrl ?? "").trim(),
      input.visible === false ? 0 : 1,
      sortOrder,
      serializeConfig(input.config),
    ],
  });

  const created = await getSection(client, id);
  if (!created) throw new Error("Could not load the new section.");
  return created;
}

export async function updateSection(
  client: Client,
  id: string,
  input: SectionInput,
): Promise<PageSection> {
  await client.execute({
    sql: `UPDATE landing_sections SET
      type = ?, title = ?, subtitle = ?, image_url = ?, visible = ?, sort_order = ?,
      config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    args: [
      input.type,
      input.title.trim(),
      (input.subtitle ?? "").trim(),
      (input.imageUrl ?? "").trim(),
      input.visible === false ? 0 : 1,
      input.sortOrder ?? 0,
      serializeConfig(input.config),
      id,
    ],
  });
  const updated = await getSection(client, id);
  if (!updated) throw new Error("Section not found.");
  return updated;
}

export async function deleteSection(client: Client, id: string): Promise<void> {
  await client.execute({ sql: "DELETE FROM landing_sections WHERE id = ?", args: [id] });
}

export async function moveSection(
  client: Client,
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const sections = await listSections(client);
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sections.length) return;

  const current = sections[index]!;
  const neighbour = sections[swapWith]!;
  await client.batch(
    [
      {
        sql: "UPDATE landing_sections SET sort_order = ? WHERE id = ?",
        args: [neighbour.sortOrder, current.id],
      },
      {
        sql: "UPDATE landing_sections SET sort_order = ? WHERE id = ?",
        args: [current.sortOrder, neighbour.id],
      },
    ],
    "write",
  );
}

/* Pages ------------------------------------------------------------- */

export async function listPages(client: Client): Promise<PageContent[]> {
  await ensureDatabase(client);
  const result = await client.execute(
    "SELECT page_key, content FROM page_content ORDER BY page_key",
  );
  return result.rows.map((row) =>
    pageContentFromStored(String(row["page_key"]), parseConfig(row["content"])),
  );
}

export async function getPage(client: Client, pageKey: string): Promise<PageContent | null> {
  const result = await client.execute({
    sql: "SELECT page_key, content FROM page_content WHERE page_key = ? AND locale = 'en'",
    args: [pageKey],
  });
  const row = result.rows[0];
  if (!row) return null;
  return pageContentFromStored(String(row["page_key"]), parseConfig(row["content"]));
}

export type PageInput = {
  title: string;
  body?: string;
  eyebrow?: string;
  heroImage?: string;
  layout?: PageLayout;
  blocks?: PageBlock[];
};

export async function updatePage(client: Client, pageKey: string, input: PageInput): Promise<void> {
  const blocks = cleanPageBlocks(input.blocks);
  const body = blocks.length > 0 ? pageBodyFromBlocks(blocks) : (input.body ?? "").trim();
  const content = JSON.stringify({
    title: input.title.trim(),
    body,
    eyebrow: (input.eyebrow ?? "").trim(),
    heroImage: (input.heroImage ?? "").trim(),
    layout: cleanPageLayout(input.layout),
    blocks,
  });
  await client.execute({
    sql: `INSERT INTO page_content (page_key, locale, content, updated_at)
          VALUES (?, 'en', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(page_key, locale) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`,
    args: [pageKey, content],
  });
}
