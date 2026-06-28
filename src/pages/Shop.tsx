import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { turso } from "@/integrations/turso/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { ShoppingBag, Search, SlidersHorizontal, X, ChevronUp } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  category: string;
  badge: string | null;
  tag: string | null;
  created_at: string;
};

type Category = { id: string; name: string; slug: string };

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "name-asc">(
    "newest",
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { add } = useCart();

  useEffect(() => {
    document.title = "Shop — PetPals";
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      turso.execute("SELECT * FROM products ORDER BY created_at DESC"),
      turso.execute("SELECT * FROM categories ORDER BY name"),
    ]).then(([pRs, cRs]) => {
      setProducts(pRs.rows as unknown as Product[]);
      setCategories(cRs.rows as unknown as Category[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min)) list = list.filter((p) => Number(p.price) >= min);
    if (!isNaN(max)) list = list.filter((p) => Number(p.price) <= max);

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return list;
  }, [products, query, selectedCategories, minPrice, maxPrice, sortBy]);

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function clearFilters() {
    setQuery("");
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setSearchParams(new URLSearchParams());
  }

  const activeFilterCount =
    (query ? 1 : 0) +
    selectedCategories.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Shop</span>
        </nav>

        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Shop</h1>
          <p className="mt-3 text-muted-foreground">
            Browse all our premium products for your pets.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (value.trim()) next.set("q", value.trim());
                  else next.delete("q");
                  return next;
                });
              }}
              className="h-11 w-full rounded-full border border-border bg-secondary/60 pl-5 pr-12 text-sm outline-none focus:border-accent"
            />
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen((s) => !s)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground hidden sm:inline">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-10 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-accent"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-10">
          <aside
            className={`w-64 shrink-0 space-y-8 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`}
          >
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <X className="h-3.5 w-3.5" /> Clear all filters
              </button>
            )}

            <div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mb-3 flex w-full items-center justify-between text-left lg:cursor-default"
              >
                <h3 className="font-bold">Categories</h3>
                <ChevronUp className="h-4 w-4 lg:hidden" />
              </button>
              <div className="space-y-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c.slug)}
                      onChange={() => toggleCategory(c.slug)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {products.filter((p) => p.category === c.slug).length}
                    </span>
                  </label>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-bold">Price</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>
          </aside>

          <section className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square rounded-2xl bg-muted" />
                    <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg font-semibold">No products found</p>
                <p className="mt-1 text-muted-foreground">
                  Try adjusting your filters or search query.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  {filtered.map((p) => (
                    <div key={p.id} className="group relative">
                      <Link to={`/product/${p.slug}`} className="block">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
                          {p.badge && (
                            <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                              {p.badge}
                            </span>
                          )}
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-4 text-center">
                          <h3 className="text-sm font-semibold">{p.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            ${Number(p.price).toFixed(2)}
                          </p>
                          {p.tag && (
                            <span className="mt-2 inline-block rounded-full border border-border px-3 py-0.5 text-xs">
                              {p.tag}
                            </span>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          add({
                            id: p.id,
                            name: p.name,
                            slug: p.slug,
                            price: Number(p.price),
                            image_url: p.image_url,
                          });
                          toast.success(`${p.name} added to cart`);
                        }}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
