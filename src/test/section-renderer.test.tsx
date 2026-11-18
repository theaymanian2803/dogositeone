import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SectionRenderer } from "@/components/site/section-renderer";
import { CartProvider } from "@/lib/cart";
import {
  SECTION_TYPES,
  sectionBrandId,
  sectionBrandIds,
  sectionCategoryIds,
  sectionProductIds,
  sectionReviewIds,
  sectionUsesImage,
  type JsonValue,
  type PageSection,
  type SectionType,
} from "@/lib/cms";
import type { Review } from "@/lib/commerce";
import type { Product } from "@/lib/storefront";

// `Link` needs a router in the real app. Section rendering never depends on the
// router itself, so a plain anchor keeps these tests focused on the image output.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

const IMAGE = "/api/media/abc123";

function section(type: SectionType, overrides: Partial<PageSection> = {}): PageSection {
  return {
    id: "sec-test",
    key: "test_section",
    type,
    title: "Section title",
    subtitle: "Section subtitle",
    imageUrl: IMAGE,
    visible: true,
    sortOrder: 0,
    config: {},
    ...overrides,
  };
}

function renderSection(instance: PageSection) {
  return render(
    <CartProvider>
      <SectionRenderer section={instance} products={[]} categories={[]} />
    </CartProvider>,
  );
}

const IMAGE_TYPES: SectionType[] = ["hero", "promo", "custom_banner", "lookbook", "featured_brand"];

const TEXT_ONLY_TYPES: SectionType[] = [
  "product_grid",
  "rich_text",
  "categories",
  "products",
  "reviews",
  "brands",
];

describe("section images reach the storefront", () => {
  it.each(IMAGE_TYPES)("renders the section image for a %s section", (type) => {
    const { container } = renderSection(section(type));

    expect(container.querySelector(`img[src="${IMAGE}"]`)).not.toBeNull();
  });

  it("renders every image listed in a lookbook's config", () => {
    const { container } = renderSection(
      section("lookbook", {
        imageUrl: "",
        config: { images: ["/products/dog-chew-toy-beef-bone-9sl2.jpg", "/api/media/second"] },
      }),
    );

    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(srcs).toEqual(["/products/dog-chew-toy-beef-bone-9sl2.jpg", "/api/media/second"]);
  });

  it.each(TEXT_ONLY_TYPES)("does not offer an image for a %s section", (type) => {
    const { container } = renderSection(section(type, { imageUrl: IMAGE }));

    expect(sectionUsesImage(type)).toBe(false);
    expect(container.querySelector(`img[src="${IMAGE}"]`)).toBeNull();
  });

  it("treats every declared section type as either image-backed or text-only", () => {
    for (const { value } of SECTION_TYPES) {
      const expected = IMAGE_TYPES.includes(value);
      expect(sectionUsesImage(value), `sectionUsesImage(${value})`).toBe(expected);
    }
  });
});

describe("brand sections", () => {
  const brandList = [
    { id: "brand-1", name: "Volt", logoUrl: "/api/media/volt", productCount: 3 },
    { id: "brand-2", name: "Pace", logoUrl: null, productCount: 1 },
  ];

  function renderWithBrands(instance: PageSection) {
    return render(
      <CartProvider>
        <SectionRenderer section={instance} products={[]} categories={[]} brands={brandList} />
      </CartProvider>,
    );
  }

  it("renders only the brands picked for a brands section", () => {
    const { container } = renderWithBrands(
      section("brands", { title: "Our brands", config: { brand_ids: ["brand-2"] } }),
    );

    expect(screen.getByText("Pace")).toBeTruthy();
    expect(screen.queryByText("Volt")).toBeNull();
    expect(container.querySelector('img[src="/api/media/volt"]')).toBeNull();
  });

  it("renders every brand when the brands section has no selection", () => {
    renderWithBrands(section("brands", { config: {} }));

    expect(screen.getByText("Volt")).toBeTruthy();
    expect(screen.getByText("Pace")).toBeTruthy();
  });

  it("uses the picked brand's name and logo for a featured brand section", () => {
    const { container } = renderWithBrands(
      section("featured_brand", {
        title: "",
        imageUrl: "",
        config: { brand_id: "brand-1" },
      }),
    );

    expect(screen.getByRole("heading", { name: "Volt" })).toBeTruthy();
    expect(container.querySelector('img[src="/api/media/volt"]')).not.toBeNull();
  });

  it("keeps a typed title over the brand name", () => {
    renderWithBrands(
      section("featured_brand", { title: "Volt, in motion", config: { brand_id: "brand-1" } }),
    );

    expect(screen.getByRole("heading", { name: "Volt, in motion" })).toBeTruthy();
  });

  it("reads brand ids out of the config", () => {
    expect(sectionBrandIds({ brand_ids: ["a", "", 3] })).toEqual(["a"]);
    expect(sectionBrandId({ brand_id: " b " })).toBe("b");
  });
});

describe("picked content sections", () => {
  const products = [
    {
      id: "p1",
      name: "Dog Chew Toy — Beef Bone",
      color: "White",
      price: 120,
      image: "/products/bone.jpg",
      category: "dogs",
      tagline: "",
      description: "",
      fabric: "",
      composition: [],
      care: [],
      fit: "",
      modelNote: "",
      features: [],
    },
    {
      id: "p2",
      name: "Organic Cat Treats — Salmon",
      color: "Salmon",
      price: 180,
      image: "/products/bed.jpg",
      category: "cats",
      tagline: "",
      description: "",
      fabric: "",
      composition: [],
      care: [],
      fit: "",
      modelNote: "",
      features: [],
    },
  ] as Product[];

  const categories = [
    { id: "c1", name: "Dogs", slug: "dogs", image: "/products/bone.jpg" },
    { id: "c2", name: "Cats", slug: "cats", image: "/products/bed.jpg" },
  ];

  const reviews = [
    {
      id: "r1",
      productId: "p1",
      productName: "Dog Chew Toy — Beef Bone",
      userId: null,
      authorName: "Ada",
      rating: 5,
      title: "Perfect fit",
      body: "Love the fabric.",
      imageUrl: null,
      status: "approved",
      createdAt: "2026-01-01",
    },
    {
      id: "r2",
      productId: "p2",
      productName: "Organic Cat Treats — Salmon",
      userId: null,
      authorName: "Ben",
      rating: 4,
      title: "",
      body: "Great for training.",
      imageUrl: null,
      status: "approved",
      createdAt: "2026-01-02",
    },
  ] as Review[];

  function renderPicked(instance: PageSection) {
    return render(
      <CartProvider>
        <SectionRenderer
          section={instance}
          products={products}
          categories={categories}
          brands={[]}
          reviews={reviews}
        />
      </CartProvider>,
    );
  }

  it("shows only the categories picked for a categories section", () => {
    renderPicked(section("categories", { config: { category_ids: ["c2"] } }));

    expect(screen.getByText("Cats")).toBeTruthy();
    expect(screen.queryByText("Dogs")).toBeNull();
  });

  it("shows every category when none are picked", () => {
    renderPicked(section("categories", { config: {} }));

    expect(screen.getByText("Dogs")).toBeTruthy();
    expect(screen.getByText("Cats")).toBeTruthy();
  });

  it("shows only the products picked for a picked-products section", () => {
    const { container } = renderPicked(section("products", { config: { product_ids: ["p1"] } }));

    expect(screen.getByText("Dog Chew Toy — Beef Bone")).toBeTruthy();
    expect(screen.queryByText("Organic Cat Treats — Salmon")).toBeNull();
    expect(container.querySelector('img[src="/products/bone.jpg"]')).not.toBeNull();
  });

  it("shows every product when none are picked", () => {
    renderPicked(section("products", { config: {} }));

    expect(screen.getByText("Dog Chew Toy — Beef Bone")).toBeTruthy();
    expect(screen.getByText("Organic Cat Treats — Salmon")).toBeTruthy();
  });

  it("shows only the reviews picked for a reviews section", () => {
    renderPicked(section("reviews", { config: { review_ids: ["r2"] } }));

    expect(screen.getByText("Great for training.")).toBeTruthy();
    expect(screen.queryByText("Love the fabric.")).toBeNull();
  });

  it("shows every approved review with its rating by default", () => {
    const { container } = renderPicked(section("reviews", { config: {} }));

    expect(screen.getByText("Love the fabric.")).toBeTruthy();
    expect(screen.getByText("Great for training.")).toBeTruthy();
    expect(screen.getByText(/Ada/)).toBeTruthy();
    expect(container.querySelector('[aria-label="5 out of 5 stars"]')).not.toBeNull();
  });

  it("reads id lists out of the config", () => {
    expect(sectionCategoryIds({ category_ids: ["a", 1] })).toEqual(["a"]);
    expect(sectionProductIds({ product_ids: ["p"] })).toEqual(["p"]);
    expect(sectionReviewIds({ review_ids: ["r"] })).toEqual(["r"]);
  });

  it("centres a header-style section instead of leaving it shrink-wrapped", () => {
    const { container } = render(
      <CartProvider>
        <SectionRenderer
          section={section("categories", {
            title: "Shop",
            config: { style: { align: "center" } },
          })}
          products={products}
          categories={categories}
          brands={[]}
          reviews={reviews}
        />
      </CartProvider>,
    );

    const header = container.querySelector("section > div") as HTMLElement;
    expect(header.className).toContain("flex-col");
    expect((container.querySelector("h2") as HTMLElement).style.textAlign).toBe("center");
  });
});

describe("section design overrides", () => {
  function promo(style: Record<string, JsonValue>, overrides: Partial<PageSection> = {}) {
    return section("promo", { config: { style }, ...overrides });
  }

  it("applies background and text colours", () => {
    const { container } = renderSection(
      promo({ background: "#101010", titleColor: "#ff0000", subtitleColor: "#00ff00" }),
    );

    const root = container.querySelector("section") as HTMLElement;
    const title = container.querySelector("h2") as HTMLElement;
    const coloured = [...container.querySelectorAll("p")].filter(
      (p) => (p as HTMLElement).style.color === "rgb(0, 255, 0)",
    );

    expect(root.style.backgroundColor).toBe("rgb(16, 16, 16)");
    expect(title.style.color).toBe("rgb(255, 0, 0)");
    expect(coloured).toHaveLength(1);
  });

  it("applies typography and alignment", () => {
    const { container } = renderSection(
      promo({ titleFont: "Bebas Neue", titleSize: "xl", align: "center", uppercase: true }),
    );

    const title = container.querySelector("h2") as HTMLElement;
    expect(title.style.fontFamily).toContain("Bebas Neue");
    expect(title.style.textAlign).toBe("center");
    expect(title.style.textTransform).toBe("uppercase");
  });

  it("supports right alignment too", () => {
    const { container } = renderSection(promo({ align: "right" }));

    expect((container.querySelector("h2") as HTMLElement).style.textAlign).toBe("right");
  });

  it("puts the image on the left when asked", () => {
    const { container } = renderSection(promo({ imageSide: "left" }));
    const img = container.querySelector(`img[src="${IMAGE}"]`) as HTMLElement;

    expect(img.parentElement?.style.order).toBe("-1");
  });

  it("renders the image behind the text with an overlay in background layout", () => {
    const { container } = renderSection(promo({ layout: "background", overlay: 70 }));

    const root = container.querySelector("section") as HTMLElement;
    const background = root.querySelector(`img[src="${IMAGE}"]`) as HTMLElement;
    const title = container.querySelector("h2") as HTMLElement;

    expect(root.className).toContain("relative");
    expect(background.className).toContain("absolute");
    expect(title.style.color).toBe("rgb(255, 255, 255)");
    const overlay = root.querySelector("div[aria-hidden='true'].bg-black") as HTMLElement;
    expect(overlay.style.opacity).toBe("0.7");
  });
});
