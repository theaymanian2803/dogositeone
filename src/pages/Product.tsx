import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { turso } from "@/integrations/turso/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShoppingBag, Heart, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  badge: string | null;
  tag: string | null;
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const rs = await turso.execute({
        sql: "SELECT * FROM products WHERE slug = ? LIMIT 1",
        args: [slug],
      });
      const data = rs.rows[0] as Product | undefined;
      setProduct(data ?? null);
      if (data) {
        document.title = `${data.name} — PetPals`;
        const relRs = await turso.execute({
          sql: "SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4",
          args: [data.category, data.id],
        });
        setRelated(relRs.rows as unknown as Product[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold">Product not found</h1>
          <Link to="/" className="mt-4 inline-block text-accent hover:underline">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="capitalize">{product.category}</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-card">
            {product.badge && (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-sm font-bold text-white">
                {product.badge}
              </span>
            )}
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-contain p-8"
            />
          </div>

          <div className="flex flex-col">
            <p className="text-sm uppercase tracking-wider text-accent">{product.category}</p>
            <h1 className="mt-2 text-4xl font-bold md:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-accent text-accent" />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">(124 reviews)</span>
            </div>
            <p className="mt-6 text-4xl font-bold">${Number(product.price).toFixed(2)}</p>
            <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

            {product.tag && (
              <div className="mt-6">
                <span className="text-sm text-muted-foreground">Size: </span>
                <span className="inline-block rounded-full border border-border px-4 py-1 text-sm">
                  {product.tag}
                </span>
              </div>
            )}

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center rounded-full border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 text-lg">
                  −
                </button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="h-11 w-11 text-lg">
                  +
                </button>
              </div>
              <button
                onClick={() => {
                  add(
                    {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: Number(product.price),
                      image_url: product.image_url,
                    },
                    qty,
                  );
                  toast.success(`${product.name} added to cart`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent py-3 font-semibold text-white hover:opacity-90"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
              <button
                className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-secondary"
                aria-label="Save"
              >
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6 text-center text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Free Shipping</p>over $50
              </div>
              <div>
                <p className="font-semibold text-foreground">30-Day Returns</p>no questions
              </div>
              <div>
                <p className="font-semibold text-foreground">Vet Approved</p>certified safe
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="text-3xl font-bold">Related products</h2>
            <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
              {related.map((p) => (
                <Link key={p.id} to={`/product/${p.slug}`} className="group">
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
                  <div className="mt-3 text-center">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      ${Number(p.price).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
