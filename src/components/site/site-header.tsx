import { Link } from "@tanstack/react-router";
import { Heart, LayoutDashboard, Search, ShoppingBag, User } from "lucide-react";

import { WhatsAppFloat } from "@/components/site/whatsapp-order";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/locale";
import type { StoreSettings } from "@/lib/store-settings";

export function SiteHeader({
  settings,
  user,
}: {
  settings: StoreSettings;
  user?: { name: string | null; email: string; role?: string } | null;
}) {
  const { bagCount, setBagOpen } = useCart();
  const { t } = useT();
  const branding = settings.store_branding;
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  return (
    <>
      {settings.store_megamenu.enabled && branding.announcement && (
        <div className="flex min-h-8 items-center justify-center bg-foreground px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-background">
          <span>
            {branding.announcement.split("/")[0]}
            {branding.announcement.includes("/") && <span className="mx-2 text-hot-pink">/</span>}
            {branding.announcement.split("/").slice(1).join("/") || ""}
          </span>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-14">
          <Link
            to="/"
            aria-label={`${branding.name} home`}
            className="font-display text-[28px] font-extrabold leading-none tracking-[0.02em]"
          >
            {branding.logoText}
            <span className="text-hot-pink">.</span>
          </Link>

          <nav aria-label="Collections" className="hidden items-center gap-7 sm:flex">
            <Link
              to="/shop"
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Shop all
            </Link>
            <Link
              to="/shop"
              search={{ category: "dogs" }}
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Dogs
            </Link>
            <Link
              to="/shop"
              search={{ category: "cats" }}
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Cats
            </Link>
            <Link
              to="/shop"
              search={{ category: "foods" }}
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Food
            </Link>
            <Link
              to="/shop"
              search={{ category: "groom" }}
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Grooming
            </Link>
            <Link
              to="/pages/$pageKey"
              params={{ pageKey: "contact" }}
              className="text-xs font-semibold transition-colors hover:text-hot-pink"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {isStaff && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-none px-2 text-[9px] font-bold uppercase tracking-[0.08em]"
              >
                <Link to="/admin" aria-label="Open the store admin">
                  <LayoutDashboard className="size-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" aria-label="Search the collection">
              <Link to="/" hash="shop">
                <Search className="size-[19px]" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={user ? `Account, ${user.email}` : "Sign in"}
            >
              <Link to="/account">
                <User className="size-[19px]" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Saved pieces">
              <Link to="/account">
                <Heart className="size-[19px]" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setBagOpen(true)}
              aria-label={`Shopping bag, ${bagCount} items`}
              className="relative flex h-10 items-center gap-2 px-2"
            >
              <ShoppingBag className="size-[19px]" />
              <span className="hidden text-xs sm:inline">{t("header.cart")}</span>
              <span className="flex size-5 items-center justify-center rounded-full bg-hot-pink text-[10px] font-bold text-foreground">
                {bagCount}
              </span>
            </Button>
          </div>
        </div>
      </header>
      <WhatsAppFloat settings={settings.store_whatsapp} />
    </>
  );
}
