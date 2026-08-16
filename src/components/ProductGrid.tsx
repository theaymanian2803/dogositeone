import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { turso } from "@/integrations/turso/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
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

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const { add } = useCart();

  useEffect(() => {
    turso
      .execute(
        "SELECT id, name, slug, price, image_url, badge, tag FROM products ORDER BY created_at DESC LIMIT 8",
      )
      .then(({ rows }) => setProducts(rows as unknown as Product[]));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl">Our Best Products</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Hand-picked favorites loved by pets and their people — fresh from the shop.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
                  className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-sm font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{formatPrice(p.price)}</p>
                {p.tag && (
                  <span className="mt-2 inline-block rounded-full border border-border px-3 py-0.5 text-xs">
                    {p.tag}
                  </span>
                )}
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
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
    </section>
  );
}
