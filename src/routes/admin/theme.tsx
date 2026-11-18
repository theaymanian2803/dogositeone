import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminCard,
  AdminField,
  AdminNote,
  AdminPageHeader,
  inputClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { adminSaveSettingFn, adminSettingsFn } from "@/lib/admin-api";
import { THEME_FONTS, THEME_FONT_FAMILIES, type StoreTheme } from "@/lib/store-settings";

export const Route = createFileRoute("/admin/theme")({
  loader: () => adminSettingsFn(),
  component: AdminTheme,
});

function AdminTheme() {
  const settings = Route.useLoaderData();
  const initial = settings.store_theme;
  const router = useRouter();
  const [form, setForm] = useState<StoreTheme>(initial);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await adminSaveSettingFn({ data: { key: "store_theme", value: form } });
    setPending(false);
    if (!result.ok) {
      setTone("error");
      setMessage(result.error);
      return;
    }
    setTone("success");
    setMessage("Theme saved.");
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="THEME"
        description="Display and body fonts plus the accent colour used across the storefront."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <AdminCard title="Fonts & accent">
          <form onSubmit={save} className="space-y-4">
            <AdminField label="Font pairing">
              <select
                value={`${form.displayFont}|${form.bodyFont}`}
                onChange={(event) => {
                  const [displayFont, bodyFont] = event.target.value.split("|");
                  setForm({
                    ...form,
                    displayFont: displayFont ?? form.displayFont,
                    bodyFont: bodyFont ?? form.bodyFont,
                  });
                }}
                className={inputClass}
              >
                {THEME_FONTS.map((pair) => (
                  <option key={pair.label} value={`${pair.display}|${pair.body}`}>
                    {pair.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Display font">
                <select
                  value={form.displayFont}
                  onChange={(event) => setForm({ ...form, displayFont: event.target.value })}
                  className={inputClass}
                >
                  {THEME_FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Body font">
                <select
                  value={form.bodyFont}
                  onChange={(event) => setForm({ ...form, bodyFont: event.target.value })}
                  className={inputClass}
                >
                  {THEME_FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
            <AdminField label="Accent colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent}
                  onChange={(event) => setForm({ ...form, accent: event.target.value })}
                  className="h-10 w-14 border border-border bg-background p-1"
                />
                <input
                  value={form.accent}
                  onChange={(event) => setForm({ ...form, accent: event.target.value })}
                  className={inputClass}
                />
              </div>
            </AdminField>
            {message && <AdminNote tone={tone}>{message}</AdminNote>}
            <Button
              type="submit"
              disabled={pending}
              className="rounded-none bg-foreground text-[10px] uppercase text-background hover:bg-hot-pink hover:text-foreground"
            >
              {pending ? "Saving…" : "Save theme"}
            </Button>
          </form>
        </AdminCard>

        <AdminCard title="Preview" description="A quick look at the current pairing.">
          <div
            className="border border-border p-6"
            style={{
              fontFamily: `"${form.bodyFont}", sans-serif`,
              ["--preview-accent" as string]: form.accent,
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: form.accent }}
            >
              Collection / Preview
            </p>
            <p
              className="mt-2 text-[38px] font-extrabold leading-[0.9]"
              style={{ fontFamily: `"${form.displayFont}", sans-serif` }}
            >
              YOUR NEW FAVOURITE.
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Thoughtful food, durable toys and everyday essentials for happy pets.
            </p>
            <span
              className="mt-4 inline-flex px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-background"
              style={{ backgroundColor: form.accent }}
            >
              Shop the collection
            </span>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
