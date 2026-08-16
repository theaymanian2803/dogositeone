import { useEffect, useState, useRef } from "react";
import {
  Search,
  ShoppingBag,
  Lock,
  User,
  ChevronDown,
  Menu,
  PawPrint,
  Dog,
  Cat,
  Apple,
  Scissors,
  Shirt,
  Bed,
  Puzzle,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useSettings } from "@/hooks/useSettings";
import { turso } from "@/integrations/turso/client";
import { DemoBanner } from "@/components/DemoBanner";
import { formatPrice } from "@/lib/currency";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type ProductSearchResult = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  category: string;
};

const staticNav = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
];

const categoryIcons: Record<string, typeof Dog> = {
  dogs: Dog,
  cats: Cat,
  foods: Apple,
  groom: Scissors,
  collar: Shirt,
  bed: Bed,
  toys: Puzzle,
};

export function SiteHeader() {
  const { count } = useCart();
  const { user } = useUserAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef("");
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const sheetSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    turso.execute("SELECT * FROM categories ORDER BY name").then(({ rows }) => {
      setCategories(rows as unknown as { id: string; name: string; slug: string }[]);
    });
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        megaRef.current &&
        !megaRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMegaOpen(false);
      }
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMegaOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keydown);
    };
  }, [megaOpen]);

  useEffect(() => {
    latestSearch.current = search.trim();
    const q = search.trim();
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q) {
      setResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    setSearchOpen(true);
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const rs = await turso.execute({
        sql: "SELECT id, name, slug, price, image_url, category FROM products WHERE name LIKE ? OR category LIKE ? OR tag LIKE ? ORDER BY created_at DESC LIMIT 6",
        args: [`%${q}%`, `%${q}%`, `%${q}%`],
      });
      if (latestSearch.current === q) {
        setResults(rs.rows as unknown as ProductSearchResult[]);
        setSearchLoading(false);
      }
    }, 250);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [search]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        desktopSearchRef.current?.contains(e.target as Node) ||
        sheetSearchRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setSearchOpen(false);
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keydown);
    };
  }, [searchOpen]);

  function goToResults() {
    const q = search.trim();
    if (!q) return;
    setSearchOpen(false);
    setSheetOpen(false);
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  }

  function selectResult(p: ProductSearchResult) {
    setSearch("");
    setResults([]);
    setSearchOpen(false);
    setSheetOpen(false);
    navigate(`/product/${p.slug}`);
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    goToResults();
  }

  return (
    <>
      <DemoBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
          {/* Mobile menu trigger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary lg:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 sm:w-80">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-border px-6 py-4">
                  <PawPrint className="h-6 w-6 text-accent" />
                  <span className="text-lg font-bold">{settings.brand_name}</span>
                </div>
                <nav className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-1 px-3">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pages
                    </p>
                    {staticNav.map((n) => (
                      <Link
                        key={n.label}
                        to={n.to}
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        {n.label}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6 space-y-1 px-3">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Categories
                    </p>
                    {categories.map((cat) => {
                      const Icon = categoryIcons[cat.slug] || Puzzle;
                      return (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.slug}`}
                          onClick={() => setSheetOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition-colors hover:bg-secondary"
                        >
                          <Icon className="h-4 w-4 text-accent" />
                          {cat.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-6 space-y-1 px-3">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Account
                    </p>
                    {user ? (
                      <>
                        <Link
                          to="/account"
                          onClick={() => setSheetOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                          <User className="h-4 w-4 text-accent" /> My Account
                        </Link>
                        <Link
                          to="/admin"
                          onClick={() => setSheetOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                          <Lock className="h-4 w-4 text-accent" /> Admin
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <User className="h-4 w-4 text-accent" /> Sign in
                      </Link>
                    )}
                  </div>
                </nav>
                <div className="border-t border-border px-4 py-4">
                  <div ref={sheetSearchRef} className="relative">
                    <form onSubmit={handleSearch} className="relative">
                      <input
                        type="search"
                        placeholder="Search products…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-full border border-border bg-secondary/60 pl-4 pr-10 text-sm outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </form>
                    <SearchResults
                      query={search}
                      open={searchOpen}
                      loading={searchLoading}
                      results={results}
                      onSelect={selectResult}
                      onViewAll={goToResults}
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <PawPrint className="h-7 w-7 text-accent sm:h-8 sm:w-8" />
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              {settings.brand_name}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-[15px] font-medium lg:flex">
            {staticNav.map((n) => (
              <NavLink
                key={n.label}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 transition-colors hover:bg-secondary hover:text-accent ${isActive ? "text-accent" : "text-foreground"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <button
              ref={triggerRef}
              onClick={() => setMegaOpen((p) => !p)}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 transition-colors hover:bg-secondary hover:text-accent ${megaOpen ? "text-accent bg-secondary" : "text-foreground"}`}
            >
              Categories
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
              />
            </button>
          </nav>

          {/* Mega menu */}
          {megaOpen && (
            <>
              <div className="fixed inset-0 top-0 z-40" onClick={() => setMegaOpen(false)} />
              <div
                ref={megaRef}
                className="fixed left-1/2 z-50 w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/10 animate-in fade-in slide-in-from-top-3 duration-200 top-[76px]"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Shop by category
                  </h3>
                  <Link
                    to="/shop"
                    onClick={() => setMegaOpen(false)}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    View all products &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {categories.map((cat) => {
                    const Icon = categoryIcons[cat.slug] || Puzzle;
                    return (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        onClick={() => setMegaOpen(false)}
                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 transition-all hover:border-accent/30 hover:bg-accent/5 hover:shadow-sm"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize">{cat.name}</p>
                          <p className="text-[11px] text-muted-foreground">Browse products</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <div ref={desktopSearchRef} className="relative hidden md:block lg:w-72">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="search"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-secondary/60 pl-4 pr-10 text-sm outline-none transition-colors focus:border-accent"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </form>
              <SearchResults
                query={search}
                open={searchOpen}
                loading={searchLoading}
                results={results}
                onSelect={selectResult}
                onViewAll={goToResults}
              />
            </div>
            <Link
              to="/cart"
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                to="/account"
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
              >
                <User className="h-4 w-4" />
                <span className="max-w-20 truncate lg:max-w-28">{user.name || user.email}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
                aria-label="Sign in"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <Link
              to="/admin"
              className="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              aria-label="Admin"
            >
              <Lock className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function SearchResults({
  query,
  open,
  loading,
  results,
  onSelect,
  onViewAll,
}: {
  query: string;
  open: boolean;
  loading: boolean;
  results: ProductSearchResult[];
  onSelect: (p: ProductSearchResult) => void;
  onViewAll: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
      {loading ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
      ) : results.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No products found for “{query}”</p>
      ) : (
        <>
          <ul className="max-h-80 overflow-y-auto">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-11 w-11 rounded-lg border border-border bg-background object-contain p-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{formatPrice(p.price)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onViewAll}
            className="w-full border-t border-border px-4 py-2.5 text-center text-sm font-medium text-accent transition-colors hover:bg-secondary"
          >
            View all results for “{query}” &rarr;
          </button>
        </>
      )}
    </div>
  );
}
