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
  ImageField,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminDeleteProductFn,
  adminProductsFn,
  adminSaveProductFn,
  adminCategoriesFn,
  adminBrandsFn,
} from "@/lib/admin-api";
import type { ProductInput } from "@/server/catalog";

export const Route = createFileRoute("/admin/products")({
  loader: async () => {
    const [products, categories, brands] = await Promise.all([
      adminProductsFn(),
      adminCategoriesFn(),
      adminBrandsFn(),
    ]);
    return { products, categories, brands };
  },
  component: AdminProducts,
});

type FormState = {
  name: string;
  color: string;
  price: string;
  originalPrice: string;
  image: string;
  images: string[];
  category: string;
  brand: string;
  badge: string;
  tagline: string;
  description: string;
  fabric: string;
  composition: string;
  care: string;
  fit: string;
  modelNote: string;
  features: string;
  stock: string;
  active: boolean;
};

const emptyForm = (category: string): FormState => ({
  name: "",
  color: "",
  price: "0",
  originalPrice: "",
  image: "",
  images: [],
  category,
  brand: "PetPals",
  badge: "",
  tagline: "",
  description: "",
  fabric: "",
  composition: "",
  care: "",
  fit: "",
  modelNote: "",
  features: "",
  stock: "0",
  active: true,
});

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AdminProducts() {
  const { products, categories, brands } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(categories[0]?.slug ?? "dogs"));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.slug ?? "dogs"));
    setError("");
    setOpen(true);
  }

  function startEdit(id: string) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setEditingId(id);
    setForm({
      name: product.name,
      color: product.color,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      image: product.image,
      images: product.images ?? [],
      category: product.category,
      brand: product.brand ?? "PetPals",
      badge: product.badge ?? "",
      tagline: product.tagline,
      description: product.description,
      fabric: product.fabric,
      composition: product.composition.join(", "),
      care: product.care.join("\n"),
      fit: product.fit,
      modelNote: product.modelNote,
      features: product.features.join("\n"),
      stock: String(product.stock ?? 0),
      active: true,
    });
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const input: ProductInput = {
      name: form.name,
      color: form.color,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      image: form.image,
      category: form.category,
      brand: form.brand,
      badge: form.badge || null,
      tagline: form.tagline,
      description: form.description,
      fabric: form.fabric,
      composition: splitList(form.composition),
      care: form.care
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      fit: form.fit,
      modelNote: form.modelNote,
      features: form.features
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      images: form.images
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 3),
      stock: Number(form.stock),
      active: form.active,
      sortOrder: 0,
    };
    const result = await adminSaveProductFn({
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

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? Order history keeps its own copy of the line item.`))
      return;
    const result = await adminDeleteProductFn({ data: { id } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="PRODUCTS"
        description="Create and edit the pieces in your catalog. Prices are used by checkout exactly as entered here."
        dataTour="products"
        action={
          <Button
            onClick={startCreate}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            New product
          </Button>
        }
      />

      <AdminCard title={`${products.length} pieces`}>
        {error && (
          <div className="mb-3">
            <AdminNote tone="error">{error}</AdminNote>
          </div>
        )}
        {products.length === 0 ? (
          <AdminEmpty>No products yet. Create your first piece.</AdminEmpty>
        ) : (
          <AdminTable headers={["Piece", "Category", "Price", "Stock", "Status", "Actions"]}>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border align-middle last:border-b-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt=""
                      className="h-14 w-11 bg-secondary object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {product.color} · {product.brand || "PetPals"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 capitalize">{product.category}</td>
                <td className="py-3 pr-4 font-semibold">${product.price}</td>
                <td className="py-3 pr-4">{product.stock ?? 0}</td>
                <td className="py-3 pr-4">
                  <AdminBadge tone={(product.stock ?? 0) > 0 ? "green" : "amber"}>
                    {(product.stock ?? 0) > 0 ? "live" : "out"}
                  </AdminBadge>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(product.id)}
                      className="h-7 rounded-none text-[10px] uppercase"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(product.id, product.name)}
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
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingId ? "EDIT PIECE" : "NEW PIECE"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Everything here drives the product page and checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Colour">
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Price (USD)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Original price" hint="Optional — shows a strikethrough.">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.originalPrice}
                  onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Brand">
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className={inputClass}
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.name}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Badge" hint="e.g. JUST IN">
                <input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Stock">
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
            </div>

            <ImageField
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              label="Main image"
            />

            <div className="border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]">Gallery</p>
                  <p className="text-[11px] text-muted-foreground">
                    Up to 3 more images — 4 per product. The main image shows first.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={form.images.length >= 3}
                  onClick={() => setForm({ ...form, images: [...form.images, ""] })}
                  className="rounded-none text-[10px] uppercase tracking-[0.08em]"
                >
                  + Add image
                </Button>
              </div>
              {form.images.length === 0 ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  No gallery images yet. One image is fine — or add side and detail shots.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {form.images.map((url, index) => (
                    <div key={index} className="border border-border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                          Image {index + 2}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setForm({
                              ...form,
                              images: form.images.filter((_, position) => position !== index),
                            })
                          }
                          className="rounded-none text-[10px] uppercase text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                      <ImageField
                        value={url}
                        onChange={(next) =>
                          setForm({
                            ...form,
                            images: form.images.map((value, position) =>
                              position === index ? next : value,
                            ),
                          })
                        }
                        label="Gallery image"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AdminField label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className={inputClass}
              />
            </AdminField>
            <AdminField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={textareaClass}
              />
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Fabric">
                <input
                  value={form.fabric}
                  onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Fit">
                <input
                  value={form.fit}
                  onChange={(e) => setForm({ ...form, fit: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Model note">
                <input
                  value={form.modelNote}
                  onChange={(e) => setForm({ ...form, modelNote: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Composition" hint="Comma separated.">
                <input
                  value={form.composition}
                  onChange={(e) => setForm({ ...form, composition: e.target.value })}
                  className={inputClass}
                />
              </AdminField>
            </div>
            <AdminField label="Care steps" hint="One per line.">
              <textarea
                value={form.care}
                onChange={(e) => setForm({ ...form, care: e.target.value })}
                className={textareaClass}
              />
            </AdminField>
            <AdminField label="Features" hint="One per line.">
              <textarea
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className={textareaClass}
              />
            </AdminField>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Visible in the storefront
            </label>

            {error && <AdminNote tone="error">{error}</AdminNote>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
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
                className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
              >
                {pending ? "Saving…" : "Save piece"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
