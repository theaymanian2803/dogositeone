import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { turso } from "@/integrations/turso/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { toast } from "sonner";
import {
  Trash2, Pencil, X, Package, Plus, Upload, Search,
  Box, Layers, ShoppingCart, DollarSign, LogOut,
  MapPin, Phone, Menu, Store, ChevronDown, ChevronLeft, ChevronRight, Hash, PawPrint,
} from "lucide-react";

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
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500 text-white" },
  processing: { label: "Processing", color: "bg-amber-500 text-white" },
  shipped: { label: "Shipped", color: "bg-purple-500 text-white" },
  delivered: { label: "Delivered", color: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelled", color: "bg-red-500 text-white" },
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "destructive" | "default";
  onConfirm: () => void;
} | null;

export default function Admin() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
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
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    document.title = "Admin — PetPals";
  }, []);

  const pageTitle =
    tab === "orders" ? "Order Management" :
    tab === "products" ? "Product Management" :
    "Category Management";

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

  useEffect(() => { setPage(1); }, [orders.length]);

  useEffect(() => {
    if (!statusDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropdownId]);

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

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>;

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sign in required</h1>
          <Link to="/auth" className="mt-4 inline-flex rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900">Not authorized</h1>
          <p className="mt-2 text-sm text-slate-500">
            Only <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{ADMIN_EMAIL}</code> can access the admin panel. You are signed in as {user.email}.
          </p>
          <button
            onClick={() => { signOut(); navigate("/auth"); }}
            className="mt-4 inline-flex rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
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
          args: [form.name, form.description, price, form.image_url, form.category, form.badge || null, form.tag || null, editingId],
        });
        toast.success("Product updated");
      } else {
        await turso.execute({
          sql: "INSERT INTO products (id, name, slug, description, price, image_url, category, badge, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [crypto.randomUUID(), form.name, slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6), form.description, price, form.image_url, form.category, form.badge || null, form.tag || null],
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
      message: "This category will be permanently removed. Products in this category won't be affected.",
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
      message: "This order will be permanently removed. Your customer won't be able to track it anymore.",
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
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-800">
          <Store className="h-6 w-6 text-accent" />
          <span className="text-lg font-bold text-white">PetPals</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 ml-auto">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setTab(item.key); setSidebarOpen(false); cancelEdit(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === item.key
                  ? "bg-slate-800 text-white shadow-sm border-l-2 border-accent"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                tab === item.key ? "bg-accent/20 text-accent" : "bg-slate-800 text-slate-500"
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-800 px-4 py-4">
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
          <button
            onClick={() => { signOut(); navigate("/"); }}
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-slate-500">{user.email}</span>
              <button
                onClick={() => { signOut(); navigate("/"); }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 ${tab === "orders" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
          {/* ───── STATS ROW ───── */}
          <div className="px-4 sm:px-6 pt-6 pb-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Products", value: products.length, icon: Package, accent: "border-l-blue-500" },
                { label: "Categories", value: categories.length, icon: Layers, accent: "border-l-violet-500" },
                { label: "Pending Orders", value: pendingOrders, icon: ShoppingCart, accent: "border-l-amber-500" },
                { label: "Revenue", value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, accent: "border-l-emerald-500" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-xl border border-slate-200 border-l-4 p-4 flex items-center gap-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${s.accent.replace("border-l-", "bg-").replace("-500", "-50")}`}>
                    <s.icon className={`h-5 w-5 ${s.accent.replace("border-l-", "text-")}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">{s.label}</p>
                    <p className="text-lg font-bold text-slate-900">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ───── CONTENT ───── */}
          <div className={`px-4 sm:px-6 ${tab === "orders" ? "pt-4 pb-0 flex flex-col flex-1 min-h-0" : "py-6"}`}>
            {/* ───── ORDERS TAB ───── */}
            {tab === "orders" && (
              <div className="flex-1 min-h-0 overflow-auto">
                {orders.length === 0 && (
                  <div className="bg-white rounded-none border border-dashed border-slate-200 p-12 text-center">
                    <Package className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500 font-medium">No orders yet</p>
                    <p className="text-xs text-slate-400 mt-1">Orders will appear here once customers check out.</p>
                  </div>
                )}
                {orders.length > 0 && (
                  <div className="bg-white border border-slate-200 shadow-sm min-w-[900px]">
                    {/* Header row */}
                    <div className="grid grid-cols-[160px_180px_90px_1fr_90px_160px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <div>Order & Customer</div>
                      <div>Date & Contact</div>
                      <div>Status</div>
                      <div>Products</div>
                      <div>Total</div>
                      <div>Actions</div>
                    </div>
                    {paginatedOrders.map((o) => {
                      const shortId = o.id.slice(0, 8).toUpperCase();
                      const initials = ((o.first_name?.[0] ?? "") + (o.last_name?.[0] ?? "")).toUpperCase() || "?";
                      const dateStr = new Date(o.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                      return (
                        <div key={o.id} className="grid grid-cols-[160px_180px_90px_1fr_90px_160px] gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                          {/* Col 1: Order ID & Customer */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-400">
                              <Hash className="h-3 w-3" />
                              <span>ORD-{shortId}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-7 w-7 shrink-0 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {initials}
                              </div>
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {o.first_name} {o.last_name}
                              </span>
                            </div>
                          </div>

                          {/* Col 2: Dates & Contact */}
                          <div className="min-w-0">
                            <div className="text-sm text-slate-600 font-medium">{dateStr}</div>
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
                              <span className="text-[11px] text-slate-500 leading-snug">{o.address}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="text-[11px] text-slate-500">{o.phone}</span>
                            </div>
                          </div>

                          {/* Col 3: Status */}
                          <div className="min-w-0 pt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusConfig[o.status]?.color || "bg-slate-100 text-slate-700"}`}>
                              {statusConfig[o.status]?.label || o.status}
                            </span>
                          </div>

                          {/* Col 4: Products */}
                          <div className="min-w-0 space-y-1.5">
                            {(o.items ?? []).map((it, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="h-8 w-8 shrink-0 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                  {it.image_url ? (
                                    <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-700 flex-1 min-w-0 truncate leading-tight">{it.name}</span>
                                <span className="text-[11px] text-slate-400 shrink-0">×{it.qty}</span>
                                <span className="text-[11px] font-medium text-slate-600 w-14 text-right shrink-0">
                                  ${(it.qty * it.price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Col 5: Total */}
                          <div className="min-w-0 pt-1">
                            <div className="text-base font-bold text-slate-900">
                              ${Number(o.total).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Tax incl.</div>
                          </div>

                          {/* Col 6: Actions */}
                          <div className="min-w-0 space-y-2 pt-1">
                            <div ref={statusDropdownId === o.id ? statusDropdownRef : null} className="relative">
                              <button
                                onClick={() => setStatusDropdownId(statusDropdownId === o.id ? null : o.id)}
                                className="flex items-center justify-center gap-1.5 w-full rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all"
                              >
                                <span>Update Status</span>
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              {statusDropdownId === o.id && (
                                <div className="absolute right-0 top-full mt-1 w-full min-w-[130px] rounded-none border border-slate-200 bg-white shadow-lg z-20 py-1">
                                  {Object.entries(statusConfig).map(([key, config]) => (
                                    <button
                                      key={key}
                                      onClick={() => { updateOrderStatus(o.id, key); setStatusDropdownId(null); }}
                                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                        o.status === key ? "bg-slate-50 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        key === "shipped" ? "bg-purple-500" :
                                        key === "cancelled" ? "bg-red-500" :
                                        key === "delivered" ? "bg-emerald-500" :
                                        key === "processing" ? "bg-amber-500" : "bg-blue-500"
                                      }`} />
                                      {config.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => deleteOrder(o.id)}
                              className="flex items-center justify-center gap-1.5 w-full rounded-sm border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 active:bg-red-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Order
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-500">
                    <div>
                      Showing {(page - 1) * perPage + 1}&ndash;{Math.min(page * perPage, orders.length)} of {orders.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-none border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-[28px] h-7 rounded-none border text-xs font-medium transition-colors ${
                            p === page
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-none border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Products</h2>
                  <button
                    onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Product
                  </button>
                </div>

                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  {filteredProducts.length === 0 && (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                      <Box className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">No products found</p>
                    </div>
                  )}
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 transition-all hover:shadow-sm"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">${Number(p.price).toFixed(2)} · {p.category}</p>
                        {p.badge && (
                          <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{p.badge}</span>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(p)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => removeProduct(p.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-red-50 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
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
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-accent transition-colors"
                  />
                  <button className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-accent px-4 font-semibold text-white hover:opacity-90 transition-opacity shadow-sm">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </form>
                <div className="space-y-1.5">
                  {categories.length === 0 && (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                      <Layers className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">No categories yet</p>
                    </div>
                  )}
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent text-sm font-bold uppercase">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-400">/{c.slug}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCategory(c.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-red-50 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setConfirm(null)} />
            <div className="relative bg-white shadow-xl w-full max-w-sm mx-4">
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <div className="w-7" />
                <div className="w-12 h-12 rounded-sm bg-accent/10 flex items-center justify-center shrink-0">
                  <PawPrint className="h-6 w-6 text-accent" />
                </div>
                <button
                  onClick={() => setConfirm(null)}
                  className="grid h-7 w-7 place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 pt-4 pb-6 flex flex-col items-center text-center">
                <h3 className="text-lg font-bold text-slate-900">{confirm.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{confirm.message}</p>
              </div>
              <div className="px-6 pb-6 flex justify-center">
                <button
                  onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                  className={`h-9 px-5 text-sm font-semibold text-white active:scale-[0.98] transition-all ${
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
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
            <div className="fixed inset-0 bg-black/40" onClick={cancelEdit} />
            <div className="relative bg-white shadow-xl w-full max-w-lg mx-4 max-h-[calc(100dvh-6rem)] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Product" : "Add Product"}</h2>
                <button
                  onClick={cancelEdit}
                  className="grid h-7 w-7 place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={submitProduct} className="px-6 pt-5 pb-6 space-y-5">
                {/* Basic Info */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Basic Info</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Name</label>
                      <input
                        required
                        placeholder="e.g. Premium Dog Food"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Description</label>
                      <textarea
                        required
                        placeholder="Describe the product…"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Category */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Pricing & Category</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Price</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-300">$</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="" disabled>Select…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Media</h3>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 transition-all hover:border-accent/50 hover:bg-accent/5"
                  >
                    {form.image_url ? (
                      <>
                        <img src={form.image_url} alt="Preview" className="h-36 w-full max-w-[240px] rounded-lg object-cover shadow-sm" />
                        <span className="text-xs text-slate-400">Click to change image</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 transition-colors group-hover:bg-accent/20">
                          <Upload className="h-6 w-6 text-accent" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700">Upload image</p>
                          <p className="text-xs text-slate-400">PNG or JPG — max 2MB</p>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] text-slate-300">OR</span></div>
                  </div>
                  <input
                    type="url"
                    placeholder="Paste image URL…"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                {/* Extras */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Extras</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Badge</label>
                      <input
                        placeholder="e.g. -20%"
                        value={form.badge}
                        onChange={(e) => setForm({ ...form, badge: e.target.value })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Tag</label>
                      <input
                        placeholder="e.g. XL"
                        value={form.tag}
                        onChange={(e) => setForm({ ...form, tag: e.target.value })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-white transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>
                </div>

                <button
                  disabled={saving}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving…
                    </span>
                  ) : editingId ? (
                    <><Pencil className="h-4 w-4" /> Update Product</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Add Product</>
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
