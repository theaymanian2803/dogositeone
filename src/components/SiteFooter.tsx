export function SiteFooter() {
  const cols = [
    { title: "Shop", links: ["Dogs", "Cats", "Brands", "New Arrivals"] },
    { title: "Help", links: ["Contact", "Shipping", "Returns", "FAQ"] },
    { title: "Company", links: ["About", "Careers", "Press", "Sustainability"] },
  ];
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white">
              🐾
            </span>
            PetPals
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Everything your furry friend needs, delivered with love to your door.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-bold uppercase tracking-wider">{c.title}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-accent">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PetPals. Made with love for pets everywhere.
      </div>
    </footer>
  );
}
