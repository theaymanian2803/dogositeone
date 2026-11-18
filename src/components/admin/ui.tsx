import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { adminUploadMediaFn } from "@/lib/admin-api";

export function AdminPageHeader({
  title,
  description,
  action,
  dataTour,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  dataTour?: string;
}) {
  return (
    <div
      data-tour={dataTour}
      className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"
    >
      <div>
        <h1 className="font-display text-[32px] font-bold leading-none sm:text-[40px]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-background ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-bold uppercase tracking-[0.08em]">{title}</h2>}
            {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-hot-pink";

export const textareaClass =
  "min-h-24 w-full resize-y border border-border bg-background px-3 py-2 text-sm outline-none focus:border-hot-pink";

export function AdminNote({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "error" | "success";
}) {
  const toneClass =
    tone === "error"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-600"
        : "text-muted-foreground";
  return <p className={`text-[11px] leading-5 ${toneClass}`}>{children}</p>;
}

export function AdminBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "pink" | "green" | "amber" | "red";
}) {
  const classes = {
    muted: "border-border text-muted-foreground",
    pink: "border-hot-pink/40 bg-hot-pink/10 text-foreground",
    green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    red: "border-destructive/40 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{children}</p>;
}

const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.82;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode that image."));
    image.src = src;
  });
}

/**
 * Shrinks uploads in the browser before they reach the database: longest edge
 * capped at 1600px, re-encoded as WebP (JPEG fallback). Animated GIFs and files
 * already under ~400 KB are left untouched.
 */
async function optimiseImage(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  if (file.type === "image/gif") return dataUrl;
  try {
    const image = await loadImage(dataUrl);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longest : 1;
    if (scale === 1 && file.size <= 400 * 1024) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const webp = canvas.toDataURL("image/webp", IMAGE_QUALITY);
    return webp.startsWith("data:image/webp")
      ? webp
      : canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
  } catch {
    return dataUrl;
  }
}

export function ImageField({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const inputId = useId();
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    setStatus("");
    try {
      const dataUrl = await optimiseImage(file);
      const result = await adminUploadMediaFn({ data: { dataUrl } });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      onChange(result.media.url);
      setStatus("Uploaded and optimised.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-start gap-3">
        <div className="h-20 w-16 border border-border bg-secondary">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[9px] text-muted-foreground">
              none
            </span>
          )}
        </div>
        <div className="min-w-[180px] flex-1 space-y-2">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/products/bone.jpg or /api/media/…"
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0])}
            />
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              <label htmlFor={inputId}>{uploading ? "Uploading…" : "Upload"}</label>
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                className="rounded-none text-[10px] uppercase"
              >
                Clear
              </Button>
            )}
            {status && <span className="text-[10px] text-muted-foreground">{status}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {headers.map((header) => (
              <th key={header} scope="col" className="py-2 pr-4 last:pr-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
