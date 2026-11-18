import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminBadge,
  AdminCard,
  AdminField,
  AdminNote,
  AdminPageHeader,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  adminEmailStatusFn,
  adminMediaStorageFn,
  adminSaveSettingFn,
  adminSendTestEmailFn,
  adminSettingsFn,
} from "@/lib/admin-api";
import type {
  DeliveryZone,
  StoreBranding,
  StoreContact,
  StoreFooter,
  StoreLocale,
  StoreMegamenu,
  StorePopup,
  StoreReviews,
  StoreShipping,
  StoreWhatsApp,
} from "@/lib/store-settings";

export const Route = createFileRoute("/admin/settings")({
  loader: async () => {
    const [settings, email] = await Promise.all([adminSettingsFn(), adminEmailStatusFn()]);
    return { settings, email };
  },
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, email } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="SETTINGS"
        description="Branding, contact details, shipping and storefront behaviour. Changes apply to the public store immediately."
        dataTour="settings"
      />
      <BrandingCard initial={settings.store_branding} />
      <ContactCard initial={settings.store_contact} />
      <ShippingCard initial={settings.store_shipping} />
      <WhatsAppCard initial={settings.store_whatsapp} />
      <LocaleCard initial={settings.store_locale} />
      <MediaCard initial={settings.store_media} />
      <EmailCard initial={email} />
      <ReviewsCard initial={settings.store_reviews} />
      <PopupCard initial={settings.store_popup} />
      <MegamenuCard initial={settings.store_megamenu} />
      <FooterCard initial={settings.store_footer} />
    </div>
  );
}

function EmailCard({
  initial,
}: {
  initial: {
    configured: boolean;
    provider: string;
    from: string;
    ownerConfigured: boolean;
    testRecipientConfigured: boolean;
    testRecipient: string | null;
  };
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    setMessage("");
    setError(false);
    const result = await adminSendTestEmailFn({ data: to.trim() ? { to: to.trim() } : {} });
    setPending(false);
    if (!result.ok) {
      setError(true);
      setMessage(result.error);
      return;
    }
    setMessage(`Test email sent to ${result.to}.`);
  }

  return (
    <AdminCard
      title="Email (Resend)"
      description="Order confirmations, owner alerts and password reset codes."
      action={
        <AdminBadge tone={initial.configured ? "green" : "amber"}>
          {initial.configured ? "configured" : "not configured"}
        </AdminBadge>
      }
    >
      <div className="space-y-1 text-[11px] leading-5 text-muted-foreground">
        <p>
          Provider: <strong className="text-foreground">{initial.provider}</strong>
        </p>
        <p>
          From: <strong className="text-foreground">{initial.from || "not set"}</strong>
        </p>
        <p>
          Owner alerts: {initial.ownerConfigured ? "enabled" : "uses the store contact email"} ·
          Test recipient: {initial.testRecipient ?? "not set"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <AdminField label="Send a test to">
          <input
            className={inputClass}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder={initial.testRecipient ?? "you@example.com"}
            type="email"
          />
        </AdminField>
        <Button type="button" onClick={send} disabled={pending || !initial.configured}>
          {pending ? "Sending…" : "Send test email"}
        </Button>
      </div>

      {message ? (
        <p className={`mt-3 text-[11px] ${error ? "text-destructive" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}

      <AdminNote>
        The API key stays server-side. If email is not configured, checkout still succeeds and the
        admin-issued password reset code remains the fallback.
      </AdminNote>
    </AdminCard>
  );
}

function MediaCard({ initial }: { initial: { storage: "auto" | "r2" | "database" } }) {
  const [mode, setMode] = useState(initial.storage);
  const [status, setStatus] = useState<{
    configured: boolean;
    publicDomain: string;
  } | null>(null);
  const { save, message, tone, pending } = useSaveSetting();

  useEffect(() => {
    let active = true;
    adminMediaStorageFn()
      .then((value) => {
        if (active) setStatus({ configured: value.configured, publicDomain: value.publicDomain });
      })
      .catch(() => {
        if (active) setStatus({ configured: false, publicDomain: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminCard>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_media", { storage: mode });
        }}
        className="space-y-4"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Image storage</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where product images, page media and seller uploads are saved.
          </p>
        </div>
        <AdminField label="Storage">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
            className={inputClass}
          >
            <option value="auto">Automatic — R2 when configured, otherwise the database</option>
            <option value="r2">Cloudflare R2 only</option>
            <option value="database">Database only</option>
          </select>
        </AdminField>
        <AdminNote tone={status && !status.configured ? "error" : "muted"}>
          {status === null
            ? "Checking the R2 configuration…"
            : status.configured
              ? `Cloudflare R2 is configured. Public URLs come from ${status.publicDomain}.`
              : "R2 keys are not set on this deployment. Keep Automatic or Database, or add the R2_* environment variables."}
        </AdminNote>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function useSaveSetting() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [pending, setPending] = useState(false);

  async function save(key: string, value: unknown) {
    setPending(true);
    setMessage("");
    const result = await adminSaveSettingFn({ data: { key: key as never, value } });
    setPending(false);
    if (!result.ok) {
      setTone("error");
      setMessage(result.error);
      return;
    }
    setTone("success");
    setMessage("Saved.");
    await router.invalidate();
  }

  return { save, message, tone, pending };
}

function Footer({
  message,
  tone,
  pending,
}: {
  message: string;
  tone: "success" | "error";
  pending: boolean;
}) {
  return (
    <div className="mt-4 space-y-2">
      {message && <AdminNote tone={tone}>{message}</AdminNote>}
      <Button
        type="submit"
        disabled={pending}
        className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function BrandingCard({ initial }: { initial: StoreBranding }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Branding" description="Name, logo text and the announcement bar.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_branding", form);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField label="Store name">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Logo text">
            <input
              value={form.logoText}
              onChange={(event) => setForm({ ...form, logoText: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Announcement">
            <input
              value={form.announcement}
              onChange={(event) => setForm({ ...form, announcement: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function ContactCard({ initial }: { initial: StoreContact }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Contact" description="Shown in the footer and on the contact page.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_contact", form);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Phone">
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Address">
            <input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Hours">
            <input
              value={form.hours}
              onChange={(event) => setForm({ ...form, hours: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function ShippingCard({ initial }: { initial: StoreShipping }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();

  const zonesText = form.zones
    .map((zone) => `${zone.city}|${zone.fee}|${zone.freeThreshold ?? ""}`)
    .join("\n");

  function setZones(value: string) {
    const zones: DeliveryZone[] = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [city, fee, freeThreshold] = line.split("|").map((part) => part.trim());
        if (!city || !fee) return null;
        const feeValue = Number(fee);
        if (!Number.isFinite(feeValue)) return null;
        const freeValue = freeThreshold ? Number(freeThreshold) : undefined;
        return {
          city,
          fee: feeValue,
          ...(Number.isFinite(freeValue) ? { freeThreshold: freeValue } : {}),
        } as DeliveryZone;
      })
      .filter((zone): zone is DeliveryZone => Boolean(zone));
    setForm({ ...form, zones });
  }

  return (
    <AdminCard
      title="Shipping and cash on delivery"
      description="Used by checkout to calculate delivery on the server. Leave zones empty to use the flat rate for every city."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_shipping", form);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField label="Flat rate">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.flatRate}
              onChange={(event) => setForm({ ...form, flatRate: Number(event.target.value) })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Free over">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freeThreshold}
              onChange={(event) => setForm({ ...form, freeThreshold: Number(event.target.value) })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Currency">
            <input
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
              className={inputClass}
              maxLength={3}
            />
          </AdminField>
          <AdminField label="COD label">
            <input
              value={form.codLabel}
              onChange={(event) => setForm({ ...form, codLabel: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Minimum order" hint="0 = no minimum.">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minOrder}
              onChange={(event) => setForm({ ...form, minOrder: Number(event.target.value) })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Delivery time">
            <input
              value={form.deliveryTime}
              onChange={(event) => setForm({ ...form, deliveryTime: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
        <AdminField
          label="Delivery zones"
          hint="One per line: City|fee|free threshold. Empty = flat rate for every city."
        >
          <textarea
            value={zonesText}
            onChange={(event) => setZones(event.target.value)}
            rows={4}
            className={textareaClass}
            placeholder={"Casablanca|30|500\nRabat|40|500"}
          />
        </AdminField>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function WhatsAppCard({ initial }: { initial: StoreWhatsApp }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard
      title="WhatsApp orders"
      description="Customer-facing WhatsApp button and the number that receives new-order alerts."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_whatsapp", form);
        }}
        className="space-y-4"
      >
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          Show the WhatsApp order button
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Shop WhatsApp number" hint="International digits, e.g. 2126…">
            <input
              value={form.number}
              onChange={(event) => setForm({ ...form, number: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField
            label="Owner alert number"
            hint="Used by the Meta Cloud API for new-order alerts."
          >
            <input
              value={form.ownerNumber}
              onChange={(event) => setForm({ ...form, ownerNumber: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Button label">
            <input
              value={form.buttonLabel}
              onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })}
              className={inputClass}
            />
          </AdminField>
        </div>
        <AdminField label="Opening message">
          <textarea
            value={form.orderMessage}
            onChange={(event) => setForm({ ...form, orderMessage: event.target.value })}
            rows={3}
            className={textareaClass}
          />
        </AdminField>
        <AdminNote>
          New-order alerts need `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and
          `WHATSAPP_OWNER_NUMBER` in `.env`. Without them the order is still stored.
        </AdminNote>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function LocaleCard({ initial }: { initial: StoreLocale }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard
      title="Language"
      description="Storefront language. Content pages and products stay editable in either language."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_locale", form);
        }}
        className="space-y-4"
      >
        <AdminField label="Storefront language">
          <select
            value={form.language}
            onChange={(event) =>
              setForm({ ...form, language: event.target.value as StoreLocale["language"] })
            }
            className={inputClass}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </AdminField>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function ReviewsCard({ initial }: { initial: StoreReviews }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Reviews" description="Control whether new reviews wait for approval.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_reviews", form);
        }}
        className="space-y-4"
      >
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.requireApproval}
            onChange={(event) => setForm({ requireApproval: event.target.checked })}
          />{" "}
          Require admin approval before publishing
        </label>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function PopupCard({ initial }: { initial: StorePopup }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Promo popup" description="Optional welcome popup on the storefront.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_popup", form);
        }}
        className="space-y-4"
      >
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />{" "}
          Show the popup
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Title">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Code">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              className={inputClass}
            />
          </AdminField>
          <AdminField label="Body">
            <textarea
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              className={textareaClass}
              rows={3}
            />
          </AdminField>
          <AdminField label="Delay (seconds)">
            <input
              type="number"
              min="0"
              value={form.delaySeconds}
              onChange={(event) => setForm({ ...form, delaySeconds: Number(event.target.value) })}
              className={inputClass}
            />
          </AdminField>
        </div>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function MegamenuCard({ initial }: { initial: StoreMegamenu }) {
  const [form, setForm] = useState(initial);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Navigation" description="Header behaviour and the featured collection.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save("store_megamenu", form);
        }}
        className="space-y-4"
      >
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />{" "}
          Show the announcement bar and full navigation
        </label>
        <AdminField label="Featured category">
          <input
            value={form.featuredCategory}
            onChange={(event) => setForm({ ...form, featuredCategory: event.target.value })}
            className={inputClass}
            placeholder="dogs"
          />
        </AdminField>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}

function FooterCard({ initial }: { initial: StoreFooter }) {
  const [socials, setSocials] = useState(JSON.stringify(initial.socials, null, 2));
  const [links, setLinks] = useState(JSON.stringify(initial.companyLinks, null, 2));
  const [note, setNote] = useState(initial.note);
  const { save, message, tone, pending } = useSaveSetting();
  return (
    <AdminCard title="Footer" description="Social links and company links as JSON arrays.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            void save("store_footer", {
              socials: JSON.parse(socials),
              companyLinks: JSON.parse(links),
              note,
            });
          } catch {
            void save("store_footer", initial);
          }
        }}
        className="space-y-4"
      >
        <AdminField label="Social links (JSON)">
          <textarea
            value={socials}
            onChange={(event) => setSocials(event.target.value)}
            className={`${textareaClass} font-mono text-[11px]`}
            rows={4}
          />
        </AdminField>
        <AdminField label="Company links (JSON)">
          <textarea
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            className={`${textareaClass} font-mono text-[11px]`}
            rows={4}
          />
        </AdminField>
        <AdminField label="Footer note">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </AdminField>
        <Footer {...{ message, tone, pending }} />
      </form>
    </AdminCard>
  );
}
