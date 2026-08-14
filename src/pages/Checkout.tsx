import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { useUserAuth } from "@/hooks/useUserAuth";
import { turso } from "@/integrations/turso/client";
import { toast } from "sonner";
import { Package, User, ArrowRight } from "lucide-react";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, loading } = useUserAuth();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [guestCheckout, setGuestCheckout] = useState(() => {
    try {
      return localStorage.getItem("checkout_guest") === "1";
    } catch {
      return false;
    }
  });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });
  const shipping = subtotal > 50 || subtotal === 0 ? 0 : 5;
  const total = subtotal + shipping;

  useEffect(() => {
    document.title = "Checkout — PetPals";
  }, []);

  useEffect(() => {
    if (!user) return;
    const parts = user.name.trim().split(" ");
    setForm((f) => ({
      ...f,
      first_name: f.first_name || (parts[0] ?? ""),
      last_name: f.last_name || parts.slice(1).join(" "),
    }));
  }, [user]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function continueAsGuest() {
    setGuestCheckout(true);
    try {
      localStorage.setItem("checkout_guest", "1");
    } catch {
      /* ignore */
    }
  }

  const orderSummaryBody = (
    <>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden bg-background border border-border">
              <img
                src={i.image_url}
                alt={i.name}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-medium text-foreground truncate">{i.name}</p>
              <p className="text-muted-foreground">× {i.qty}</p>
            </div>
            <span className="text-sm font-medium text-foreground shrink-0">
              ${(i.qty * Number(i.price)).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Subtotal</dt>
          <dd>${subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Shipping</dt>
          <dd>
            {shipping === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              `$${shipping.toFixed(2)}`
            )}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
          <dt>Total</dt>
          <dd>${total.toFixed(2)}</dd>
        </div>
      </dl>
    </>
  );

  const orderAside = (
    <aside className="h-fit border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Your order</h2>
      </div>
      <div className="px-6 py-5">{orderSummaryBody}</div>
    </aside>
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setPlacing(true);
    try {
      await turso.execute({
        sql: "INSERT INTO orders (id, first_name, last_name, phone, address, items, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          crypto.randomUUID(),
          form.first_name.trim(),
          form.last_name.trim(),
          form.phone.trim(),
          form.address.trim(),
          JSON.stringify(
            items.map((i) => ({
              id: i.id,
              name: i.name,
              qty: i.qty,
              price: Number(i.price),
              image_url: i.image_url,
            })),
          ),
          total,
        ],
      });
      clear();
      try { localStorage.setItem("petpals_last_phone", form.phone.trim()); } catch { /* */ }
      toast.success("Order placed!", { description: "We'll contact you shortly to confirm." });
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error placing order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/" className="mt-4 inline-block text-sm text-accent hover:underline">
              ← Back to store
            </Link>
          </div>
        ) : loading ? (
          <p className="py-20 text-center text-muted-foreground">Loading…</p>
        ) : !user && !guestCheckout ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="border border-border">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-base font-semibold">Checkout</h2>
                </div>
                <div className="px-6 py-8">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Have an account?</h3>
                      <p className="text-sm text-muted-foreground">
                        Sign in for a faster checkout and order tracking. Prefer not to? That's
                        fine — you can check out as a guest.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/login?redirect=/checkout"
                    className="mt-6 flex w-full items-center justify-center gap-2 border border-accent bg-accent py-3 text-sm font-semibold text-white hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    Sign in to checkout
                  </Link>
                  <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <button
                    onClick={continueAsGuest}
                    className="flex w-full items-center justify-center gap-2 border border-border py-3 text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Continue as guest <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            {orderAside}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {user && (
                <div className="mb-4 flex items-center justify-between border border-border px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> Signed in as{" "}
                    <span className="font-medium text-foreground">{user.name}</span>
                  </span>
                  <Link to="/login?redirect=/checkout" className="text-accent hover:underline">
                    Switch account
                  </Link>
                </div>
              )}
              {!user && guestCheckout && (
                <div className="mb-4 flex items-center justify-between border border-border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Checking out as a guest</span>
                  <Link to="/login?redirect=/checkout" className="text-accent hover:underline">
                    Sign in instead
                  </Link>
                </div>
              )}
              <div className="border border-border">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-base font-semibold">Your details</h2>
                </div>
                <div className="px-6 py-5">
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">First name</label>
                      <input
                        required
                        maxLength={100}
                        placeholder="e.g. John"
                        value={form.first_name}
                        onChange={(e) => update("first_name", e.target.value)}
                        className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Last name</label>
                      <input
                        required
                        maxLength={100}
                        placeholder="e.g. Doe"
                        value={form.last_name}
                        onChange={(e) => update("last_name", e.target.value)}
                        className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Phone number</label>
                      <input
                        required
                        maxLength={30}
                        type="tel"
                        placeholder="e.g. +1 555-123-4567"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Shipping address</label>
                      <textarea
                        required
                        maxLength={500}
                        placeholder="Street, city, postal code…"
                        value={form.address}
                        onChange={(e) => update("address", e.target.value)}
                        rows={3}
                        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent resize-none"
                      />
                    </div>
                  </div>
                  <p className="mt-5 text-xs text-muted-foreground">
                    No payment required — you'll pay on delivery.
                  </p>
                </div>
              </div>
            </div>

            <aside className="h-fit border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold">Your order</h2>
              </div>
              <div className="px-6 py-5">
                {orderSummaryBody}
                <button
                  type="submit"
                  disabled={placing}
                  className="mt-5 w-full border border-accent bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {placing ? "Placing order…" : "Place order"}
                </button>
              </div>
            </aside>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
