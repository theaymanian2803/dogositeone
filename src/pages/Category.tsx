import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { turso } from "@/integrations/turso/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  badge: string | null;
  tag: string | null;
};

export default function Category() {
  const { category = "" } = useParams<{ category: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    const title = category ? category[0].toUpperCase() + category.slice(1) : "Category";
    document.title = `${title} — PetPals`;
  }, [category]);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    turso
      .execute({
        sql: "SELECT id, name, slug, price, image_url, badge, tag FROM products WHERE category = ? ORDER BY created_at DESC",
        args: [category],
      })
      .then(({ rows }) => {
        setProducts(rows as unknown as Product[]);
        setLoading(false);
      });
  }, [category]);

  const title = category ? category[0].toUpperCase() + category.slice(1) : "";
  const subtitle =
    category === "dogs"
      ? "Everything your best friend needs — food, beds, toys and more."
      : category === "cats"
        ? "Curated essentials for your feline — from cozy beds to playful toys."
        : `Browse our ${category} collection.`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground capitalize">{category}</span>
        </nav>

        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">{title}</h1>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </header>

        {loading ? (
          <p className="py-20 text-center text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No products yet in this category.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
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
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
