import { THEME_FONT_FAMILIES } from "@/lib/store-settings";

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SectionType =
  | "hero"
  | "product_grid"
  | "promo"
  | "custom_banner"
  | "rich_text"
  | "categories"
  | "products"
  | "lookbook"
  | "reviews"
  | "featured_brand"
  | "brands";

export type PageSection = {
  id: string;
  key: string;
  type: SectionType;
  title: string;
  subtitle: string;
  imageUrl: string;
  visible: boolean;
  sortOrder: number;
  config: Record<string, JsonValue>;
};

export type PageLayout = "stacked" | "two_column";

export const PAGE_LAYOUTS: Array<{ value: PageLayout; label: string; hint: string }> = [
  { value: "stacked", label: "Stacked", hint: "One column, blocks one after another." },
  { value: "two_column", label: "Two columns", hint: "Blocks sit side by side on desktop." },
];

export const PAGE_BLOCK_TYPES = [
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Paragraph" },
  { value: "image", label: "Image" },
  { value: "image_text", label: "Image + text" },
  { value: "list", label: "Bullet list" },
  { value: "faq", label: "FAQ" },
  { value: "contact", label: "Contact details" },
  { value: "cta", label: "Button / link" },
  { value: "divider", label: "Divider" },
] as const;

export type PageBlockType = (typeof PAGE_BLOCK_TYPES)[number]["value"];

type BlockBase = { id: string };

export type PageBlock =
  | (BlockBase & { type: "heading"; text: string; level: 2 | 3 })
  | (BlockBase & { type: "paragraph"; text: string })
  | (BlockBase & { type: "image"; imageUrl: string; alt: string; caption: string })
  | (BlockBase & {
      type: "image_text";
      imageUrl: string;
      alt: string;
      side: "left" | "right";
      text: string;
    })
  | (BlockBase & { type: "list"; items: string[] })
  | (BlockBase & { type: "faq"; items: Array<{ question: string; answer: string }> })
  | (BlockBase & { type: "contact"; email: string; phone: string; address: string; hours: string })
  | (BlockBase & { type: "cta"; label: string; href: string })
  | (BlockBase & { type: "divider" });

export type PageContent = {
  pageKey: string;
  title: string;
  body: string;
  eyebrow: string;
  heroImage: string;
  layout: PageLayout;
  blocks: PageBlock[];
};

export const SECTION_TYPES: Array<{ value: SectionType; label: string; hint: string }> = [
  { value: "hero", label: "Hero", hint: "Headline, image, CTA and a featured piece." },
  { value: "product_grid", label: "Product grid", hint: "The filterable collection grid." },
  { value: "promo", label: "Promo banner", hint: "A full-width statement with a CTA." },
  { value: "custom_banner", label: "Custom banner", hint: "Image + text + CTA." },
  { value: "rich_text", label: "Rich text", hint: "A paragraph block, e.g. brand story." },
  { value: "categories", label: "Categories", hint: "Category tiles from the catalog." },
  { value: "products", label: "Picked products", hint: "A grid of the products you choose." },
  { value: "lookbook", label: "Lookbook", hint: "A grid of images." },
  { value: "reviews", label: "Reviews", hint: "Customer reviews you choose." },
  { value: "featured_brand", label: "Featured brand", hint: "Brand story with a CTA." },
  { value: "brands", label: "Brands", hint: "A grid of logos for the brands you pick." },
];

const IMAGE_SECTION_TYPES: SectionType[] = [
  "hero",
  "promo",
  "custom_banner",
  "lookbook",
  "featured_brand",
];

/** Section types whose renderer displays the section image. */
export function sectionUsesImage(type: SectionType): boolean {
  return IMAGE_SECTION_TYPES.includes(type);
}

/** Section id lists. `brands`/`categories`/`products`/`reviews` use these. */
function configIdList(config: Record<string, JsonValue>, key: string): string[] {
  const value = config[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** Brand ids a section points at. `brands` uses many, `featured_brand` uses one. */
export function sectionBrandIds(config: Record<string, JsonValue>): string[] {
  return configIdList(config, "brand_ids");
}

export function sectionCategoryIds(config: Record<string, JsonValue>): string[] {
  return configIdList(config, "category_ids");
}

export function sectionProductIds(config: Record<string, JsonValue>): string[] {
  return configIdList(config, "product_ids");
}

export function sectionReviewIds(config: Record<string, JsonValue>): string[] {
  return configIdList(config, "review_ids");
}

export function sectionBrandId(config: Record<string, JsonValue>): string {
  const value = config["brand_id"];
  return typeof value === "string" ? value.trim() : "";
}

export const SECTION_TEXT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type SectionTextSize = (typeof SECTION_TEXT_SIZES)[number];

export const SECTION_SUBTITLE_SIZES = ["sm", "md", "lg"] as const;
export type SectionSubtitleSize = (typeof SECTION_SUBTITLE_SIZES)[number];

export const SECTION_ALIGNMENTS = ["left", "center", "right"] as const;
export type SectionAlignment = (typeof SECTION_ALIGNMENTS)[number];

export const SECTION_IMAGE_SIDES = ["left", "right"] as const;
export type SectionImageSide = (typeof SECTION_IMAGE_SIDES)[number];

export const SECTION_LAYOUTS = ["split", "background"] as const;
export type SectionLayout = (typeof SECTION_LAYOUTS)[number];

/**
 * Per-section design overrides. Every field is optional: an unset field
 * inherits the global store theme (fonts/accent) and the template defaults,
 * so existing sections keep rendering exactly as before.
 */
export type SectionStyle = {
  background?: string;
  titleColor?: string;
  subtitleColor?: string;
  eyebrowColor?: string;
  titleFont?: string;
  bodyFont?: string;
  titleSize?: SectionTextSize;
  subtitleSize?: SectionSubtitleSize;
  align?: SectionAlignment;
  uppercase?: boolean;
  imageSide?: SectionImageSide;
  layout?: SectionLayout;
  overlay?: number;
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function validColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Drops anything that is not a recognised, safe style token. */
export function cleanSectionStyle(input: unknown): SectionStyle {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const style: SectionStyle = {};

  const color = (key: "background" | "titleColor" | "subtitleColor" | "eyebrowColor") => {
    const value = validColor(source[key]);
    if (value) style[key] = value;
  };
  color("background");
  color("titleColor");
  color("subtitleColor");
  color("eyebrowColor");

  for (const key of ["titleFont", "bodyFont"] as const) {
    const value = source[key];
    if (typeof value === "string" && (THEME_FONT_FAMILIES as readonly string[]).includes(value)) {
      style[key] = value;
    }
  }

  const titleSize = oneOf(source["titleSize"], SECTION_TEXT_SIZES);
  if (titleSize) style.titleSize = titleSize;

  const subtitleSize = oneOf(source["subtitleSize"], SECTION_SUBTITLE_SIZES);
  if (subtitleSize) style.subtitleSize = subtitleSize;

  const align = oneOf(source["align"], SECTION_ALIGNMENTS);
  if (align) style.align = align;

  const imageSide = oneOf(source["imageSide"], SECTION_IMAGE_SIDES);
  if (imageSide) style.imageSide = imageSide;

  const layout = oneOf(source["layout"], SECTION_LAYOUTS);
  if (layout) style.layout = layout;

  if (typeof source["uppercase"] === "boolean") style.uppercase = source["uppercase"];

  if (typeof source["overlay"] === "number" && Number.isFinite(source["overlay"])) {
    const overlay = Math.round(source["overlay"]);
    if (overlay >= 0 && overlay <= 90) style.overlay = overlay;
  }

  return style;
}

/** Reads the design overrides a section carries in its config. */
export function sectionStyleFromConfig(config: Record<string, JsonValue>): SectionStyle {
  return cleanSectionStyle(config["style"]);
}

export function isSectionStyleEmpty(style: SectionStyle): boolean {
  return Object.keys(style).length === 0;
}

/** Writes (or clears) the design overrides inside a section config. */
export function withSectionStyle(
  config: Record<string, JsonValue>,
  style: SectionStyle,
): Record<string, JsonValue> {
  const next = { ...config };
  if (isSectionStyleEmpty(style)) {
    delete next["style"];
  } else {
    next["style"] = style as JsonValue;
  }
  return next;
}

const SAFE_IMAGE_URL = /^(?:\/[^\s]*|https?:\/\/[^\s]+)$/i;
const SAFE_LINK_URL = /^(?:#[\w-]*|\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanImageUrl(value: unknown): string {
  const url = cleanText(value);
  return SAFE_IMAGE_URL.test(url) ? url : "";
}

function cleanLinkUrl(value: unknown, fallback: string): string {
  const url = cleanText(value);
  if (!url) return fallback;
  return SAFE_LINK_URL.test(url) ? url : fallback;
}

export function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `blk-${Math.random().toString(36).slice(2, 10)}`;
}

/** Validates and trims one page block. Returns null for unusable blocks. */
export function cleanPageBlock(raw: unknown): PageBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const type = source["type"];
  if (!PAGE_BLOCK_TYPES.some((entry) => entry.value === type)) return null;

  const id =
    typeof source["id"] === "string" && source["id"].trim()
      ? source["id"].trim().slice(0, 100)
      : newBlockId();

  switch (type as PageBlockType) {
    case "heading": {
      const text = cleanText(source["text"]);
      if (!text) return null;
      return { id, type: "heading", text, level: source["level"] === 3 ? 3 : 2 };
    }
    case "paragraph": {
      const text = cleanText(source["text"]);
      return text ? { id, type: "paragraph", text } : null;
    }
    case "image": {
      const imageUrl = cleanImageUrl(source["imageUrl"]);
      if (!imageUrl) return null;
      return {
        id,
        type: "image",
        imageUrl,
        alt: cleanText(source["alt"]),
        caption: cleanText(source["caption"]),
      };
    }
    case "image_text": {
      const imageUrl = cleanImageUrl(source["imageUrl"]);
      const text = cleanText(source["text"]);
      if (!imageUrl || !text) return null;
      return {
        id,
        type: "image_text",
        imageUrl,
        alt: cleanText(source["alt"]),
        side: source["side"] === "right" ? "right" : "left",
        text,
      };
    }
    case "list": {
      const items = Array.isArray(source["items"])
        ? source["items"].map(cleanText).filter(Boolean).slice(0, 30)
        : [];
      return items.length ? { id, type: "list", items } : null;
    }
    case "faq": {
      const items = Array.isArray(source["items"])
        ? source["items"]
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const entry = item as Record<string, unknown>;
              const question = cleanText(entry["question"]);
              const answer = cleanText(entry["answer"]);
              return question && answer ? { question, answer } : null;
            })
            .filter((item): item is { question: string; answer: string } => item !== null)
            .slice(0, 20)
        : [];
      return items.length ? { id, type: "faq", items } : null;
    }
    case "contact": {
      const email = cleanText(source["email"]);
      const phone = cleanText(source["phone"]);
      const address = cleanText(source["address"]);
      const hours = cleanText(source["hours"]);
      return email || phone || address || hours
        ? { id, type: "contact", email, phone, address, hours }
        : null;
    }
    case "cta": {
      const label = cleanText(source["label"]);
      if (!label) return null;
      return { id, type: "cta", label, href: cleanLinkUrl(source["href"], "#") };
    }
    case "divider":
      return { id, type: "divider" };
    default:
      return null;
  }
}

export function cleanPageBlocks(input: unknown): PageBlock[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(cleanPageBlock)
    .filter((block): block is PageBlock => block !== null)
    .slice(0, 60);
}

export function cleanPageLayout(value: unknown): PageLayout {
  return value === "two_column" ? "two_column" : "stacked";
}

/** Converts the legacy free-text body into paragraph blocks. */
export function bodyToPageBlocks(body: string): PageBlock[] {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ id: newBlockId(), type: "paragraph" as const, text }));
}

/** Reads blocks from stored content, upgrading old body-only pages. */
export function pageBlocksFromContent(content: Record<string, JsonValue>): PageBlock[] {
  if (Array.isArray(content["blocks"])) return cleanPageBlocks(content["blocks"]);
  const body = typeof content["body"] === "string" ? content["body"] : "";
  return bodyToPageBlocks(body);
}

/** Keeps the legacy body column in sync so old consumers still work. */
export function pageBodyFromBlocks(blocks: PageBlock[]): string {
  return blocks
    .filter(
      (block): block is Extract<PageBlock, { type: "paragraph" }> => block.type === "paragraph",
    )
    .map((block) => block.text)
    .join("\n\n");
}

export function pageContentFromStored(
  pageKey: string,
  content: Record<string, JsonValue>,
): PageContent {
  const title = cleanText(content["title"]) || pageKey;
  return {
    pageKey,
    title,
    body: typeof content["body"] === "string" ? content["body"] : "",
    eyebrow: cleanText(content["eyebrow"]),
    heroImage: cleanImageUrl(content["heroImage"]),
    layout: cleanPageLayout(content["layout"]),
    blocks: pageBlocksFromContent(content),
  };
}

export const PAGE_KEYS = [
  { key: "about", label: "About" },
  { key: "shipping", label: "Shipping" },
  { key: "returns", label: "Returns" },
  { key: "faq", label: "FAQ" },
  { key: "contact", label: "Contact" },
] as const;
