import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";

import { OnboardingTour } from "@/components/admin/onboarding-tour";
import { Button } from "@/components/ui/button";
import { adminLogoutFn, adminSessionFn } from "@/lib/admin-api";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const session = await adminSessionFn();
    if (!session.user || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      throw redirect({ to: "/admin/login" });
    }
    return session;
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/page-controls", label: "Page controls" },
  { to: "/admin/pages", label: "Pages" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/brands", label: "Brands" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/media", label: "Media" },
  { to: "/admin/theme", label: "Theme" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/setup", label: "Setup" },
] as const;

function AdminLayout() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();

  async function logout() {
    await adminLogoutFn();
    await router.invalidate();
    await navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="font-display text-xl font-extrabold">
            PetPals<span className="text-hot-pink">.</span>
            <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Admin
            </span>
          </Link>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:inline">
            {session.user?.email}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              <Link to="/">
                <ArrowLeft className="size-3.5" /> Store
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="border-t border-border bg-background md:hidden">
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                {...(item.to === "/admin" ? { activeOptions: { exact: true } } : {})}
                className="shrink-0 border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                activeProps={{
                  className:
                    "shrink-0 border border-foreground bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-background",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-border bg-background p-3 md:block">
          <nav aria-label="Admin navigation" className="space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                {...(item.to === "/admin" ? { activeOptions: { exact: true } } : {})}
                className="block px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className:
                    "block px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] bg-foreground text-background",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <OnboardingTour />
    </div>
  );
}
