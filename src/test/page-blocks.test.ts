// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  bodyToPageBlocks,
  cleanPageBlocks,
  cleanPageBlock,
  pageBlocksFromContent,
  pageBodyFromBlocks,
  pageContentFromStored,
} from "@/lib/cms";

describe("cleanPageBlock", () => {
  it("trims text and keeps a heading level", () => {
    expect(cleanPageBlock({ id: "a", type: "heading", text: "  Hello  ", level: 3 })).toEqual({
      id: "a",
      type: "heading",
      text: "Hello",
      level: 3,
    });
  });

  it("rejects blocks missing required content", () => {
    expect(cleanPageBlock({ type: "heading", text: "   " })).toBeNull();
    expect(cleanPageBlock({ type: "paragraph" })).toBeNull();
    expect(cleanPageBlock({ type: "image", imageUrl: "" })).toBeNull();
    expect(cleanPageBlock({ type: "cta", label: "" })).toBeNull();
    expect(cleanPageBlock({ type: "contact" })).toBeNull();
  });

  it("rejects unsafe image urls", () => {
    expect(cleanPageBlock({ type: "image", imageUrl: "javascript:alert(1)" })).toBeNull();
    expect(cleanPageBlock({ type: "image", imageUrl: "data:image/png;base64,AAA" })).toBeNull();
    expect(cleanPageBlock({ type: "image", imageUrl: "/api/media/abc" })).toMatchObject({
      type: "image",
      imageUrl: "/api/media/abc",
    });
    expect(cleanPageBlock({ type: "image", imageUrl: "https://cdn.example/x.png" })).not.toBeNull();
  });

  it("falls back to a safe href for bad cta links", () => {
    expect(cleanPageBlock({ type: "cta", label: "Go", href: "javascript:alert(1)" })).toEqual({
      id: expect.any(String),
      type: "cta",
      label: "Go",
      href: "#",
    });
    expect(cleanPageBlock({ type: "cta", label: "Go", href: "/pages/faq" })).toMatchObject({
      href: "/pages/faq",
    });
  });

  it("cleans lists and faq items", () => {
    expect(cleanPageBlock({ type: "list", items: [" one ", "", "two"] })).toMatchObject({
      items: ["one", "two"],
    });
    expect(
      cleanPageBlock({
        type: "faq",
        items: [
          { question: "Q1", answer: "A1" },
          { question: "", answer: "A2" },
        ],
      }),
    ).toMatchObject({ items: [{ question: "Q1", answer: "A1" }] });
  });

  it("keeps the first non-empty contact field", () => {
    expect(
      cleanPageBlock({
        type: "contact",
        email: "hi@example.com",
        phone: "",
        address: "",
        hours: "",
      }),
    ).toMatchObject({ email: "hi@example.com" });
  });

  it("rejects unknown types", () => {
    expect(cleanPageBlock({ type: "video", src: "x" })).toBeNull();
  });
});

describe("page block collections", () => {
  it("drops invalid blocks and caps the list", () => {
    const blocks = cleanPageBlocks([{ type: "paragraph", text: "keep" }, { type: "nope" }, null]);
    expect(blocks).toHaveLength(1);

    const many = Array.from({ length: 80 }, (_, index) => ({
      type: "paragraph",
      text: `p${index}`,
    }));
    expect(cleanPageBlocks(many)).toHaveLength(60);
  });

  it("upgrades a legacy body into paragraph blocks", () => {
    const blocks = pageBlocksFromContent({ title: "About", body: "First.\n\nSecond." });

    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "paragraph"]);
    expect(blocks.map((block) => (block.type === "paragraph" ? block.text : ""))).toEqual([
      "First.",
      "Second.",
    ]);
  });

  it("prefers stored blocks over the legacy body", () => {
    const blocks = pageBlocksFromContent({
      body: "Legacy",
      blocks: [{ type: "paragraph", text: "New" }],
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "paragraph", text: "New" });
  });

  it("keeps the legacy body in sync with paragraph blocks", () => {
    const blocks = bodyToPageBlocks("One.\n\nTwo.");
    expect(pageBodyFromBlocks(blocks)).toBe("One.\n\nTwo.");
  });
});

describe("pageContentFromStored", () => {
  it("fills defaults for legacy rows", () => {
    const page = pageContentFromStored("about", { title: "About us", body: "Hi." });

    expect(page).toMatchObject({
      pageKey: "about",
      title: "About us",
      layout: "stacked",
      eyebrow: "",
      heroImage: "",
    });
    expect(page.blocks).toHaveLength(1);
  });

  it("sanitises the hero image and layout", () => {
    const page = pageContentFromStored("contact", {
      title: "Contact",
      layout: "two_column",
      heroImage: "javascript:alert(1)",
      blocks: [],
    });

    expect(page.layout).toBe("two_column");
    expect(page.heroImage).toBe("");
  });
});
