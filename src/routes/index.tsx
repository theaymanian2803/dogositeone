import { createFileRoute } from "@tanstack/react-router";

import { BagSheet } from "@/components/bag-sheet";
import { PromoPopup } from "@/components/site/promo-popup";
import { ProductGridSection } from "@/components/site/product-grid-section";
import { SectionRenderer } from "@/components/site/section-renderer";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import type { PageSection } from "@/lib/cms";
import { LocaleProvider } from "@/lib/locale";
import {
  customerSessionFn,
  getStoreSettingsFn,
  listBrandsFn,
  listCategoriesFn,
  listProductsFn,
  listSectionsFn,
  listStoreReviewsFn,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [products, sections, settings, session, categories, brands, reviews] = await Promise.all([
      listProductsFn(),
      listSectionsFn(),
      getStoreSettingsFn(),
      customerSessionFn(),
      listCategoriesFn(),
      listBrandsFn(),
      listStoreReviewsFn(),
    ]);
    return { products, sections, settings, user: session.user, categories, brands, reviews };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.settings.store_branding.name ?? "PetPals"} — Premium Food & Supplies for Dogs and Cats`,
      },
      {
        name: "description",
        content:
          "Shop premium pet food, beds, toys and grooming essentials at PetPals. Free delivery over 500 MAD.",
      },
      {
        property: "og:title",
        content: `${loaderData?.settings.store_branding.name ?? "PetPals"} — Pet Supplies`,
      },
      {
        property: "og:description",
        content: "Thoughtful food, toys and everyday essentials for happy dogs and cats.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Storefront,
});

const fallbackSection: PageSection = {
  id: "fallback",
  key: "product_grid_main",
  type: "product_grid",
  title: "THE PET EDIT",
  subtitle: "Food, toys, beds and grooming essentials for happy pets.",
  imageUrl: "",
  visible: true,
  sortOrder: 0,
  config: { eyebrow: "The lineup", filter: "all" },
};

function Storefront() {
  const { products, sections, settings, user, categories, brands, reviews } = Route.useLoaderData();

  return (
    <LocaleProvider language={settings.store_locale.language}>
      <main className="min-h-screen bg-background text-foreground">
        <ThemeStyle theme={settings.store_theme} />
        <SiteHeader settings={settings} user={user} />

        {sections.length > 0 ? (
          sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              products={products}
              categories={categories}
              brands={brands}
              reviews={reviews}
            />
          ))
        ) : (
          <ProductGridSection products={products} section={fallbackSection} />
        )}

        <SiteFooter settings={settings} />
        <BagSheet />
        <PromoPopup popup={settings.store_popup} />
      </main>
    </LocaleProvider>
  );
}
