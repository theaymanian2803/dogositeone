import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lock, ShoppingBag, Tag, Truck } from "lucide-react";

import { BagSheet } from "@/components/bag-sheet";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import { Button } from "@/components/ui/button";
import { createOrderFn, customerSessionFn, getStoreSettingsFn, quoteOrderFn } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/commerce";
import type { CheckoutCustomer, CheckoutTotals } from "@/lib/checkout";
import { LocaleProvider, useT } from "@/lib/locale";
import type { StoreSettings } from "@/lib/store-settings";
import { orderWhatsAppMessage, whatsappHref } from "@/lib/whatsapp";

export const Route = createFileRoute("/checkout")({
  loader: async () => {
    const [settings, session] = await Promise.all([getStoreSettingsFn(), customerSessionFn()]);
    return { settings, user: session.user };
  },
  head: () => ({
    meta: [
      { title: "Checkout — PetPals" },
      {
        name: "description",
        content: "Complete your PetPals order. Cash on delivery — no card needed.",
      },
    ],
  }),
  component: Checkout,
});

const initialCustomer: CheckoutCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  notes: "",
};

const QUOTE_CUSTOMER: CheckoutCustomer = {
  name: "Quote",
  email: "quote@local.test",
  phone: "+10000000000",
  address: "—",
  city: "—",
  postalCode: "—",
  country: "—",
};

type Confirmation = { orderNumber: string; total: number; whatsappHref: string | null };

function Checkout() {
  const { settings, user } = Route.useLoaderData();
  return (
    <LocaleProvider language={settings.store_locale.language}>
      <CheckoutBody settings={settings} user={user} />
    </LocaleProvider>
  );
}

function CheckoutBody({
  settings,
  user,
}: {
  settings: StoreSettings;
  user: { name: string | null; email: string; role?: string } | null;
}) {
  const { t } = useT();
  const { bag, bagTotal, bagCount, clearBag, setBagOpen } = useCart();
  const [customer, setCustomer] = useState<CheckoutCustomer>(initialCustomer);
  const [attemptKey] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [quote, setQuote] = useState<CheckoutTotals | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  const bagKey = bag.map((item) => `${item.product.id}-${item.size}-${item.quantity}`).join("|");
  const currency = settings.store_shipping.currency;

  useEffect(() => {
    if (bag.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    void quoteOrderFn({
      data: {
        customer: QUOTE_CUSTOMER,
        items: bag.map((item) => ({
          productId: item.product.id,
          size: item.size,
          quantity: item.quantity,
        })),
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      },
    }).then((result) => {
      if (!cancelled && result.ok) setQuote(result.totals);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bagKey, appliedCoupon]);

  const fallbackShipping =
    bagTotal >= settings.store_shipping.freeThreshold ? 0 : settings.store_shipping.flatRate;
  const totals = quote ?? {
    subtotal: bagTotal,
    shipping: bagTotal === 0 ? 0 : fallbackShipping,
    discount: 0,
    total: bagTotal === 0 ? 0 : bagTotal + fallbackShipping,
  };

  const itemErrors = Object.entries(errors).filter(([field]) => field.startsWith("items"));

  function update(field: keyof CheckoutCustomer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function applyCoupon() {
    setCouponMessage("");
    if (!couponInput.trim()) {
      setAppliedCoupon("");
      setCouponMessage("Enter a code first.");
      return;
    }
    const result = await quoteOrderFn({
      data: {
        customer: QUOTE_CUSTOMER,
        items: bag.map((item) => ({
          productId: item.product.id,
          size: item.size,
          quantity: item.quantity,
        })),
        couponCode: couponInput.trim(),
      },
    });
    if (!result.ok) {
      setCouponMessage(result.errors[0]?.message ?? "That code is not valid.");
      return;
    }
    setAppliedCoupon(result.couponCode ?? couponInput.trim().toUpperCase());
    setQuote(result.totals);
    setCouponMessage("Code applied.");
  }

  function removeCoupon() {
    setAppliedCoupon("");
    setCouponInput("");
    setCouponMessage("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});

    try {
      const result = await createOrderFn({
        data: {
          customer,
          idempotencyKey: attemptKey,
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          items: bag.map((item) => ({
            productId: item.product.id,
            size: item.size,
            quantity: item.quantity,
          })),
        },
      });

      if (result.ok) {
        const message = orderWhatsAppMessage({
          shopName: settings.store_branding.name,
          orderNumber: result.orderNumber,
          customer,
          items: bag.map((item) => ({
            name: item.product.name,
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
          total: result.total,
          currency,
        });
        const link =
          settings.store_whatsapp.enabled && settings.store_whatsapp.number
            ? whatsappHref(settings.store_whatsapp.number, message)
            : null;
        setConfirmation({
          orderNumber: result.orderNumber,
          total: result.total,
          whatsappHref: link === "#" ? null : link,
        });
        clearBag();
      } else {
        setErrors(Object.fromEntries(result.errors.map((error) => [error.field, error.message])));
      }
    } catch {
      setErrors({ form: "We couldn't place that order. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ThemeStyle theme={settings.store_theme} />
      <SiteHeader settings={settings} user={user} />

      {confirmation ? (
        <ConfirmationPanel confirmation={confirmation} currency={currency} />
      ) : bag.length === 0 ? (
        <EmptyCheckout />
      ) : (
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-14 lg:py-16">
          <form onSubmit={submit} noValidate className="min-w-0">
            <Link
              to="/"
              hash="shop"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:text-hot-pink"
            >
              <ArrowLeft className="size-3.5" /> Keep shopping
            </Link>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
              Checkout / 01
            </p>
            <h1 className="font-display mt-2 text-[42px] font-extrabold leading-[0.9] sm:text-[56px]">
              {t("checkout.title").toUpperCase()}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {user ? (
                <>
                  Signed in as <span className="font-semibold text-foreground">{user.email}</span>.
                  Delivery details for this order.
                </>
              ) : (
                <>
                  Checking out as a guest.{" "}
                  <Link to="/account" className="font-semibold text-hot-pink">
                    Sign in
                  </Link>{" "}
                  or continue below — no account needed.
                </>
              )}
            </p>

            {errors["form"] && (
              <p
                role="alert"
                className="mt-5 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive"
              >
                {errors["form"]}
              </p>
            )}
            {itemErrors.length > 0 && (
              <ul
                role="alert"
                className="mt-5 space-y-1 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive"
              >
                {itemErrors.map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            )}

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Field
                label={t("checkout.fullName")}
                name="name"
                value={customer.name}
                onChange={update}
                error={errors["name"]}
                autoComplete="name"
              />
              <Field
                label={t("checkout.email")}
                name="email"
                type="email"
                value={customer.email}
                onChange={update}
                error={errors["email"]}
                autoComplete="email"
              />
              <Field
                label={t("checkout.phone")}
                name="phone"
                type="tel"
                value={customer.phone}
                onChange={update}
                error={errors["phone"]}
                autoComplete="tel"
              />
              <Field
                label={t("checkout.country")}
                name="country"
                value={customer.country}
                onChange={update}
                error={errors["country"]}
                autoComplete="country-name"
              />
              <div className="sm:col-span-2">
                <Field
                  label={t("checkout.address")}
                  name="address"
                  value={customer.address}
                  onChange={update}
                  error={errors["address"]}
                  autoComplete="street-address"
                />
              </div>
              <Field
                label={t("checkout.city")}
                name="city"
                value={customer.city}
                onChange={update}
                error={errors["city"]}
                autoComplete="address-level2"
              />
              <Field
                label={t("checkout.postalCode")}
                name="postalCode"
                value={customer.postalCode}
                onChange={update}
                error={errors["postalCode"]}
                autoComplete="postal-code"
              />
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {t("checkout.notes")}
                </span>
                <textarea
                  value={customer.notes ?? ""}
                  onChange={(event) => update("notes", event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Anything we should know about delivery"
                  className="mt-2 w-full resize-none border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-hot-pink"
                />
                {errors["notes"] && (
                  <span className="mt-1 block text-[10px] text-destructive">{errors["notes"]}</span>
                )}
              </label>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-4 border border-border px-4 py-3 text-[10px] leading-4 text-muted-foreground">
                <p className="flex items-center gap-2 font-bold uppercase tracking-[0.12em] text-foreground">
                  <Truck className="size-3.5 text-hot-pink" aria-hidden="true" />
                  {settings.store_shipping.codLabel}
                </p>
                <p className="mt-1.5">{t("checkout.codNote")}</p>
                <p className="mt-1">
                  {t("checkout.deliveryTime")}: {settings.store_shipping.deliveryTime}
                </p>
                {settings.store_shipping.minOrder > 0 && (
                  <p className="mt-1">
                    {t("checkout.minOrder")}: {settings.store_shipping.minOrder} {currency}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={pending}
                className="h-13 w-full rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.12em] text-background hover:bg-hot-pink hover:text-foreground disabled:cursor-wait disabled:opacity-70"
              >
                {pending
                  ? t("common.loading")
                  : `${t("checkout.placeOrder")} - ${formatMoney(totals.total, currency)}`}
                {pending ? <Lock className="size-4" /> : <ArrowRight className="size-4" />}
              </Button>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                {settings.store_shipping.codLabel}. {settings.store_shipping.deliveryTime}.
              </p>
            </div>
          </form>

          <aside
            className="min-w-0 lg:sticky lg:top-[92px] lg:self-start"
            aria-label="Order summary"
          >
            <div className="border border-border">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-xl font-bold">
                  {t("checkout.orderSummary").toUpperCase()}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {bagCount} {bagCount === 1 ? "piece" : "pieces"}
                </span>
              </div>

              <ul className="max-h-[420px] overflow-y-auto px-5">
                {bag.map((item) => (
                  <li
                    key={`${item.product.id}-${item.size}`}
                    className="flex gap-4 border-b border-border py-4 last:border-b-0"
                  >
                    <img
                      src={item.product.image}
                      alt=""
                      width={160}
                      height={200}
                      className="h-24 w-20 bg-secondary object-cover"
                    />
                    <div className="flex min-w-0 flex-1 justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.product.name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {item.product.color} · Size {item.size}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatMoney(item.product.price * item.quantity, currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border px-5 py-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  Discount code
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    className="h-10 min-w-0 flex-1 border border-border bg-background px-3 text-sm font-mono outline-none focus:border-hot-pink"
                  />
                  {appliedCoupon ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={removeCoupon}
                      className="rounded-none text-[10px] uppercase"
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={applyCoupon}
                      className="rounded-none text-[10px] uppercase"
                    >
                      <Tag className="size-3.5" /> Apply
                    </Button>
                  )}
                </div>
                {couponMessage && (
                  <p
                    className={`mt-1.5 text-[10px] ${couponMessage === "Code applied." ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {couponMessage}
                  </p>
                )}
                {appliedCoupon && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Applied: <span className="font-mono font-semibold">{appliedCoupon}</span>
                  </p>
                )}
                {errors["coupon"] && (
                  <p className="mt-1.5 text-[10px] text-destructive">{errors["coupon"]}</p>
                )}
              </div>

              <div className="space-y-2 border-t border-border px-5 py-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("checkout.subtotal")}</span>
                  <span>{formatMoney(totals.subtotal, currency)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("checkout.discount")}</span>
                    <span className="text-emerald-600">
                      -{formatMoney(totals.discount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Truck className="size-3.5" /> {t("checkout.shippingFee")}
                  </span>
                  <span>
                    {totals.shipping === 0 ? "Free" : formatMoney(totals.shipping, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold">
                  <span>{t("checkout.total")}</span>
                  <span>{formatMoney(totals.total, currency)}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
              {settings.store_shipping.codLabel}. {settings.store_shipping.deliveryTime}.
            </p>
          </aside>
        </div>
      )}

      <SiteFooter settings={settings} />
      <BagSheet />
    </main>
  );
}

type FieldProps = {
  label: string;
  name: keyof CheckoutCustomer;
  value: string;
  onChange: (field: keyof CheckoutCustomer, value: string) => void;
  error?: string | undefined;
  type?: string;
  autoComplete?: string;
};

function Field({ label, name, value, onChange, error, type = "text", autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        autoComplete={autoComplete}
        className={`mt-2 h-11 w-full border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-hot-pink ${error ? "border-destructive" : "border-border"}`}
      />
      {error && <span className="mt-1 block text-[10px] text-destructive">{error}</span>}
    </label>
  );
}

function ConfirmationPanel({
  confirmation,
  currency,
}: {
  confirmation: Confirmation;
  currency: string;
}) {
  const { t } = useT();
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[900px] flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <span className="flex size-14 items-center justify-center rounded-full bg-hot-pink">
        <Check className="size-7 text-foreground" aria-hidden="true" />
      </span>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
        {t("checkout.orderPlaced")}
      </p>
      <h1 className="font-display mt-3 text-[46px] font-extrabold leading-[0.9] sm:text-[68px]">
        YOU&apos;RE
        <br />
        <span className="text-hot-pink">ALL SET.</span>
      </h1>
      <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
        {t("checkout.orderNumber")}{" "}
        <span className="font-semibold text-foreground">{confirmation.orderNumber}</span>.{" "}
        {t("checkout.codNote")}
      </p>
      <p className="mt-2 text-sm font-semibold">
        {t("checkout.total")} {formatMoney(confirmation.total, currency)}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {confirmation.whatsappHref && (
          <Button
            asChild
            className="h-12 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            <a href={confirmation.whatsappHref} target="_blank" rel="noopener noreferrer">
              {t("checkout.whatsappOrder")} <ArrowRight className="size-4" />
            </a>
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-none px-6 text-xs font-bold uppercase tracking-[0.1em]"
        >
          <Link to="/" hash="shop">
            {t("checkout.backToStore")}
          </Link>
        </Button>
      </div>
    </section>
  );
}

function EmptyCheckout() {
  const { t } = useT();
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[900px] flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <ShoppingBag className="size-8 text-hot-pink" aria-hidden="true" />
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
        {t("checkout.title")}
      </p>
      <h1 className="font-display mt-3 text-[46px] font-extrabold leading-[0.9] sm:text-[64px]">
        NOTHING
        <br />
        <span className="text-hot-pink">TO CHECK OUT.</span>
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">{t("checkout.empty")}</p>
      <Button
        asChild
        className="mt-7 h-12 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
      >
        <Link to="/" hash="shop">
          {t("common.shopNow")} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}
