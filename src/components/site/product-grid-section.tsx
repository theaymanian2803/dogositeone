import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PageSection } from "@/lib/cms";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/commerce";
import { filterProducts, type Collection, type Product } from "@/lib/storefront";
import { resolveSectionStyle } from "./section-style";

const sizes = ["One Size"];
const filters: Array<{ id: Collection; label: string }> = [
  { id: "all", label: "All products" },
  { id: "dogs", label: "Dogs" },
  { id: "cats", label: "Cats" },
  { id: "foods", label: "Food" },
  { id: "groom", label: "Grooming" },
  { id: "bed", label: "Beds" },
  { id: "toys", label: "Toys" },
];

export function ProductGridSection({
  products,
  section,
  initialCollection = "all",
  initialQuery = "",
}: {
  products: Product[];
  section: PageSection;
  initialCollection?: Collection;
  initialQuery?: string;
}) {
  const [collection, setCollection] = useState<Collection>(initialCollection);
  const [query, setQuery] = useState(initialQuery);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [sizesByProduct, setSizesByProduct] = useState<Record<string, string>>({});
  const { addToBag } = useCart();

  const visibleProducts = useMemo(
    () => filterProducts(products, collection, query, savedIds, showSaved),
    [products, collection, query, savedIds, showSaved],
  );

  function toggleSaved(id: string) {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
  }

  const eyebrow =
    typeof section.config["eyebrow"] === "string" ? section.config["eyebrow"] : "The lineup";
  const s = resolveSectionStyle(section);
  const aligned = s.style.align === "center" || s.style.align === "right";

  return (
    <section
      style={s.wrapper}
      className="mx-auto max-w-[1600px] px-5 pb-14 pt-16 sm:px-8 md:px-14 md:pb-20 md:pt-20"
      id="shop"
    >
      <div className="flex flex-col gap-6 border-b border-border py-5 sm:flex-row sm:items-end sm:justify-between">
        <div style={s.content}>
          <p
            style={s.eyebrow}
            className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
          >
            {eyebrow} / 01—{String(products.length).padStart(2, "0")}
          </p>
          <h2
            style={s.title}
            className="font-display text-[40px] font-bold leading-none sm:text-[52px]"
          >
            {section.title || "THE PET EDIT"}
          </h2>
        </div>
        <p style={s.subtitle} className="max-w-xs text-xs leading-5 text-muted-foreground">
          {section.subtitle || "Food, toys, beds and everyday essentials."}
        </p>
      </div>

      <div className="flex flex-col gap-4 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter products">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              aria-pressed={collection === filter.id}
              onClick={() => setCollection(filter.id)}
              className={`h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-[0.08em] ${collection === filter.id ? "bg-hot-pink text-foreground hover:bg-hot-pink" : "text-muted-foreground"}`}
            >
              {filter.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            aria-pressed={showSaved}
            onClick={() => setShowSaved((value) => !value)}
            className={`h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-[0.08em] ${showSaved ? "text-hot-pink" : "text-muted-foreground"}`}
          >
            <Heart className={`size-3.5 ${showSaved ? "fill-hot-pink" : ""}`} /> Saved
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative block">
            <span className="sr-only">Search pieces</span>
            <Search
              className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pieces"
              className="h-9 w-full border-b border-border bg-transparent pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-hot-pink sm:w-44"
            />
          </label>
          <p
            aria-live="polite"
            className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            {visibleProducts.length} pieces
          </p>
        </div>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 pt-6 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {visibleProducts.map((product, index) => {
            const selectedSize = sizesByProduct[product.id] ?? "M";
            const isSaved = savedIds.includes(product.id);
            return (
              <article key={product.id} className="group min-w-0">
                <div className="product-image relative overflow-hidden bg-secondary">
                  <img
                    src={product.image}
                    alt={`${product.name} in ${product.color}`}
                    width={768}
                    height={960}
                    loading={index < 2 ? "eager" : "lazy"}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  {product.badge && (
                    <span className="absolute left-2.5 top-2.5 z-10 bg-background px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] sm:left-3 sm:top-3 sm:text-[9px]">
                      {product.badge}
                    </span>
                  )}
                  <Link
                    to="/products/$productId"
                    params={{ productId: product.id }}
                    aria-label={`View ${product.name}`}
                    className="absolute inset-0 z-0"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 items-center justify-between bg-background/95 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
                  >
                    View details <ArrowUpRight className="size-3.5 text-hot-pink" />
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${isSaved ? "Remove" : "Add"} ${product.name} ${isSaved ? "from" : "to"} saved items`}
                    aria-pressed={isSaved}
                    onClick={() => toggleSaved(product.id)}
                    className="absolute right-1.5 top-1.5 z-10 size-9 bg-background/85 hover:bg-background sm:right-2.5 sm:top-2.5"
                  >
                    <Heart className={`size-4 ${isSaved ? "fill-hot-pink text-hot-pink" : ""}`} />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-2 pt-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold sm:text-sm">
                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        className="transition-colors hover:text-hot-pink"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                      {product.color}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {product.originalPrice && (
                      <span className="block text-[9px] text-muted-foreground line-through">
                        {formatMoney(product.originalPrice, "MAD")}
                      </span>
                    )}
                    <span className="text-xs font-semibold sm:text-sm">
                      {formatMoney(product.price, "MAD")}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div
                    className="flex gap-0.5"
                    aria-label={`Selected size ${selectedSize} for ${product.name}`}
                  >
                    {sizes.map((size) => (
                      <Button
                        key={size}
                        variant="ghost"
                        aria-label={`${product.name}, size ${size}`}
                        aria-pressed={selectedSize === size}
                        onClick={() =>
                          setSizesByProduct((current) => ({ ...current, [product.id]: size }))
                        }
                        className={`size-[21px] rounded-none p-0 text-[8px] font-semibold sm:size-[28px] sm:text-[9px] ${selectedSize === size ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "text-muted-foreground"}`}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => addToBag(product, selectedSize)}
                    aria-label={`Add ${product.name} in size ${selectedSize} to bag`}
                    className="size-[22px] rounded-none p-0 hover:text-hot-pink sm:size-8 sm:gap-1 sm:px-2 sm:text-[10px] [&_svg]:size-3 sm:[&_svg]:size-3.5"
                  >
                    <Plus className="size-3" />
                    <span className="sr-only sm:not-sr-only">Add</span>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center text-center">
          <p className="font-display text-3xl font-bold">NOTHING HERE (YET)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {showSaved ? "Save a piece to see it here." : "Try another search or collection."}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setShowSaved(false);
              setCollection("all");
              setQuery("");
            }}
            className="mt-5 rounded-none text-xs"
          >
            View the full collection
          </Button>
        </div>
      )}
      <p className="mt-7 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        Prices in MAD · shipping calculated at checkout
      </p>
    </section>
  );
}
