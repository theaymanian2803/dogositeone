import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { AdminCard, AdminEmpty, AdminNote, AdminPageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  adminDeleteMediaFn,
  adminMediaFn,
  adminMediaStorageFn,
  adminUploadMediaFn,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/media")({
  loader: async () => {
    const [media, storage] = await Promise.all([adminMediaFn(), adminMediaStorageFn()]);
    return { media, storage };
  },
  component: AdminMedia,
});

function AdminMedia() {
  const { media, storage } = Route.useLoaderData();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const r2Count = media.filter((item) => item.storage === "r2").length;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Images must be 5 MB or smaller.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      const result = await adminUploadMediaFn({ data: { dataUrl } });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Uploaded.");
      await router.invalidate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string, source: "r2" | "database") {
    const where = source === "r2" ? "Cloudflare R2" : "the database";
    if (!window.confirm(`Delete this image from ${where}? Existing product URLs will break.`)) {
      return;
    }
    const result = await adminDeleteMediaFn({ data: { id } });
    if (!result.ok) setMessage(result.error);
    else {
      setMessage("Deleted.");
      await router.invalidate();
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="MEDIA"
        description="Upload an image, then paste its URL into a product, section or page."
        action={
          <label className="inline-flex h-9 cursor-pointer items-center bg-foreground px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground">
            {pending ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
        }
      />

      <AdminNote tone={storage.configured ? "success" : "muted"}>
        {storage.active === "r2"
          ? `Images are stored in Cloudflare R2 and served from ${storage.publicDomain}.`
          : "Images are stored in the database and served from /api/media/:id."}
        {storage.mode === "r2" && !storage.configured
          ? " R2 is selected in Settings but the keys are missing."
          : ""}
      </AdminNote>

      {message && (
        <AdminNote tone={message === "Uploaded." || message === "Deleted." ? "success" : "error"}>
          {message}
        </AdminNote>
      )}

      <AdminCard title={`${media.length} images · ${r2Count} in R2`}>
        {media.length === 0 ? (
          <AdminEmpty>No media yet. Upload an image or keep using files in /public.</AdminEmpty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {media.map((item) => (
              <div key={`${item.storage}-${item.id}`} className="relative border border-border">
                <span className="absolute left-1 top-1 rounded-sm bg-foreground/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-background">
                  {item.storage === "r2" ? "R2" : "DB"}
                </span>
                <img
                  src={item.url}
                  alt=""
                  className="aspect-[4/5] w-full bg-secondary object-cover"
                />
                <div className="space-y-1.5 p-2">
                  <p className="truncate font-mono text-[9px] text-muted-foreground">{item.url}</p>
                  {typeof item.size === "number" && item.storage === "r2" && (
                    <p className="text-[9px] text-muted-foreground">
                      {Math.max(1, Math.round(item.size / 1024))} KB
                    </p>
                  )}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 flex-1 rounded-none px-1 text-[9px] uppercase"
                      onClick={() => {
                        void navigator.clipboard.writeText(item.url);
                        setMessage("URL copied.");
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 rounded-none px-1 text-[9px] uppercase text-destructive"
                      onClick={() => remove(item.id, item.storage)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
