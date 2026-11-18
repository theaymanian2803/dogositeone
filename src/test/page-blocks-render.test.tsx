import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageBlocks } from "@/components/site/page-blocks";
import type { PageBlock } from "@/lib/cms";

function ids(blocks: PageBlock[]): PageBlock[] {
  return blocks.map((block, index) => ({ ...block, id: `b${index}` }) as PageBlock);
}

describe("PageBlocks", () => {
  it("renders every block type", () => {
    const blocks = ids([
      { type: "heading", level: 2, text: "Shipping" } as PageBlock,
      { type: "paragraph", text: "We ship worldwide." } as PageBlock,
      { type: "image", imageUrl: "/api/media/one", alt: "Parcel", caption: "Packed" } as PageBlock,
      {
        type: "image_text",
        imageUrl: "/api/media/two",
        alt: "Studio",
        side: "right",
        text: "Inside the studio.",
      } as PageBlock,
      { type: "list", items: ["Fast", "Tracked"] } as PageBlock,
      {
        type: "faq",
        items: [{ question: "How long?", answer: "Three days." }],
      } as PageBlock,
      {
        type: "contact",
        email: "hi@example.com",
        phone: "+1 555 0100",
        address: "12 Track Lane",
        hours: "Mon–Fri",
      } as PageBlock,
      { type: "cta", label: "Shop", href: "/" } as PageBlock,
      { type: "divider" } as PageBlock,
    ]);

    const { container } = render(<PageBlocks blocks={blocks} layout="stacked" />);

    expect(screen.getByRole("heading", { name: "Shipping" })).toBeTruthy();
    expect(screen.getByText("We ship worldwide.")).toBeTruthy();
    expect(container.querySelector('img[src="/api/media/one"]')).not.toBeNull();
    expect(screen.getByText("Packed")).toBeTruthy();
    expect(screen.getByText("Inside the studio.")).toBeTruthy();
    expect(screen.getByText("Fast")).toBeTruthy();
    expect(screen.getByText("How long?")).toBeTruthy();
    expect(screen.getByText("hi@example.com").getAttribute("href")).toBe("mailto:hi@example.com");
    expect(screen.getByText("Shop").getAttribute("href")).toBe("/");
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("lays blocks out in two columns when asked", () => {
    const blocks = ids([
      { type: "paragraph", text: "Left" } as PageBlock,
      { type: "paragraph", text: "Right" } as PageBlock,
    ]);

    const { container } = render(<PageBlocks blocks={blocks} layout="two_column" />);

    expect(container.firstElementChild?.className).toContain("md:grid-cols-2");
  });

  it("spans images across both columns", () => {
    const blocks = ids([
      { type: "image", imageUrl: "/api/media/x", alt: "", caption: "" } as PageBlock,
    ]);

    const { container } = render(<PageBlocks blocks={blocks} layout="two_column" />);

    expect(container.firstElementChild?.querySelector(".md\\:col-span-2")).not.toBeNull();
  });

  it("shows a helpful empty state", () => {
    render(<PageBlocks blocks={[]} layout="stacked" />);

    expect(screen.getByText(/This page is empty/)).toBeTruthy();
  });
});
