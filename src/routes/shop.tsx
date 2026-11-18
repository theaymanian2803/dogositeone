import { createFileRoute } from "@tanstack/react-router";

import { BagSheet } from "@/components/bag-sheet";
import { ProductGridSection } from "@/components/site/product-grid-section";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import type { PageSection } from "@/lib/cms";
import { customerSessionFn, getStoreSettingsFn, listProductsFn } from "@/lib/api";
import type { Collection } from "@/lib/storefront";

const CATEGORIES: Collection[] = ["all", "dogs", "cats", "foods", "groom", "bed", "toys"];

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): { q?: string; category?: string } => {
    const result: { q?: string; category?: string } = {};
    if (typeof search["q"] === "string") result.q = search["q"];
    if (typeof search["category"] === "string") result.category = search["category"];
    return result;
  },
  loader: async () => {
    const [products, settings, session] = await Promise.all([
      listProductsFn(),
      getStoreSettingsFn(),
      customerSessionFn(),
    ]);
    return { products, settings, user: session.user };
  },
  head: () => ({
    meta: [
      { title: "Shop — PetPals" },
      {
        name: "description",
        content: "Shop PetPals food, treats, toys, beds and grooming essentials.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { products, settings, user } = Route.useLoaderData();
  const { category, q } = Route.useSearch();
  const initialCollection: Collection = CATEGORIES.includes(category as Collection)
    ? (category as Collection)
    : "all";

  const section: PageSection = {
    id: "shop",
    key: "shop",
    type: "product_grid",
    title: "SHOP PET ESSENTIALS",
    subtitle: "Food, toys, beds and everyday essentials for happy dogs and cats.",
    imageUrl: "",
    visible: true,
    sortOrder: 0,
    config: {
      eyebrow: "Shop",
      description: "Food, toys, beds and everyday essentials for happy dogs and cats.",
      filter: initialCollection,
    },
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ThemeStyle theme={settings.store_theme} />
      <SiteHeader settings={settings} user={user} />
      <ProductGridSection
        products={products}
        section={section}
        initialCollection={initialCollection}
        initialQuery={q ?? ""}
      />
      <SiteFooter settings={settings} />
      <BagSheet />
    </main>
  );
}
