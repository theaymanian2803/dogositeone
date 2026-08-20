import { BestProducts } from "@/components/BestProducts";
import { Categories } from "@/components/Categories";
import { ExtraBanner } from "@/components/ExtraBanner";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { PromoBanner } from "@/components/PromoBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    document.title = "PetPals — Premium Food & Supplies for Dogs and Cats";
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Categories />
        <ProductGrid />
        <PromoBanner />
        <ExtraBanner />
        <BestProducts />
      </main>
      <SiteFooter />
    </div>
  );
}
