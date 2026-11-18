import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminNote,
  AdminPageHeader,
  AdminTable,
  ImageField,
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
import { adminBrandsFn, adminDeleteBrandFn, adminSaveBrandFn } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/brands")({
  loader: () => adminBrandsFn(),
  component: AdminBrands,
});

function AdminBrands() {
  const brands = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function startCreate() {
    setEditingId(null);
    setName("");
    setLogoUrl("");
    setError("");
    setOpen(true);
  }

  function startEdit(brand: (typeof brands)[number]) {
    setEditingId(brand.id);
    setName(brand.name);
    setLogoUrl(brand.logoUrl ?? "");
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await adminSaveBrandFn({
      data: { ...(editingId ? { id: editingId } : {}), name, logoUrl: logoUrl || null },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    await router.invalidate();
  }

  async function remove(id: string, label: string) {
    if (!window.confirm(`Delete the brand “${label}”?`)) return;
    const result = await adminDeleteBrandFn({ data: { id } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="BRANDS"
        description="Brands appear on product pages and in brand-driven sections."
        action={
          <Button
            onClick={startCreate}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            New brand
          </Button>
        }
      />

      <AdminCard>
        {error && (
          <div className="mb-3">
            <AdminNote tone="error">{error}</AdminNote>
          </div>
        )}
        {brands.length === 0 ? (
          <AdminEmpty>No brands yet.</AdminEmpty>
        ) : (
          <AdminTable headers={["Brand", "Products", "Actions"]}>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-border last:border-b-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-16 items-center justify-center bg-secondary">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-muted-foreground">
                          {brand.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold">{brand.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">{brand.productCount ?? 0}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(brand)}
                      className="h-7 rounded-none text-[10px] uppercase"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(brand.id, brand.name)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingId ? "EDIT BRAND" : "NEW BRAND"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Brand names are matched to products by name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="mt-4 space-y-4">
            <AdminField label="Name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                required
              />
            </AdminField>
            <ImageField value={logoUrl} onChange={setLogoUrl} label="Logo (optional)" />
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
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
