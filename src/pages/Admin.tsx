import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { turso } from "@/integrations/turso/client";
import { ADMIN_EMAIL } from "@/lib/admin";
import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Hash,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Package,
  PawPrint,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  badge: string | null;
  tag: string | null;
};

type Category = { id: string; name: string; slug: string };

type OrderItem = { id: string; name: string; qty: number; price: number; image_url: string };
type Order = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const emptyForm = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  category: "",
  badge: "",
  tag: "",
};

type Tab = "products" | "categories" | "orders";

const statusConfig: Record<string, { label: string; pill: string; dot: string }> = {
  new: {
    label: "New",
    pill: "bg-blue-50 text-blue-700 ring-blue-600/20",
    dot: "bg-blue-500",
  },
  processing: {
    label: "Processing",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  shipped: {
    label: "Shipped",
    pill: "bg-violet-50 text-violet-700 ring-violet-600/20",
    dot: "bg-violet-500",
  },
  delivered: {
    label: "Delivered",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
  },
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "destructive" | "default";
  onConfirm: () => void;
} | null;

const inputClass =
  "h-10 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function Admin() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isCompactOrders = useIsMobile(1280);
  const [tab, setTab] = useState<Tab>("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    document.title = "Admin — PetPals";
  }, []);

  const pageTitle =
    tab === "orders"
      ? "Order Management"
      : tab === "products"
        ? "Product Management"
        : "Category Management";

  async function load() {
    const [pRs, cRs, oRs] = await Promise.all([
      turso.execute("SELECT * FROM products ORDER BY created_at DESC"),
      turso.execute("SELECT * FROM categories ORDER BY name"),
      turso.execute("SELECT * FROM orders ORDER BY created_at DESC"),
    ]);
    setProducts(pRs.rows as unknown as Product[]);
    setCategories(cRs.rows as unknown as Category[]);
    setOrders(
      (oRs.rows as unknown as Record<string, unknown>[]).map((r) => ({
        ...r,
        items: typeof r.items === "string" ? JSON.parse(r.items as string) : (r.items ?? []),
      })) as Order[],
    );
    if (
      cRs.rows.length &&
      !cRs.rows.find((x) => (x as Record<string, unknown>).slug === form.category)
    ) {
      setForm((f) => ({ ...f, category: (cRs.rows[0] as Record<string, unknown>).slug as string }));
    }
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  useEffect(() => {
    if (isMobile) {
      setTab("orders");
      setSidebarOpen(false);
      setShowForm(false);
      setEditingId(null);
      setConfirm(null);
    }
  }, [isMobile]);

  useEffect(() => {
    setPage(1);
  }, [orders.length]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, image_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-secondary/50 text-muted-foreground">
        Loading…
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-secondary/50">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10">
            <PawPrint className="h-7 w-7 text-accent" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Sign in required
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You need to sign in as an admin to manage PetPals.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-secondary/50">
        <div className="text-center max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50">
            <LogOut className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only{" "}
            <code className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
              {ADMIN_EMAIL}
            </code>{" "}
            can access the admin panel. You are signed in as {user.email}.
          </p>
          <button
            onClick={() => {
              signOut();
              navigate("/auth");
            }}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      image_url: p.image_url,
      category: p.category,
      badge: p.badge ?? "",
      tag: p.tag ?? "",
    });
    setShowForm(true);
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const price = parseFloat(form.price) || 0;
    try {
      if (editingId) {
        await turso.execute({
          sql: "UPDATE products SET name=?, description=?, price=?, image_url=?, category=?, badge=?, tag=? WHERE id=?",
          args: [
            form.name,
            form.description,
            price,
            form.image_url,
            form.category,
            form.badge || null,
            form.tag || null,
            editingId,
          ],
        });
        toast.success("Product updated");
      } else {
        await turso.execute({
          sql: "INSERT INTO products (id, name, slug, description, price, image_url, category, badge, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            crypto.randomUUID(),
            form.name,
            slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6),
            form.description,
            price,
            form.image_url,
            form.category,
            form.badge || null,
            form.tag || null,
          ],
        });
        toast.success("Product added");
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving product");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    setConfirm({
      title: "Delete this product?",
      message: "This product will be permanently removed from the store. Your pets will miss it.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await turso.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
          toast.success("Product deleted");
          if (editingId === id) cancelEdit();
          load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error deleting product");
        }
      },
    });
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    try {
      await turso.execute({
        sql: "INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)",
        args: [crypto.randomUUID(), name, slugify(name)],
      });
      toast.success("Category added");
      setNewCategory("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding category");
    }
  }

  async function removeCategory(id: string) {
    setConfirm({
      title: "Delete this category?",
      message:
        "This category will be permanently removed. Products in this category won't be affected.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await turso.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [id] });
          toast.success("Category deleted");
          load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error deleting category");
        }
      },
    });
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      await turso.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [status, orderId],
      });
      toast.success("Order updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating order");
    }
  }

  async function deleteOrder(id: string) {
    setConfirm({
      title: "Delete this order?",
      message:
        "This order will be permanently removed. Your customer won't be able to track it anymore.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await turso.execute({ sql: "DELETE FROM orders WHERE id = ?", args: [id] });
          toast.success("Order deleted");
          load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error deleting order");
        }
      },
    });
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const pendingOrders = orders.filter(
    (o) => o.status === "new" || o.status === "processing",
  ).length;
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / perPage));
  const paginatedOrders = orders.slice((page - 1) * perPage, page * perPage);

  const navItems: { key: Tab; label: string; icon: typeof Box; count: number }[] = [
    { key: "products", label: "Products", icon: Package, count: products.length },
    { key: "categories", label: "Categories", icon: Layers, count: categories.length },
    { key: "orders", label: "Orders", icon: ShoppingCart, count: orders.length },
  ];

  return (
    <div className="flex min-h-screen bg-secondary/50">
      {/* Mobile sidebar overlay */}
      {!isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isMobile && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10">
              <PawPrint className="h-5 w-5 text-accent" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">PetPals</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setSidebarOpen(false);
                  cancelEdit();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-all ${
                  tab === item.key
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                <span
                  className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    tab === item.key
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </nav>

          {/* User info */}
          <div className="border-t border-border px-4 py-4">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <button
              onClick={() => {
                signOut();
                navigate("/");
              }}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </aside>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              {!isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-secondary transition-colors"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
              )}
              <h1 className="text-lg font-bold tracking-tight text-foreground">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-muted-foreground">{user.email}</span>
              <button
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 h-9 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className={`flex-1 ${tab === "orders" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}
        >
          {/* ───── STATS ROW ───── */}
          <div className="px-4 sm:px-6 pt-6 pb-2">
            <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: "Total Products", value: products.length, icon: Package },
                { label: "Categories", value: categories.length, icon: Layers },
                { label: "Pending Orders", value: pendingOrders, icon: ShoppingCart },
                {
                  label: "Revenue",
                  value: `$${totalRevenue.toFixed(0)}`,
                  icon: DollarSign,
                  accent: true,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-card rounded-2xl border border-border p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.accent ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}
                    >
                      <s.icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ───── CONTENT ───── */}
          <div
            className={`px-4 sm:px-6 ${tab === "orders" ? "pt-4 pb-0 flex flex-col flex-1 min-h-0" : "py-6"}`}
          >
            {/* ───── ORDERS TAB ───── */}
            {tab === "orders" && (
              <div className="flex-1 min-h-0 overflow-auto">
                {orders.length === 0 && (
                  <div className="rounded-2xl bg-card p-12 text-center shadow-sm">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
                      <Package className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">No orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Orders will appear here once customers check out.
                    </p>
                  </div>
                )}
                {orders.length > 0 &&
                  (isCompactOrders ? (
                    <div className="space-y-3 pb-4">
                      {paginatedOrders.map((o) => {
                        const shortId = o.id.slice(0, 8).toUpperCase();
                        const initials =
                          ((o.first_name?.[0] ?? "") + (o.last_name?.[0] ?? "")).toUpperCase() ||
                          "?";
                        const dateStr = new Date(o.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <div key={o.id} className="overflow-hidden rounded-2xl bg-card shadow-sm">
                            <div className="flex items-start justify-between gap-3 px-5 py-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-muted-foreground">
                                  <Hash className="h-3 w-3" />
                                  <span>ORD-{shortId}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-foreground">
                                    {initials}
                                  </div>
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {o.first_name} {o.last_name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{dateStr}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-base font-bold tracking-tight text-foreground">
                                  ${Number(o.total).toFixed(2)}
                                </div>
                                <span
                                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    statusConfig[o.status]?.pill || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5  ${statusConfig[o.status]?.dot || "bg-muted-foreground"}`}
                                  />
                                  {statusConfig[o.status]?.label || o.status}
                                </span>
                              </div>
                            </div>

                            <div className="px-5 py-3 bg-secondary/50 space-y-2">
                              {(o.items ?? []).map((it, idx) => (
                                <div key={idx} className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 shrink-0 rounded-xl border border-border bg-secondary flex items-center justify-center overflow-hidden">
                                    {it.image_url ? (
                                      <img
                                        src={it.image_url}
                                        alt={it.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Package className="h-4 w-4 text-muted-foreground/60" />
                                    )}
                                  </div>
                                  <span className="text-xs text-foreground flex-1 min-w-0 truncate leading-tight">
                                    {it.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    ×{it.qty}
                                  </span>
                                  <span className="text-xs font-medium text-foreground shrink-0 w-14 text-right">
                                    ${(it.qty * it.price).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="px-5 py-3 space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span className="truncate">{o.phone}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                                <span className="leading-snug">{o.address}</span>
                              </div>
                            </div>

                            <div className="px-5 py-3 space-y-2">
                              <StatusMenu
                                current={o.status}
                                onUpdate={(s) => updateOrderStatus(o.id, s)}
                              />
                              <button
                                onClick={() => deleteOrder(o.id)}
                                className="flex items-center justify-center gap-1.5 w-full rounded-full bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 active:bg-red-200 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl shadow-sm overflow-x-auto">
                      {/* Header row */}
                      <div className="grid grid-cols-[160px_180px_100px_1fr_90px_170px] gap-4 px-6 py-3 bg-secondary/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[900px]">
                        <div>Order & Customer</div>
                        <div>Date & Contact</div>
                        <div>Status</div>
                        <div>Products</div>
                        <div>Total</div>
                        <div>Actions</div>
                      </div>
                      <div className="min-w-[900px]">
                        {paginatedOrders.map((o) => {
                          const shortId = o.id.slice(0, 8).toUpperCase();
                          const initials =
                            ((o.first_name?.[0] ?? "") + (o.last_name?.[0] ?? "")).toUpperCase() ||
                            "?";
                          const dateStr = new Date(o.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                          return (
                            <div
                              key={o.id}
                              className="grid grid-cols-[160px_180px_100px_1fr_90px_170px] gap-4 px-6 py-4 hover:bg-secondary/40 transition-colors"
                            >
                              {/* Col 1: Order ID & Customer */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-muted-foreground">
                                  <Hash className="h-3 w-3" />
                                  <span>ORD-{shortId}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="h-7 w-7 shrink-0 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                    {initials}
                                  </div>
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {o.first_name} {o.last_name}
                                  </span>
                                </div>
                              </div>

                              {/* Col 2: Dates & Contact */}
                              <div className="min-w-0">
                                <div className="text-sm text-foreground font-medium">{dateStr}</div>
                                <div className="flex items-start gap-1.5 mt-1.5">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                                  <span className="text-[11px] text-muted-foreground leading-snug">
                                    {o.address}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                  <span className="text-[11px] text-muted-foreground">
                                    {o.phone}
                                  </span>
                                </div>
                              </div>

                              {/* Col 3: Status */}
                              <div className="min-w-0 pt-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    statusConfig[o.status]?.pill || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${statusConfig[o.status]?.dot || "bg-muted-foreground"}`}
                                  />
                                  {statusConfig[o.status]?.label || o.status}
                                </span>
                              </div>

                              {/* Col 4: Products */}
                              <div className="min-w-0 space-y-1.5">
                                {(o.items ?? []).map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="h-8 w-8 shrink-0 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                                      {it.image_url ? (
                                        <img
                                          src={it.image_url}
                                          alt={it.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <Package className="h-4 w-4 text-muted-foreground/60" />
                                      )}
                                    </div>
                                    <span className="text-[11px] text-foreground flex-1 min-w-0 truncate leading-tight">
                                      {it.name}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                      ×{it.qty}
                                    </span>
                                    <span className="text-[11px] font-medium text-foreground w-14 text-right shrink-0">
                                      ${(it.qty * it.price).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Col 5: Total */}
                              <div className="min-w-0 pt-1">
                                <div className="text-base font-bold tracking-tight text-foreground">
                                  ${Number(o.total).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Tax incl.
                                </div>
                              </div>

                              {/* Col 6: Actions */}
                              <div className="min-w-0 space-y-2 pt-1">
                                <StatusMenu
                                  current={o.status}
                                  onUpdate={(s) => updateOrderStatus(o.id, s)}
                                />
                                <button
                                  onClick={() => deleteOrder(o.id)}
                                  className="flex items-center justify-center gap-1.5 w-full rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 active:bg-red-200 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete Order
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground">
                    <div>
                      Showing {(page - 1) * perPage + 1}&ndash;
                      {Math.min(page * perPage, orders.length)} of {orders.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3.5 h-8 rounded-full bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-8 h-8 px-2 rounded-full text-xs font-medium transition-colors ${
                            p === page
                              ? "bg-foreground text-background"
                              : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3.5 h-8 rounded-full bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ───── PRODUCTS TAB ───── */}
            {tab === "products" && (
              <div>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Products</h2>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {filteredProducts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 h-10 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" /> Add Product
                  </button>
                </div>

                <div className="relative mb-5 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                </div>
                <div className="space-y-2.5">
                  {filteredProducts.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-10 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                        <Box className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        No products found
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try a different search term.
                      </p>
                    </div>
                  )}
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 bg-card rounded-2xl border border-border p-3.5 transition-all hover:shadow-sm"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${Number(p.price).toFixed(2)} · {p.category}
                        </p>
                        {p.badge && (
                          <span className="mt-1.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-secondary transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => removeProduct(p.id)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-red-50 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ───── CATEGORIES TAB ───── */}
            {tab === "categories" && (
              <div className="max-w-lg">
                <form onSubmit={addCategory} className="flex gap-2 mb-4">
                  <input
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={inputClass}
                  />
                  <button className="inline-flex items-center gap-1.5 h-10 shrink-0 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </form>
                <div className="space-y-2.5">
                  {categories.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-10 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                        <Layers className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        No categories yet
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add your first category to organize products.
                      </p>
                    </div>
                  )}
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-card rounded-2xl border border-border px-4 py-3.5 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent text-sm font-bold uppercase">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            /{c.slug}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCategory(c.id)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-red-50 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ───── CONFIRMATION MODAL ───── */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setConfirm(null)}
            />
            <div className="relative bg-card shadow-xl shadow-foreground/10 w-full max-w-sm rounded-2xl border border-border">
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <div className="w-7" />
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                  <PawPrint className="h-6 w-6 text-accent" />
                </div>
                <button
                  onClick={() => setConfirm(null)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 pt-4 pb-6 flex flex-col items-center text-center">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {confirm.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {confirm.message}
                </p>
              </div>
              <div className="px-6 pb-6 flex justify-center gap-2.5">
                <button
                  onClick={() => setConfirm(null)}
                  className="h-10 px-5 rounded-full border border-border bg-background text-sm font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirm.onConfirm();
                    setConfirm(null);
                  }}
                  className={`h-10 px-6 text-sm font-semibold text-white active:scale-[0.98] transition-all rounded-full ${
                    confirm.variant === "destructive"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-accent hover:opacity-90"
                  }`}
                >
                  {confirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───── PRODUCT FORM MODAL ───── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12">
            <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={cancelEdit} />
            <div className="relative bg-card shadow-xl shadow-foreground/10 w-full max-w-lg mx-4 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-border">
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  {editingId ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  onClick={cancelEdit}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={submitProduct} className="px-6 pt-5 pb-6 space-y-5">
                {/* Basic Info */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Basic Info
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Name</label>
                      <input
                        required
                        placeholder="e.g. Premium Dog Food"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Description</label>
                      <textarea
                        required
                        placeholder="Describe the product…"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Category */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Pricing & Category
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Price</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60">
                          $
                        </span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          className={inputClass.replace("px-4", "pl-8 pr-4")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Media
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background p-6 transition-all hover:border-accent/50 hover:bg-accent/5"
                  >
                    {form.image_url ? (
                      <>
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="h-36 w-full max-w-[240px] rounded-xl object-cover shadow-sm"
                        />
                        <span className="text-xs text-muted-foreground">Click to change image</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 transition-colors group-hover:bg-accent/20">
                          <Upload className="h-6 w-6 text-accent" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Upload image</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            PNG or JPG — max 2MB
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        or
                      </span>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="Paste image URL…"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* Extras */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Extras
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Badge</label>
                      <input
                        placeholder="e.g. -20%"
                        value={form.badge}
                        onChange={(e) => setForm({ ...form, badge: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Tag</label>
                      <input
                        placeholder="e.g. XL"
                        value={form.tag}
                        onChange={(e) => setForm({ ...form, tag: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <button
                  disabled={saving}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                      Saving…
                    </span>
                  ) : editingId ? (
                    <>
                      <Pencil className="h-4 w-4" /> Update Product
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add Product
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusMenu({
  current,
  onUpdate,
}: {
  current: string;
  onUpdate: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center gap-1.5 w-full  bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/70 active:bg-secondary/70 transition-all"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            statusConfig[current]?.dot || "bg-muted-foreground"
          }`}
        />
        <span className="truncate">{statusConfig[current]?.label || current}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-1.5  bg-card p-1.5 shadow-lg shadow-foreground/10">
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onUpdate(key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                current === key
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
              {config.label}
              {current === key && <span className="ml-auto text-[10px] opacity-70">Current</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
