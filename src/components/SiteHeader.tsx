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
import { turso } from "@/integrations/turso/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [search, setSearch] = useState("");
  const [megaOpen, setMegaOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    turso.execute("SELECT * FROM categories ORDER BY name").then(({ rows }) => {
      setCategories(rows as { id: string; name: string; slug: string }[]);
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

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = search.trim();
    if (q) {
      navigate(`/shop?q=${encodeURIComponent(q)}`);
      setSheetOpen(false);
    }
  }

  return (
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
                <span className="text-lg font-bold">PetPals</span>
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
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <PawPrint className="h-7 w-7 text-accent sm:h-8 sm:w-8" />
          <span className="text-lg font-bold tracking-tight sm:text-xl">PetPals</span>
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
          <form onSubmit={handleSearch} className="relative hidden md:block lg:w-72">
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
  );
}
