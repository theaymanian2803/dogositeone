import { useState, type ReactNode } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminBadge,
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminNote,
  AdminPageHeader,
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
  adminBrandsFn,
  adminCategoriesFn,
  adminDeleteSectionFn,
  adminMoveSectionFn,
  adminProductsFn,
  adminReviewsFn,
  adminSaveSectionFn,
  adminSectionsFn,
} from "@/lib/admin-api";
import {
  SECTION_TYPES,
  sectionBrandId,
  sectionBrandIds,
  sectionCategoryIds,
  sectionProductIds,
  sectionReviewIds,
  sectionUsesImage,
  type JsonValue,
  type SectionType,
} from "@/lib/cms";
import {
  SECTION_SUBTITLE_SIZES,
  SECTION_TEXT_SIZES,
  cleanSectionStyle,
  isSectionStyleEmpty,
  withSectionStyle,
  type SectionStyle,
} from "@/lib/cms";
import { THEME_FONT_FAMILIES } from "@/lib/store-settings";
import type { SectionInput } from "@/server/cms";

export const Route = createFileRoute("/admin/page-controls")({
  loader: async () => {
    const [sections, brands, products, categories, reviews] = await Promise.all([
      adminSectionsFn(),
      adminBrandsFn(),
      adminProductsFn(),
      adminCategoriesFn(),
      adminReviewsFn(),
    ]);
    return { sections, brands, products, categories, reviews };
  },
  component: AdminPageControls,
});

type Form = {
  type: SectionType;
  title: string;
  subtitle: string;
  imageUrl: string;
  visible: boolean;
  sortOrder: string;
  config: string;
  style: SectionStyle;
  brandIds: string[];
  brandId: string;
  categoryIds: string[];
  productIds: string[];
  reviewIds: string[];
};

const empty: Form = {
  type: "product_grid",
  title: "",
  subtitle: "",
  imageUrl: "",
  visible: true,
  sortOrder: "0",
  config: '{\n  "eyebrow": "",\n  "description": ""\n}',
  style: {},
  brandIds: [],
  brandId: "",
  categoryIds: [],
  productIds: [],
  reviewIds: [],
};

/** Types whose image can sit behind the content. */
const BACKGROUND_LAYOUT_TYPES: SectionType[] = ["promo", "custom_banner", "featured_brand"];

function IdChecklist({
  label,
  hint,
  items,
  selected,
  onChange,
  empty,
  imageShape = "square",
}: {
  label: string;
  hint: string;
  items: Array<{ id: string; label: string; meta?: string; image?: string | null }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  empty: ReactNode;
  imageShape?: "square" | "logo";
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(items.map((item) => item.id))}
            disabled={items.length === 0}
            className="rounded-none text-[10px] uppercase"
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="rounded-none text-[10px] uppercase"
          >
            Clear
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 border border-border px-2 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  className={
                    imageShape === "logo"
                      ? "h-6 w-8 shrink-0 object-contain"
                      : "h-8 w-8 shrink-0 object-cover"
                  }
                />
              )}
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.meta && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {item.meta}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <AdminField label={label} hint="Hex like #ff2d95 — blank inherits the theme.">
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value ?? "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer border border-border bg-background p-0.5"
        />
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          placeholder="Inherit"
          className={inputClass}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            className="rounded-none text-[10px] uppercase"
          >
            Clear
          </Button>
        )}
      </div>
    </AdminField>
  );
}

function AdminPageControls() {
  const { sections, brands, products, categories, reviews } = Route.useLoaderData();
  const approvedReviews = reviews.filter((review) => review.status === "approved");
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

  function startEdit(section: (typeof sections)[number]) {
    const restConfig = { ...section.config };
    delete restConfig["style"];
    delete restConfig["brand_ids"];
    delete restConfig["brand_id"];
    delete restConfig["category_ids"];
    delete restConfig["product_ids"];
    delete restConfig["review_ids"];
    setEditingId(section.id);
    setForm({
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      imageUrl: section.imageUrl,
      visible: section.visible,
      sortOrder: String(section.sortOrder),
      config: JSON.stringify(restConfig, null, 2),
      style: cleanSectionStyle(section.config["style"]),
      brandIds: sectionBrandIds(section.config),
      brandId: sectionBrandId(section.config),
      categoryIds: sectionCategoryIds(section.config),
      productIds: sectionProductIds(section.config),
      reviewIds: sectionReviewIds(section.config),
    });
    setError("");
    setOpen(true);
  }

  function updateStyle(patch: Record<string, string | number | boolean | undefined>) {
    setForm((current) => {
      const next: Record<string, unknown> = { ...current.style };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") delete next[key];
        else next[key] = value;
      }
      return { ...current, style: next as SectionStyle };
    });
  }

  function resetStyle() {
    setForm((current) => ({ ...current, style: {} }));
  }

  function parseConfig(): Record<string, JsonValue> {
    const parsed: unknown = form.config.trim() ? JSON.parse(form.config) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config must be a JSON object.");
    }
    return parsed as Record<string, JsonValue>;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const config = withSectionStyle(parseConfig(), cleanSectionStyle(form.style));
      if (form.type === "brands") {
        config["brand_ids"] = form.brandIds as JsonValue;
      } else {
        delete config["brand_ids"];
      }
      if (form.type === "featured_brand" && form.brandId) {
        config["brand_id"] = form.brandId;
      } else {
        delete config["brand_id"];
      }
      if (form.type === "categories") {
        config["category_ids"] = form.categoryIds as JsonValue;
      } else {
        delete config["category_ids"];
      }
      if (form.type === "products") {
        config["product_ids"] = form.productIds as JsonValue;
      } else {
        delete config["product_ids"];
      }
      if (form.type === "reviews") {
        config["review_ids"] = form.reviewIds as JsonValue;
      } else {
        delete config["review_ids"];
      }
      const input: SectionInput = {
        type: form.type,
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        visible: form.visible,
        sortOrder: Number(form.sortOrder),
        config,
      };
      const result = await adminSaveSectionFn({
        data: { ...(editingId ? { id: editingId } : {}), input },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      await router.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid config JSON.");
    } finally {
      setPending(false);
    }
  }

  async function toggleVisible(id: string, section: (typeof sections)[number]) {
    const result = await adminSaveSectionFn({
      data: {
        id,
        input: {
          type: section.type,
          title: section.title,
          subtitle: section.subtitle,
          imageUrl: section.imageUrl,
          visible: !section.visible,
          sortOrder: section.sortOrder,
          config: section.config,
        },
      },
    });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function move(id: string, direction: "up" | "down") {
    const result = await adminMoveSectionFn({ data: { id, direction } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete the “${title || "untitled"}” section?`)) return;
    const result = await adminDeleteSectionFn({ data: { id } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="PAGE CONTROLS"
        description="The homepage renders these sections in order. Toggle, reorder or edit them — the storefront updates immediately."
        dataTour="page-controls"
        action={
          <Button
            onClick={startCreate}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            Add section
          </Button>
        }
      />

      {sections.length === 0 ? (
        <AdminCard>
          <AdminEmpty>No sections yet. Add a hero or product grid to start.</AdminEmpty>
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <AdminCard key={section.id}>
              <div className="flex flex-wrap items-start gap-4">
                <span className="font-display text-2xl font-bold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold">{section.title || "(untitled)"}</h2>
                    <AdminBadge tone="pink">{section.type}</AdminBadge>
                    <AdminBadge tone={section.visible ? "green" : "muted"}>
                      {section.visible ? "visible" : "hidden"}
                    </AdminBadge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {section.subtitle || JSON.stringify(section.config)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none px-2 text-[10px] uppercase"
                    onClick={() => move(section.id, "up")}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none px-2 text-[10px] uppercase"
                    onClick={() => move(section.id, "down")}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none text-[10px] uppercase"
                    onClick={() => toggleVisible(section.id, section)}
                  >
                    {section.visible ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none text-[10px] uppercase"
                    onClick={() => startEdit(section)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-none text-[10px] uppercase text-destructive"
                    onClick={() => remove(section.id, section.title)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <AdminCard title="Section config keys">
        <p className="text-[11px] leading-5 text-muted-foreground">
          The config JSON carries advanced section fields: <code>eyebrow</code>,{" "}
          <code>description</code>, <code>cta_text</code>, <code>cta_link</code>,{" "}
          <code>filter</code>, <code>featured_id</code>, <code>content</code>, <code>images</code>{" "}
          (array). Design (colours, typography, alignment, layout) and brand/category/product/review
          picks are managed by the panels in the section dialog — not typed here.
        </p>
      </AdminCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingId ? "EDIT SECTION" : "NEW SECTION"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose a type, set the copy and save.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="mt-4 space-y-4">
            <AdminField label="Type">
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as SectionType })}
                className={inputClass}
              >
                {SECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} — {type.hint}
                  </option>
                ))}
              </select>
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Title">
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <AdminField label="Subtitle">
                <input
                  value={form.subtitle}
                  onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
            </div>
            {sectionUsesImage(form.type) && (
              <ImageField
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                label="Image"
              />
            )}

            {form.type === "brands" && (
              <IdChecklist
                label="Brands"
                hint={`${brands.length} available. Leave all unchecked to show every brand.`}
                items={brands.map((brand) => ({
                  id: brand.id,
                  label: brand.name,
                  image: brand.logoUrl,
                }))}
                selected={form.brandIds}
                onChange={(brandIds) => setForm({ ...form, brandIds })}
                imageShape="logo"
                empty={
                  <>
                    No brands yet.{" "}
                    <a href="/admin/brands" className="underline underline-offset-2">
                      Add brands
                    </a>
                    .
                  </>
                }
              />
            )}

            {form.type === "categories" && (
              <IdChecklist
                label="Categories"
                hint={`${categories.length} available. Leave all unchecked to show every category.`}
                items={categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                  meta: category.slug,
                  image: category.image,
                }))}
                selected={form.categoryIds}
                onChange={(categoryIds) => setForm({ ...form, categoryIds })}
                empty={<>No categories yet. Add them under Categories.</>}
              />
            )}

            {form.type === "products" && (
              <IdChecklist
                label="Products"
                hint={`${products.length} available. Leave all unchecked to show every product.`}
                items={products.map((product) => ({
                  id: product.id,
                  label: product.name,
                  meta: `${product.color} · $${product.price}`,
                  image: product.image,
                }))}
                selected={form.productIds}
                onChange={(productIds) => setForm({ ...form, productIds })}
                empty={<>No products yet. Add them under Products.</>}
              />
            )}

            {form.type === "reviews" && (
              <IdChecklist
                label="Reviews"
                hint={`${approvedReviews.length} approved. Leave all unchecked to show every approved review.`}
                items={approvedReviews.map((review) => ({
                  id: review.id,
                  label: `${review.authorName} — ${review.rating}★`,
                  meta: review.title || review.body,
                  image: review.imageUrl,
                }))}
                selected={form.reviewIds}
                onChange={(reviewIds) => setForm({ ...form, reviewIds })}
                empty={
                  <>
                    No approved reviews yet. Approve them under{" "}
                    <a href="/admin/reviews" className="underline underline-offset-2">
                      Reviews
                    </a>
                    .
                  </>
                }
              />
            )}

            {form.type === "featured_brand" && (
              <AdminField
                label="Brand"
                hint="Fills the logo and name automatically. Your title and eyebrow still override."
              >
                <select
                  value={form.brandId}
                  onChange={(event) => setForm({ ...form, brandId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">No brand — use the fields above</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {brands.length === 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No brands yet.{" "}
                    <a href="/admin/brands" className="underline underline-offset-2">
                      Add brands
                    </a>
                    .
                  </p>
                )}
              </AdminField>
            )}

            <div className="space-y-4 border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]">Design</p>
                  <p className="text-[11px] text-muted-foreground">
                    Optional. Blank fields inherit the site theme.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetStyle}
                  disabled={isSectionStyleEmpty(form.style)}
                  className="rounded-none text-[10px] uppercase"
                >
                  Reset design
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ColorControl
                  label="Background"
                  value={form.style.background}
                  onChange={(background) => updateStyle({ background })}
                />
                <ColorControl
                  label="Eyebrow text"
                  value={form.style.eyebrowColor}
                  onChange={(eyebrowColor) => updateStyle({ eyebrowColor })}
                />
                <ColorControl
                  label="Title colour"
                  value={form.style.titleColor}
                  onChange={(titleColor) => updateStyle({ titleColor })}
                />
                <ColorControl
                  label="Subtitle colour"
                  value={form.style.subtitleColor}
                  onChange={(subtitleColor) => updateStyle({ subtitleColor })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Title typography">
                  <select
                    value={form.style.titleFont ?? ""}
                    onChange={(event) =>
                      updateStyle({ titleFont: event.target.value || undefined })
                    }
                    className={inputClass}
                  >
                    <option value="">Inherit theme</option>
                    {THEME_FONT_FAMILIES.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Subtitle typography">
                  <select
                    value={form.style.bodyFont ?? ""}
                    onChange={(event) => updateStyle({ bodyFont: event.target.value || undefined })}
                    className={inputClass}
                  >
                    <option value="">Inherit theme</option>
                    {THEME_FONT_FAMILIES.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Title size">
                  <select
                    value={form.style.titleSize ?? ""}
                    onChange={(event) =>
                      updateStyle({ titleSize: event.target.value || undefined })
                    }
                    className={inputClass}
                  >
                    <option value="">Section default</option>
                    {SECTION_TEXT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Subtitle size">
                  <select
                    value={form.style.subtitleSize ?? ""}
                    onChange={(event) =>
                      updateStyle({ subtitleSize: event.target.value || undefined })
                    }
                    className={inputClass}
                  >
                    <option value="">Section default</option>
                    {SECTION_SUBTITLE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Text alignment">
                  <select
                    value={form.style.align ?? ""}
                    onChange={(event) => updateStyle({ align: event.target.value || undefined })}
                    className={inputClass}
                  >
                    <option value="">Section default</option>
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </AdminField>
                <label className="flex items-end gap-2 pb-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.style.uppercase ?? false}
                    onChange={(event) => updateStyle({ uppercase: event.target.checked })}
                  />{" "}
                  Uppercase title
                </label>
              </div>

              {sectionUsesImage(form.type) && form.type !== "lookbook" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Image position">
                    <select
                      value={form.style.imageSide ?? ""}
                      onChange={(event) =>
                        updateStyle({ imageSide: event.target.value || undefined })
                      }
                      className={inputClass}
                    >
                      <option value="">Section default</option>
                      <option value="right">Right of the text</option>
                      <option value="left">Left of the text</option>
                    </select>
                  </AdminField>
                  {BACKGROUND_LAYOUT_TYPES.includes(form.type) && (
                    <>
                      <AdminField label="Banner layout">
                        <select
                          value={form.style.layout ?? ""}
                          onChange={(event) =>
                            updateStyle({ layout: event.target.value || undefined })
                          }
                          className={inputClass}
                        >
                          <option value="">Split — image beside text</option>
                          <option value="split">Split</option>
                          <option value="background">Image behind text</option>
                        </select>
                      </AdminField>
                      <AdminField
                        label={`Image overlay — ${form.style.overlay ?? 45}%`}
                        hint="Darkens the photo so text stays readable."
                      >
                        <input
                          type="range"
                          min={0}
                          max={90}
                          step={5}
                          value={form.style.overlay ?? 45}
                          onChange={(event) => updateStyle({ overlay: Number(event.target.value) })}
                          className="w-full"
                        />
                      </AdminField>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Sort order">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                  className={inputClass}
                />
              </AdminField>
              <label className="flex items-end gap-2 pb-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(event) => setForm({ ...form, visible: event.target.checked })}
                />{" "}
                Visible
              </label>
            </div>
            <AdminField label="Config (JSON)" hint="Must be a JSON object.">
              <textarea
                value={form.config}
                onChange={(event) => setForm({ ...form, config: event.target.value })}
                className={`${textareaClass} font-mono text-[11px]`}
                rows={8}
              />
            </AdminField>
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
                {pending ? "Saving…" : "Save section"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
