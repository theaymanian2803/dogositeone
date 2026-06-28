import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { turso } from "@/integrations/turso/client";
import { toast } from "sonner";
import { Package } from "lucide-react";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
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

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
        ) : (
          <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
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
                    <dd>{shipping === 0 ? <span className="text-emerald-600">Free</span> : `$${shipping.toFixed(2)}`}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                    <dt>Total</dt>
                    <dd>${total.toFixed(2)}</dd>
                  </div>
                </dl>
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
