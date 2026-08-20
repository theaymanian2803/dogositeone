import { BestProducts } from "@/components/BestProducts";
import { Categories } from "@/components/Categories";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { PromoBanner } from "@/components/PromoBanner";
import { SectionBanner } from "@/components/SectionBanner";
import { SectionGrid } from "@/components/SectionGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useSections } from "@/hooks/useSections";
import { useEffect } from "react";

export default function Index() {
  const { rows } = useSections();
  useEffect(() => {
    document.title = "PetPals — Premium Food & Supplies for Dogs and Cats";
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {rows.map((row) => {
          if (!row.visible) return null;
          if (row.isCustom) {
            if (!row.section) return null;
            return row.section.type === "grid" ? (
              <SectionGrid key={row.id} section={row.section} />
            ) : (
              <SectionBanner key={row.id} section={row.section} />
            );
          }
          switch (row.id) {
            case "hero":
              return <Hero key="hero" />;
            case "categories":
              return <Categories key="categories" />;
            case "products":
              return <ProductGrid key="products" />;
            case "promo":
              return <PromoBanner key="promo" />;
            case "best":
              return <BestProducts key="best" />;
            default:
              return null;
          }
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
