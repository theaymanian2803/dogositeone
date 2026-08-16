import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { Trash2, ShoppingBag } from "lucide-react";

export default function Cart() {
  const { items, subtotal, setQty, remove } = useCart();
  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 50;
  const total = subtotal + shipping;

  useEffect(() => {
    document.title = "Your Cart — PetPals";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold">Your Cart</h1>

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border bg-card p-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg">Your cart is empty</p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-white hover:opacity-90"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-background">
                    <img
                      src={i.image_url}
                      alt={i.name}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Link to={`/product/${i.slug}`} className="font-semibold hover:text-accent">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(i.price)}
                    </p>
                  </div>
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => setQty(i.id, i.qty - 1)} className="h-9 w-9">
                      −
                    </button>
                    <span className="w-8 text-center font-semibold">{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} className="h-9 w-9">
                      +
                    </button>
                  </div>
                  <p className="w-20 text-right font-semibold">
                    {formatPrice(i.qty * Number(i.price))}
                  </p>
                  <button
                    onClick={() => remove(i.id)}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold">Order Summary</h2>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className="mt-6 block rounded-full bg-accent py-3 text-center font-semibold text-white hover:opacity-90"
              >
                Proceed to Checkout
              </Link>
              <Link
                to="/"
                className="mt-3 block text-center text-sm text-muted-foreground hover:text-accent"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
