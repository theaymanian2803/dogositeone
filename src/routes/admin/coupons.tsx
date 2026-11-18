import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminBadge,
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminNote,
  AdminPageHeader,
  AdminTable,
  inputClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminCouponsFn, adminDeleteCouponFn, adminSaveCouponFn } from "@/lib/admin-api";
import type { CouponInput, CouponType } from "@/lib/commerce";

export const Route = createFileRoute("/admin/coupons")({
  loader: () => adminCouponsFn(),
  component: AdminCoupons,
});

type Form = {
  code: string;
  type: CouponType;
  value: string;
  minOrder: string;
  maxUses: string;
  active: boolean;
  expiresAt: string;
};

const empty: Form = {
  code: "",
  type: "percentage",
  value: "10",
  minOrder: "0",
  maxUses: "",
  active: true,
  expiresAt: "",
};

function AdminCoupons() {
  const coupons = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm(empty);
    setError("");
    setOpen(true);
  }

  function startEdit(coupon: (typeof coupons)[number]) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrder: String(coupon.minOrder),
      maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
      active: coupon.active,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
    });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const input: CouponInput = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      active: form.active,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    const result = await adminSaveCouponFn({
      data: { ...(editingId ? { id: editingId } : {}), input },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    await router.invalidate();
  }

  async function remove(id: string, code: string) {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    const result = await adminDeleteCouponFn({ data: { id } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="COUPONS"
        description="Discount codes validated on the server at checkout."
        action={
          <Button
            onClick={startCreate}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            New coupon
          </Button>
        }
      />

      <AdminCard>
        {coupons.length === 0 ? (
          <AdminEmpty>No coupons yet.</AdminEmpty>
        ) : (
          <AdminTable
            headers={["Code", "Discount", "Minimum", "Uses", "Expires", "Status", "Actions"]}
          >
            {coupons.map((coupon) => {
              const expired = coupon.expiresAt
                ? coupon.expiresAt < new Date().toISOString()
                : false;
              const usedUp = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
              const live = coupon.active && !expired && !usedUp;
              return (
                <tr key={coupon.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-4 font-mono text-xs font-semibold">{coupon.code}</td>
                  <td className="py-3 pr-4">
                    {coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value}`}
                  </td>
                  <td className="py-3 pr-4">${coupon.minOrder}</td>
                  <td className="py-3 pr-4">
                    {coupon.usedCount}
                    {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="py-3 pr-4 text-[10px] text-muted-foreground">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="py-3 pr-4">
                    <AdminBadge tone={live ? "green" : "amber"}>
                      {live ? "live" : expired ? "expired" : usedUp ? "used up" : "paused"}
                    </AdminBadge>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(coupon)}
                        className="h-7 rounded-none text-[10px] uppercase"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(coupon.id, coupon.code)}
                        className="h-7 rounded-none text-[10px] uppercase text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </AdminCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingId ? "EDIT COUPON" : "NEW COUPON"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Codes are case-insensitive and applied to the cart subtotal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Code">
                <input
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Type">
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}
                  className={inputClass}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </AdminField>
              <AdminField label="Value">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Minimum order">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrder}
                  onChange={(event) => setForm({ ...form, minOrder: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Max uses" hint="Blank means unlimited.">
                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Expires" hint="Blank means never.">
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />{" "}
              Active
            </label>
            {error && <AdminNote tone="error">{error}</AdminNote>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-none text-[10px] uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="rounded-none bg-foreground text-[10px] uppercase text-background hover:bg-hot-pink hover:text-foreground"
              >
                {pending ? "Saving…" : "Save coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
