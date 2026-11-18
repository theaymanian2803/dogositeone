import { useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowRight, Chrome, LayoutDashboard, LogOut, Package, User } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import { Button } from "@/components/ui/button";
import { AccountRecovery } from "@/components/account-recovery";
import { Input } from "@/components/ui/input";
import {
  authOptionsFn,
  customerLoginFn,
  customerLogoutFn,
  customerRegisterFn,
  customerSessionFn,
  getStoreSettingsFn,
  listProductsFn,
  myOrdersFn,
  myWishlistFn,
} from "@/lib/api";
import { formatMoney } from "@/lib/commerce";
import { LocaleProvider } from "@/lib/locale";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search["google"] === "string" ? { google: search["google"] } : {},
  loader: async () => {
    const [session, settings, orders, wishlist, products, options] = await Promise.all([
      customerSessionFn(),
      getStoreSettingsFn(),
      myOrdersFn(),
      myWishlistFn(),
      listProductsFn(),
      authOptionsFn(),
    ]);
    return {
      user: session.user,
      settings,
      orders,
      wishlist,
      options,
      savedProducts: products.filter((product) => wishlist.includes(product.id)),
    };
  },
  head: () => ({ meta: [{ title: "Your account ��� PetPals" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, settings, orders, savedProducts, options } = Route.useLoaderData();
  const { google } = Route.useSearch();
  const router = useRouter();

  return (
    <LocaleProvider language={settings.store_locale.language}>
      <main className="min-h-screen bg-background text-foreground">
        <ThemeStyle theme={settings.store_theme} />
        <SiteHeader settings={settings} user={user} />
        {user ? (
          <SignedIn
            user={user}
            orders={orders}
            savedProducts={savedProducts}
            currency={settings.store_shipping.currency}
            onLogout={async () => {
              await customerLogoutFn();
              await router.invalidate();
            }}
          />
        ) : (
          <SignedOut
            googleEnabled={options.google}
            googleError={google}
            onDone={() => router.invalidate()}
          />
        )}
        <SiteFooter settings={settings} />
      </main>
    </LocaleProvider>
  );
}

function SignedOut({
  googleEnabled,
  googleError,
  onDone,
}: {
  googleEnabled: boolean;
  googleError?: string | undefined;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const googleMessages: Record<string, string> = {
    denied: "Google sign-in was cancelled.",
    state: "That sign-in link expired. Try again.",
    token: "Google sign-in failed. Try again.",
    profile: "Could not read your Google profile.",
    email: "Google did not return a verified email.",
    unconfigured: "Google sign-in is not configured yet.",
    staff: "Staff accounts sign in with email and password at /admin/login.",
  };
  const googleMessage = googleError
    ? (googleMessages[googleError] ?? "Google sign-in failed.")
    : "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result =
      mode === "login"
        ? await customerLoginFn({ data: { email, password } })
        : await customerRegisterFn({ data: { email, password, ...(name ? { name } : {}) } });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <section className="mx-auto grid max-w-[1100px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">Account</p>
        <h1 className="font-display mt-2 text-[44px] font-extrabold leading-[0.9] sm:text-[60px]">
          YOUR PetPals
          <br />
          <span className="text-hot-pink">ACCOUNT.</span>
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
          Sign in to see your orders, save pieces and keep your details in one place. Guests can
          still check out without an account.
        </p>
        <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <Package className="size-4 text-hot-pink" /> Order history
          </li>
          <li className="flex items-center gap-2">
            <User className="size-4 text-hot-pink" /> Saved pieces
          </li>
        </ul>
      </div>

      <div className="border border-border p-6">
        {googleEnabled ? (
          <a
            href="/api/auth/google"
            className="flex h-11 w-full items-center justify-center gap-2 border border-border bg-background text-[10px] font-bold uppercase tracking-[0.1em] transition-colors hover:border-foreground hover:text-hot-pink"
          >
            <Chrome className="size-4" /> Continue with Google
          </a>
        ) : (
          <p className="border border-dashed border-border px-3 py-2 text-[10px] leading-4 text-muted-foreground">
            Google sign-in appears here once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
          </p>
        )}
        {googleMessage && (
          <p
            role="alert"
            className="mt-2 border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
          >
            {googleMessage}
          </p>
        )}

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            or use email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex gap-1 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("login")}
            className={`rounded-none text-[10px] uppercase tracking-[0.1em] ${mode === "login" ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "text-muted-foreground"}`}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode("register")}
            className={`rounded-none text-[10px] uppercase tracking-[0.1em] ${mode === "register" ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "text-muted-foreground"}`}
          >
            Create account
          </Button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Name</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 rounded-none"
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 rounded-none"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 rounded-none"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {error && (
            <p
              role="alert"
              className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-none bg-foreground text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            {pending ? "Working�Ǫ" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setRecovering((value) => !value)}
          className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-hot-pink hover:underline"
        >
          Forgot password?
        </button>

        {recovering && <AccountRecovery initialEmail={email} onBack={() => setRecovering(false)} />}

        <p className="mt-4 border-t border-border pt-4 text-center text-[10px] leading-4 text-muted-foreground">
          Prefer not to sign up?{" "}
          <Link to="/" hash="shop" className="font-semibold text-hot-pink">
            Continue as guest
          </Link>{" "}
          ��� checkout works without an account.
        </p>
      </div>
    </section>
  );
}

function SignedIn({
  user,
  orders,
  savedProducts,
  currency,
  onLogout,
}: {
  user: { name: string | null; email: string; role: string };
  orders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    items: Array<{ id: string; name: string; size: string; quantity: number }>;
  }>;
  savedProducts: Array<{ id: string; name: string; color: string; price: number; image: string }>;
  currency: string;
  onLogout: () => void;
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">Account</p>
          <h1 className="font-display mt-1 text-[40px] font-extrabold leading-none">
            HELLO{user.name ? `, ${user.name.toUpperCase()}` : ""}.
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {(user.role === "admin" || user.role === "moderator") && (
            <Button
              asChild
              className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
            >
              <Link to="/admin">
                <LayoutDashboard className="size-3.5" /> Open admin
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onLogout}
            className="rounded-none text-[10px] uppercase tracking-[0.08em]"
          >
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]">Orders</h2>
          {orders.length === 0 ? (
            <p className="mt-3 border border-border p-6 text-xs text-muted-foreground">
              No orders yet.{" "}
              <Link to="/" hash="shop" className="font-semibold text-hot-pink">
                Shop the collection
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {orders.map((order) => (
                <li key={order.id} className="border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg font-bold">{order.orderNumber}</p>
                    <span className="border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.name} -� {item.size} -� +�{item.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm font-semibold">{formatMoney(order.total, currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]">Saved pieces</h2>
          {savedProducts.length === 0 ? (
            <p className="mt-3 border border-border p-6 text-xs text-muted-foreground">
              Nothing saved yet. Tap the heart on a product page.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {savedProducts.map((product) => (
                <Link
                  key={product.id}
                  to="/products/$productId"
                  params={{ productId: product.id }}
                  className="group border border-border"
                >
                  <img
                    src={product.image}
                    alt=""
                    className="aspect-[4/5] w-full bg-secondary object-cover"
                  />
                  <div className="p-2">
                    <p className="truncate text-[11px] font-semibold group-hover:text-hot-pink">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">${product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Button
            asChild
            variant="outline"
            className="mt-4 w-full rounded-none text-[10px] uppercase tracking-[0.08em]"
          >
            <Link to="/" hash="shop">
              Continue shopping <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
