import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";

import { useT } from "@/lib/locale";
import type { StoreSettings } from "@/lib/store-settings";

export function SiteFooter({ settings }: { settings: StoreSettings }) {
  const { t } = useT();
  const branding = settings.store_branding;
  const footer = settings.store_footer;

  return (
    <footer className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 md:px-14">
      <div className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="font-display text-2xl font-extrabold">
            {branding.logoText}
            <span className="text-hot-pink">.</span>
          </Link>
          <p className="mt-3 max-w-xs text-[11px] leading-5 text-muted-foreground">{footer.note}</p>
        </div>

        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]">{t("footer.store")}</h2>
          <ul className="mt-3 space-y-2 text-[11px] text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:text-hot-pink">
                Shop all
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "dogs" }} className="hover:text-hot-pink">
                Dogs
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "cats" }} className="hover:text-hot-pink">
                Cats
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "foods" }} className="hover:text-hot-pink">
                Food
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]">
            {t("footer.support")}
          </h2>
          <ul className="mt-3 space-y-2 text-[11px] text-muted-foreground">
            {footer.companyLinks.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <Link to={link.href} className="hover:text-hot-pink">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/account" className="hover:text-hot-pink">
                {t("header.account")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]">
            {t("footer.contact")}
          </h2>
          <ul className="mt-3 space-y-2 text-[11px] text-muted-foreground">
            <li>{settings.store_contact.email}</li>
            <li>{settings.store_contact.phone}</li>
            <li>{settings.store_contact.hours}</li>
            <li className="flex items-center gap-2">
              {footer.socials.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="hover:text-hot-pink"
                >
                  <Instagram className="size-4" />
                </a>
              ))}
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} {branding.name} — All rights reserved
        </span>
        <span>Built with TanStack Start · Turso</span>
      </div>
    </footer>
  );
}
