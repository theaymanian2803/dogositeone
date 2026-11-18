import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminBadge,
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  adminCustomersFn,
  adminDeleteCustomerFn,
  adminIssuePasswordResetFn,
  adminPasswordResetsFn,
  adminSetRoleFn,
} from "@/lib/admin-api";
import { ROLE_OPTIONS, formatMoney } from "@/lib/commerce";

export const Route = createFileRoute("/admin/customers")({
  loader: async () => {
    const [customers, resets] = await Promise.all([adminCustomersFn(), adminPasswordResetsFn()]);
    return { customers, resets };
  },
  component: AdminCustomers,
});

function AdminCustomers() {
  const { customers, resets } = Route.useLoaderData();
  const router = useRouter();
  const [issued, setIssued] = useState<{ code: string; email: string; phone: string } | null>(null);

  async function changeRole(userId: string, role: "admin" | "moderator" | "customer") {
    const result = await adminSetRoleFn({ data: { userId, role } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function remove(userId: string, email: string) {
    if (!window.confirm(`Delete ${email}? Their orders are kept for history.`)) return;
    const result = await adminDeleteCustomerFn({ data: { userId } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function issue(input: { id?: string; email?: string }) {
    const result = await adminIssuePasswordResetFn({ data: input });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setIssued({ code: result.code, email: result.email, phone: result.phone });
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="CUSTOMERS"
        description="Accounts, roles and lifetime order value. Admins and moderators can open this panel."
      />
      <AdminCard
        title="Password recovery"
        description="No email provider: issue a one-time code, then send it to the customer on WhatsApp or by phone."
      >
        {issued ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Code for <span className="font-semibold text-foreground">{issued.email}</span>. It
              expires in 30 minutes and works once.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="border border-hot-pink bg-background px-4 py-2 font-mono text-lg tracking-[0.25em]">
                {issued.code}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-none text-[10px] uppercase"
                onClick={() => void navigator.clipboard?.writeText(issued.code)}
              >
                Copy code
              </Button>
              {issued.phone && (
                <Button asChild size="sm" className="h-9 rounded-none text-[10px] uppercase">
                  <a
                    href={`https://wa.me/${issued.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Your password reset code is ${issued.code}. It expires in 30 minutes.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Send on WhatsApp
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-none text-[10px] uppercase"
                onClick={() => setIssued(null)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : resets.length === 0 ? (
          <AdminEmpty>No pending recovery requests.</AdminEmpty>
        ) : (
          <div className="space-y-3">
            {resets.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-xs font-semibold">{request.name || request.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {request.email}
                    {request.phone ? ` · ${request.phone}` : ""} · requested{" "}
                    {new Date(request.requestedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-none text-[10px] uppercase"
                  onClick={() => void issue({ id: request.id })}
                >
                  Generate code
                </Button>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard>
        {customers.length === 0 ? (
          <AdminEmpty>No accounts yet. Customers appear when they register at checkout.</AdminEmpty>
        ) : (
          <AdminTable headers={["Customer", "Role", "Orders", "Spent", "Actions"]}>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-b-0">
                <td className="py-3 pr-4">
                  <p className="font-semibold">{customer.name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{customer.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Joined {new Date(customer.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={customer.role}
                    onChange={(event) =>
                      changeRole(
                        customer.id,
                        event.target.value as "admin" | "moderator" | "customer",
                      )
                    }
                    className="h-8 border border-border bg-background px-2 text-[11px]"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4">{customer.orderCount}</td>
                <td className="py-3 pr-4">{formatMoney(customer.orderTotal)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {customer.role === "customer" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void issue({ email: customer.email })}
                        className="h-7 rounded-none text-[10px] uppercase text-hot-pink"
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(customer.id, customer.email)}
                      className="h-7 rounded-none text-[10px] uppercase text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>
      <AdminCard title="Roles">
        <p className="text-[11px] leading-5 text-muted-foreground">
          <AdminBadge tone="pink">admin</AdminBadge> full access including database setup.{" "}
          <AdminBadge tone="amber">moderator</AdminBadge> catalog, orders and content, but not
          setup. <AdminBadge>customer</AdminBadge> account pages only.
        </p>
      </AdminCard>
    </div>
  );
}
