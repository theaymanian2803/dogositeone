import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { AdminBadge, AdminCard, AdminPageHeader, AdminTable } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { adminStatsFn } from "@/lib/admin-api";
import { formatMoney } from "@/lib/commerce";

export const Route = createFileRoute("/admin/")({
  loader: () => adminStatsFn(),
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="DASHBOARD"
        description="The store at a glance — orders, revenue, catalog and the pieces that need attention."
        dataTour="admin-dashboard"
        action={
          <Button
            asChild
            className="rounded-none bg-foreground text-xs uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            <Link to="/" hash="shop">
              View store <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(stats.revenue)} />
        <Stat label="Orders" value={String(stats.orders)} />
        <Stat label="Products" value={String(stats.products)} />
        <Stat label="Customers" value={String(stats.customers)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <AdminCard
          title="Recent orders"
          description="Latest orders across the store."
          action={
            <Link
              to="/admin/orders"
              className="text-[10px] font-bold uppercase tracking-[0.08em] text-hot-pink"
            >
              All orders →
            </Link>
          }
        >
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No orders yet. The first checkout will show up here.
            </p>
          ) : (
            <AdminTable headers={["Order", "Customer", "Status", "Total"]}>
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-4 font-semibold">{order.orderNumber}</td>
                  <td className="py-3 pr-4">
                    {order.customerName}
                    <span className="block text-[10px] text-muted-foreground">{order.email}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3 font-semibold">{formatMoney(order.total, order.currency)}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>

        <AdminCard title="Low stock" description="Pieces at 5 units or fewer.">
          {stats.lowStock.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Everything is stocked.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.lowStock.map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-3">
                  <img src={product.image} alt="" className="h-12 w-10 bg-secondary object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.color}</p>
                  </div>
                  <AdminBadge tone={(product.stock ?? 0) === 0 ? "red" : "amber"}>
                    {product.stock ?? 0} left
                  </AdminBadge>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink
          to="/admin/page-controls"
          title="Page controls"
          text="Reorder, hide or edit homepage sections."
        />
        <QuickLink
          to="/admin/products"
          title="Products"
          text="Add a set, change a price, manage stock."
        />
        <QuickLink
          to="/admin/setup"
          title="Setup"
          text="Connect your database and secure the owner login."
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-5">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-[30px] font-bold leading-none">{value}</p>
    </div>
  );
}

function QuickLink({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="border border-border bg-background p-5 transition-colors hover:border-foreground"
    >
      <p className="text-xs font-bold uppercase tracking-[0.08em]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-hot-pink">
        Open <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === "delivered"
      ? "green"
      : status === "cancelled"
        ? "red"
        : status === "new"
          ? "pink"
          : "amber";
  return <AdminBadge tone={tone}>{status}</AdminBadge>;
}
