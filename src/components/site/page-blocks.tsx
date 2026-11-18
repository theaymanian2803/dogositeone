import { Button } from "@/components/ui/button";
import type { PageBlock, PageLayout } from "@/lib/cms";

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function BlockView({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = block.level === 3 ? "h3" : "h2";
      return (
        <Tag className="font-display text-[26px] font-bold leading-tight sm:text-[32px]">
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      return <p className="text-sm leading-7 text-muted-foreground">{block.text}</p>;
    case "image":
      return (
        <figure className="space-y-2">
          <img
            src={block.imageUrl}
            alt={block.alt}
            loading="lazy"
            className="w-full border border-border bg-secondary object-cover"
          />
          {block.caption && (
            <figcaption className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "image_text":
      return (
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <img
            src={block.imageUrl}
            alt={block.alt}
            loading="lazy"
            className={`w-full border border-border bg-secondary object-cover ${
              block.side === "right" ? "sm:order-2" : ""
            }`}
          />
          <p className="text-sm leading-7 text-muted-foreground">{block.text}</p>
        </div>
      );
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "faq":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <details key={item.question} className="border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      );
    case "contact": {
      const candidates: Array<{ label: string; value: string; href?: string | undefined }> = [
        {
          label: "Email",
          value: block.email,
          href: block.email ? `mailto:${block.email}` : undefined,
        },
        {
          label: "Phone",
          value: block.phone,
          href: block.phone ? `tel:${block.phone.replace(/\s/g, "")}` : undefined,
        },
        { label: "Address", value: block.address },
        { label: "Hours", value: block.hours },
      ];
      const rows = candidates.filter((row) => Boolean(row.value));

      return (
        <dl className="grid gap-4 border border-border p-5 text-sm sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-1 leading-6">
                {row.href ? (
                  <a href={row.href} className="underline-offset-4 hover:underline">
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      );
    }
    case "cta":
      return (
        <Button
          asChild
          className="h-11 rounded-none bg-foreground px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
        >
          <a
            href={block.href}
            {...(isExternal(block.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {block.label}
          </a>
        </Button>
      );
    case "divider":
      return <hr className="border-border" />;
    default:
      return null;
  }
}

export function PageBlocks({ blocks, layout }: { blocks: PageBlock[]; layout: PageLayout }) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm leading-7 text-muted-foreground">
        This page is empty. Add blocks in the admin under Pages.
      </p>
    );
  }

  const twoColumns = layout === "two_column";

  return (
    <div className={twoColumns ? "grid items-start gap-6 md:grid-cols-2" : "space-y-6"}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className={
            twoColumns && (block.type === "image" || block.type === "image_text")
              ? "md:col-span-2"
              : ""
          }
        >
          <BlockView block={block} />
        </div>
      ))}
    </div>
  );
}
