import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Categories } from "@/components/Categories";
import { ProductGrid } from "@/components/ProductGrid";
import { BestProducts } from "@/components/BestProducts";
import { PromoBanner } from "@/components/PromoBanner";
import { SiteFooter } from "@/components/SiteFooter";

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
        <BestProducts />
        <PromoBanner />
      </main>
      <SiteFooter />
    </div>
  );
}
