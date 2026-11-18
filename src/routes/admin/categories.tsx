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
import { adminCategoriesFn, adminDeleteCategoryFn, adminSaveCategoryFn } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/categories")({
  loader: () => adminCategoriesFn(),
  component: AdminCategories,
});

function AdminCategories() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function startCreate() {
    setEditingId(null);
    setName("");
    setImage("");
    setError("");
    setOpen(true);
  }

  function startEdit(category: (typeof categories)[number]) {
    setEditingId(category.id);
    setName(category.name);
    setImage(category.image ?? "");
    setError("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await adminSaveCategoryFn({
      data: { ...(editingId ? { id: editingId } : {}), name, image: image || null },
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
    if (!window.confirm(`Delete the ${label} category? Products keep their category text.`)) return;
    const result = await adminDeleteCategoryFn({ data: { id } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="CATEGORIES"
        description="Categories power the collection filter and category sections."
        action={
          <Button
            onClick={startCreate}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            New category
          </Button>
        }
      />

      <AdminCard>
        {error && (
          <div className="mb-3">
            <AdminNote tone="error">{error}</AdminNote>
          </div>
        )}
        {categories.length === 0 ? (
          <AdminEmpty>No categories yet.</AdminEmpty>
        ) : (
          <AdminTable headers={["Category", "Slug", "Products", "Actions"]}>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-border last:border-b-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary">
                      {category.image && (
                        <img src={category.image} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <span className="font-semibold">{category.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-[10px] text-muted-foreground">
                  {category.slug}
                </td>
                <td className="py-3 pr-4">{category.productCount ?? 0}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(category)}
                      className="h-7 rounded-none text-[10px] uppercase"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(category.id, category.name)}
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
              {editingId ? "EDIT CATEGORY" : "NEW CATEGORY"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              The slug is generated from the name.
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
            <ImageField value={image} onChange={setImage} label="Image (optional)" />
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
