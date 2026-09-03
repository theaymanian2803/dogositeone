import { Link } from "react-router-dom";
import { Facebook, Instagram, Music2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const cols: { title: string; links: { key: string; to: string }[] }[] = [
    {
      title: "footer.shop",
      links: [
        { key: "footer.dogs", to: "/category/dogs" },
        { key: "footer.cats", to: "/category/cats" },
        { key: "footer.brands", to: "/shop" },
        { key: "footer.newArrivals", to: "/shop" },
      ],
    },
    {
      title: "footer.help",
      links: [
        { key: "footer.track", to: "/track" },
        { key: "footer.contact", to: "/contact" },
        { key: "footer.shipping", to: "/shipping" },
        { key: "footer.returns", to: "/returns" },
        { key: "footer.faq", to: "/faq" },
      ],
    },
    {
      title: "footer.company",
      links: [
        { key: "footer.about", to: "/about" },
        { key: "footer.careers", to: "/careers" },
        { key: "footer.press", to: "/press" },
        { key: "footer.sustainability", to: "/sustainability" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold">
            {settings.brand_logo ? (
              <img
                src={settings.brand_logo}
                alt={settings.brand_name}
                className="h-9 w-9 rounded-full object-contain"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white">
                🐾
              </span>
            )}
            {settings.brand_name}
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{settings.tagline}</p>
          {(settings.instagram_url || settings.facebook_url || settings.tiktok_url) && (
            <div className="mt-5 flex items-center gap-2">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings.tiktok_url && (
                <a
                  href={settings.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Music2 className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-bold uppercase tracking-wider">{t(c.title)}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l.key}>
                  <Link to={l.to} className="transition-colors hover:text-accent">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        {t("footer.rights", { year: new Date().getFullYear(), brand: settings.brand_name })}
      </div>
    </footer>
  );
}
