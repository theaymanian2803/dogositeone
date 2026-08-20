import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";

export function SiteFooter() {
  const { settings } = useSettings();
  const cols: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: "Shop",
      links: [
        { label: "Dogs", to: "/category/dogs" },
        { label: "Cats", to: "/category/cats" },
        { label: "Brands", to: "/shop" },
        { label: "New Arrivals", to: "/shop" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "Contact", to: "/contact" },
        { label: "Shipping", to: "/shipping" },
        { label: "Returns", to: "/returns" },
        { label: "FAQ", to: "/faq" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Careers", to: "/careers" },
        { label: "Press", to: "/press" },
        { label: "Sustainability", to: "/sustainability" },
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
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-bold uppercase tracking-wider">{c.title}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {settings.brand_name}. Made with love for pets everywhere.
      </div>
    </footer>
  );
}
