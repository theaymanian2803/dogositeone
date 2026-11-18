import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminCard,
  AdminField,
  AdminNote,
  AdminPageHeader,
  ImageField,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { adminPagesFn, adminSavePageFn } from "@/lib/admin-api";
import {
  PAGE_BLOCK_TYPES,
  PAGE_KEYS,
  PAGE_LAYOUTS,
  newBlockId,
  type PageBlock,
  type PageBlockType,
  type PageContent,
  type PageLayout,
} from "@/lib/cms";

export const Route = createFileRoute("/admin/pages")({
  loader: () => adminPagesFn(),
  component: AdminPages,
});

function newBlock(type: PageBlockType): PageBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2 };
    case "paragraph":
      return { id, type, text: "" };
    case "image":
      return { id, type, imageUrl: "", alt: "", caption: "" };
    case "image_text":
      return { id, type, imageUrl: "", alt: "", side: "left", text: "" };
    case "list":
      return { id, type, items: [""] };
    case "faq":
      return { id, type, items: [{ question: "", answer: "" }] };
    case "contact":
      return { id, type, email: "", phone: "", address: "", hours: "" };
    case "cta":
      return { id, type, label: "", href: "/" };
    case "divider":
      return { id, type };
  }
}

function isBlockEmpty(block: PageBlock): boolean {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return !block.text.trim();
    case "image":
      return !block.imageUrl;
    case "image_text":
      return !block.imageUrl || !block.text.trim();
    case "list":
      return !block.items.some((item) => item.trim());
    case "faq":
      return !block.items.some((item) => item.question.trim() && item.answer.trim());
    case "contact":
      return ![block.email, block.phone, block.address, block.hours].some((value) => value.trim());
    case "cta":
      return !block.label.trim();
    case "divider":
      return false;
  }
}

function blockLabel(type: PageBlockType): string {
  return PAGE_BLOCK_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

function AdminPages() {
  const pages = Route.useLoaderData();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="PAGES"
        description="Editable storefront pages. Build each page from blocks, then it renders at /pages/<key> and is linked from the footer."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {PAGE_KEYS.map((page) => {
          const existing = pages.find((item) => item.pageKey === page.key);
          return (
            <PageEditor key={page.key} pageKey={page.key} label={page.label} initial={existing} />
          );
        })}
      </div>
    </div>
  );
}

function PageEditor({
  pageKey,
  label,
  initial,
}: {
  pageKey: string;
  label: string;
  initial: PageContent | undefined;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? label);
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? "");
  const [heroImage, setHeroImage] = useState(initial?.heroImage ?? "");
  const [layout, setLayout] = useState<PageLayout>(initial?.layout ?? "stacked");
  const [blocks, setBlocks] = useState<PageBlock[]>(initial?.blocks ?? []);
  const [newType, setNewType] = useState<PageBlockType>("paragraph");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function patchBlock(id: string, patch: Record<string, unknown>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? ({ ...block, ...patch } as PageBlock) : block)),
    );
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (blocks.some(isBlockEmpty)) {
      setMessage("Fill in or remove the incomplete blocks before saving.");
      return;
    }
    setPending(true);
    setMessage("");
    const result = await adminSavePageFn({
      data: { pageKey, title, eyebrow, heroImage, layout, blocks },
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Saved.");
    await router.invalidate();
  }

  return (
    <AdminCard title={`${label} page`} description={`/pages/${pageKey}`}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Eyebrow" hint="Small label above the title.">
            <input
              value={eyebrow}
              onChange={(event) => setEyebrow(event.target.value)}
              placeholder="Information"
              className={inputClass}
            />
          </AdminField>
        </div>

        <AdminField label="Layout" hint="Two columns puts blocks side by side on desktop.">
          <select
            value={layout}
            onChange={(event) => setLayout(event.target.value as PageLayout)}
            className={inputClass}
          >
            {PAGE_LAYOUTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </AdminField>

        <ImageField value={heroImage} onChange={setHeroImage} label="Hero image (optional)" />

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">Content blocks</p>
          {blocks.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No blocks yet. Add one below — headings, text, images, lists, FAQs, contact details.
            </p>
          )}
          {blocks.map((block, index) => (
            <div key={block.id} className="border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {index + 1}. {blockLabel(block.type)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveBlock(block.id, -1)}
                    disabled={index === 0}
                    aria-label="Move block up"
                    className="rounded-none px-2 text-[10px] uppercase"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveBlock(block.id, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label="Move block down"
                    className="rounded-none px-2 text-[10px] uppercase"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBlocks((current) => current.filter((entry) => entry.id !== block.id))
                    }
                    className="rounded-none px-2 text-[10px] uppercase"
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <BlockFields block={block} patch={(patch) => patchBlock(block.id, patch)} />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <AdminField label="Add a block">
              <select
                value={newType}
                onChange={(event) => setNewType(event.target.value as PageBlockType)}
                className={inputClass}
              >
                {PAGE_BLOCK_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlocks((current) => [...current, newBlock(newType)])}
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              + Add block
            </Button>
          </div>
        </div>

        {message && (
          <AdminNote tone={message === "Saved." ? "success" : "error"}>{message}</AdminNote>
        )}
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-foreground text-[10px] uppercase text-background hover:bg-hot-pink hover:text-foreground"
        >
          {pending ? "Saving…" : "Save page"}
        </Button>
      </form>
    </AdminCard>
  );
}

function BlockFields({
  block,
  patch,
}: {
  block: PageBlock;
  patch: (patch: Record<string, unknown>) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <AdminField label="Text">
            <input
              value={block.text}
              onChange={(event) => patch({ text: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Level">
            <select
              value={String(block.level)}
              onChange={(event) => patch({ level: Number(event.target.value) })}
              className={inputClass}
            >
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
          </AdminField>
        </div>
      );
    case "paragraph":
      return (
        <AdminField label="Text">
          <textarea
            value={block.text}
            onChange={(event) => patch({ text: event.target.value })}
            rows={4}
            className={textareaClass}
          />
        </AdminField>
      );
    case "image":
      return (
        <>
          <ImageField
            value={block.imageUrl}
            onChange={(imageUrl) => patch({ imageUrl })}
            label="Image"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Alt text">
              <input
                value={block.alt}
                onChange={(event) => patch({ alt: event.target.value })}
                className={inputClass}
              />
            </AdminField>
            <AdminField label="Caption">
              <input
                value={block.caption}
                onChange={(event) => patch({ caption: event.target.value })}
                className={inputClass}
              />
            </AdminField>
          </div>
        </>
      );
    case "image_text":
      return (
        <>
          <ImageField
            value={block.imageUrl}
            onChange={(imageUrl) => patch({ imageUrl })}
            label="Image"
          />
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <AdminField label="Image side">
              <select
                value={block.side}
                onChange={(event) => patch({ side: event.target.value })}
                className={inputClass}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </AdminField>
            <AdminField label="Alt text">
              <input
                value={block.alt}
                onChange={(event) => patch({ alt: event.target.value })}
                className={inputClass}
              />
            </AdminField>
          </div>
          <AdminField label="Text">
            <textarea
              value={block.text}
              onChange={(event) => patch({ text: event.target.value })}
              rows={4}
              className={textareaClass}
            />
          </AdminField>
        </>
      );
    case "list":
      return (
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(event) =>
                  patch({
                    items: block.items.map((value, position) =>
                      position === index ? event.target.value : value,
                    ),
                  })
                }
                placeholder={`Item ${index + 1}`}
                className={inputClass}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({ items: block.items.filter((_, position) => position !== index) })
                }
                className="rounded-none px-2 text-[10px] uppercase"
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ items: [...block.items, ""] })}
            className="rounded-none text-[10px] uppercase"
          >
            + Add item
          </Button>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <div key={index} className="space-y-2 border border-border p-2">
              <input
                value={item.question}
                onChange={(event) =>
                  patch({
                    items: block.items.map((value, position) =>
                      position === index ? { ...value, question: event.target.value } : value,
                    ),
                  })
                }
                placeholder="Question"
                className={inputClass}
              />
              <textarea
                value={item.answer}
                onChange={(event) =>
                  patch({
                    items: block.items.map((value, position) =>
                      position === index ? { ...value, answer: event.target.value } : value,
                    ),
                  })
                }
                placeholder="Answer"
                rows={2}
                className={textareaClass}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({ items: block.items.filter((_, position) => position !== index) })
                }
                className="rounded-none px-2 text-[10px] uppercase"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ items: [...block.items, { question: "", answer: "" }] })}
            className="rounded-none text-[10px] uppercase"
          >
            + Add question
          </Button>
        </div>
      );
    case "contact":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Email">
            <input
              value={block.email}
              onChange={(event) => patch({ email: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Phone">
            <input
              value={block.phone}
              onChange={(event) => patch({ phone: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Address">
            <input
              value={block.address}
              onChange={(event) => patch({ address: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Hours">
            <input
              value={block.hours}
              onChange={(event) => patch({ hours: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
      );
    case "cta":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Label">
            <input
              value={block.label}
              onChange={(event) => patch({ label: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Link" hint="A path like /pages/faq, an #anchor, or https://…">
            <input
              value={block.href}
              onChange={(event) => patch({ href: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
      );
    case "divider":
      return <p className="text-[11px] text-muted-foreground">A horizontal rule.</p>;
  }
}
