import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useSections } from "@/hooks/useSections";
import { useSettings } from "@/hooks/useSettings";
import { turso } from "@/integrations/turso/client";
import type { GridItem, Section, SectionEntry } from "@/lib/sections";
import { FIXED_SECTION_LABELS, parseSectionsOrder, serializeSectionsOrder } from "@/lib/sections";

const inputClass =
  "h-10 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25";

const emptyGridItem = (): GridItem => ({ image: "", label: "", link: "" });

type EditorState = { mode: "add" } | { mode: "edit"; section: Section } | null;

export function ControlsManager() {
  const { rows, sections, refresh } = useSections();
  const { settings, refresh: refreshSettings } = useSettings();
  const [editor, setEditor] = useState<EditorState>(null);

  async function persistOrder(next: SectionEntry[]) {
    await turso.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: ["homepage_sections", serializeSectionsOrder(next)],
    });
    await refreshSettings();
  }

  async function toggleVisible(id: string) {
    const next = parseSectionsOrder(settings.homepage_sections, sections).map((e) =>
      e.id === id ? { ...e, visible: !e.visible } : e,
    );
    await persistOrder(next);
  }

  async function move(id: string, dir: -1 | 1) {
    const list = parseSectionsOrder(settings.homepage_sections, sections);
    const idx = list.findIndex((e) => e.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= list.length) return;
    const next = [...list];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    await persistOrder(next);
  }

  async function saveSection(section: Section, mode: "add" | "edit") {
    const isNew = mode === "add";
    try {
      await turso.execute({
        sql: isNew
          ? "INSERT INTO sections (id, type, name, size, image_url, title, subtitle, button_text, button_link, grid_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          : "UPDATE sections SET type=?, name=?, size=?, image_url=?, title=?, subtitle=?, button_text=?, button_link=?, grid_items=? WHERE id=?",
        args: isNew
          ? [
              section.id,
              section.type,
              section.name,
              section.size,
              section.image_url,
              section.title,
              section.subtitle,
              section.button_text,
              section.button_link,
              JSON.stringify(section.grid_items),
            ]
          : [
              section.type,
              section.name,
              section.size,
              section.image_url,
              section.title,
              section.subtitle,
              section.button_text,
              section.button_link,
              JSON.stringify(section.grid_items),
              section.id,
            ],
      });
      if (isNew) {
        const next = parseSectionsOrder(settings.homepage_sections, sections);
        next.push({ id: `sec:${section.id}`, visible: true });
        await persistOrder(next);
      }
      await refresh();
      setEditor(null);
      toast.success(isNew ? "Section added" : "Section updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving section");
    }
  }

  async function deleteSection(id: string) {
    try {
      await turso.execute({
        sql: "DELETE FROM sections WHERE id = ?",
        args: [id.slice(4)],
      });
      const next = parseSectionsOrder(settings.homepage_sections, sections).filter(
        (e) => e.id !== id,
      );
      await persistOrder(next);
      await refresh();
      toast.success("Section deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting section");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Controls
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Arrange the homepage: toggle sections on/off, reorder them, and add custom banners or
            image grids.
          </p>
        </div>
        <button
          onClick={() => setEditor({ mode: "add" })}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add section
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((row, i) => {
          const label = row.isCustom
            ? (row.section?.name ?? "Section")
            : (FIXED_SECTION_LABELS[row.id] ?? row.id);
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3"
            >
              <button
                onClick={() => move(row.id, -1)}
                disabled={i === 0}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronLeft className="h-4 w-4 rotate-90" />
              </button>
              <button
                onClick={() => move(row.id, 1)}
                disabled={i === rows.length - 1}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronRight className="h-4 w-4 rotate-90" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                {row.isCustom && row.section && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {row.section.type === "grid"
                      ? "Grid"
                      : `Banner · ${row.section.size[0].toUpperCase()}${row.section.size.slice(1)}`}
                  </p>
                )}
              </div>
              {row.isCustom && row.section && (
                <>
                  <button
                    onClick={() => setEditor({ mode: "edit", section: row.section! })}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-secondary"
                    aria-label="Edit section"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => deleteSection(row.id)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-red-50"
                    aria-label="Delete section"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {row.visible ? "On" : "Off"}
                </span>
                <button
                  onClick={() => toggleVisible(row.id)}
                  role="switch"
                  aria-checked={row.visible}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    row.visible ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      row.visible ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {editor && (
        <SectionEditorModal
          mode={editor.mode}
          initial={editor.mode === "edit" ? editor.section : undefined}
          onClose={() => setEditor(null)}
          onSave={(section) => saveSection(section, editor.mode)}
        />
      )}
    </section>
  );
}

function SectionEditorModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Section;
  onClose: () => void;
  onSave: (section: Section) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Section["type"]>(initial?.type ?? "banner");
  const [size, setSize] = useState<Section["size"]>(initial?.size ?? "medium");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(initial?.button_text ?? "");
  const [buttonLink, setButtonLink] = useState(initial?.button_link ?? "");
  const [tiles, setTiles] = useState<GridItem[]>(
    initial?.grid_items?.length
      ? initial.grid_items
      : [emptyGridItem(), emptyGridItem(), emptyGridItem()],
  );

  function updateTile(i: number, patch: Partial<GridItem>) {
    setTiles((t) => t.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the section a name");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      type,
      name: name.trim(),
      size,
      image_url: imageUrl.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      button_text: buttonText.trim(),
      button_link: buttonLink.trim(),
      grid_items: tiles.map((t) => ({
        image: t.image.trim(),
        label: t.label.trim(),
        link: t.link.trim(),
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12">
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[calc(100dvh-6rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-xl shadow-foreground/10">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {mode === "add" ? "Add Section" : "Edit Section"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 pt-5 pb-6">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Sale"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Section["type"])}
                  className={inputClass}
                >
                  <option value="banner">Banner</option>
                  <option value="grid">Image grid</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as Section["size"])}
                  className={inputClass}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>

          {type === "banner" ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Image URL</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Summer Sale"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Subtitle</label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Button text</label>
                  <input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Shop Now"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Button link</label>
                  <input
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="/shop"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grid tiles (2–8)
              </p>
              {tiles.map((tile, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Tile {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTiles((t) => t.filter((_, idx) => idx !== i))}
                      className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove tile ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    placeholder="Image URL"
                    value={tile.image}
                    onChange={(e) => updateTile(i, { image: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    placeholder="Label"
                    value={tile.label}
                    onChange={(e) => updateTile(i, { label: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    placeholder="Link (e.g. /category/dogs)"
                    value={tile.link}
                    onChange={(e) => updateTile(i, { link: e.target.value })}
                    className={inputClass}
                  />
                </div>
              ))}
              {tiles.length < 8 && (
                <button
                  type="button"
                  onClick={() => setTiles((t) => [...t, emptyGridItem()])}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <Plus className="h-4 w-4" /> Add tile
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <Save className="h-4 w-4" /> {mode === "add" ? "Add Section" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
