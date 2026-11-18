import { createFileRoute, useRouter } from "@tanstack/react-router";

import { AdminBadge, AdminCard, AdminEmpty, AdminPageHeader } from "@/components/admin/ui";
import { adminOrdersFn, adminUpdateOrderStatusFn } from "@/lib/admin-api";
import { ORDER_STATUSES, formatMoney, type OrderStatus } from "@/lib/commerce";
import { OrderStatusBadge } from "@/routes/admin/index";

export const Route = createFileRoute("/admin/orders")({
  loader: () => adminOrdersFn(),
  component: AdminOrders,
});

function AdminOrders() {
  const orders = Route.useLoaderData();
  const router = useRouter();

  async function changeStatus(id: string, status: OrderStatus) {
    const result = await adminUpdateOrderStatusFn({ data: { id, status } });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ORDERS"
        description="Every checkout is recorded here with its line items. Update the status as you fulfil each order."
      />

      {orders.length === 0 ? (
        <AdminCard>
          <AdminEmpty>No orders yet.</AdminEmpty>
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <AdminCard key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-bold">{order.orderNumber}</h2>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold">{order.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {order.email} · {order.phone}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {order.address}, {order.city} {order.postalCode}, {order.country}
                  </p>
                  {order.notes && (
                    <p className="mt-1 text-[11px] italic text-muted-foreground">“{order.notes}”</p>
                  )}
                </div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]">
                  Status
                  <select
                    value={order.status}
                    onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)}
                    className="mt-1 block h-9 border border-border bg-background px-2 text-xs font-normal normal-case"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <ul className="divide-y divide-border">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span>
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          · {item.size} · ×{item.quantity}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatMoney(item.lineTotal, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                  <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
                  <Row
                    label="Shipping"
                    value={
                      order.shipping === 0 ? "Free" : formatMoney(order.shipping, order.currency)
                    }
                  />
                  {order.discount > 0 && (
                    <Row
                      label={`Discount ${order.couponCode ?? ""}`}
                      value={`−${formatMoney(order.discount, order.currency)}`}
                    />
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(order.total, order.currency)}</span>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export { AdminBadge };
