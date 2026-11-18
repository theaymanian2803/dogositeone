import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Database,
  KeyRound,
  ListChecks,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  AdminBadge,
  AdminCard,
  AdminField,
  AdminNote,
  AdminPageHeader,
  inputClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { restartOnboarding } from "@/lib/onboarding";
import {
  adminActivateLicenseFn,
  adminChangeCredentialsFn,
  adminConnectDbFn,
  adminDeactivateLicenseFn,
  adminResetDbFn,
  adminSetupStatusFn,
  adminTestDbFn,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/setup")({
  loader: () => adminSetupStatusFn(),
  component: AdminSetup,
});

const CHECKLIST = [
  { key: "brand", label: "Set your branding", href: "/admin/settings" },
  { key: "products", label: "Add or edit products", href: "/admin/products" },
  { key: "page", label: "Arrange the homepage", href: "/admin/page-controls" },
  { key: "theme", label: "Choose fonts and accent", href: "/admin/theme" },
  { key: "order", label: "Place a test order", href: "/checkout" },
  { key: "database", label: "Connect your own database", href: "/admin/setup" },
] as const;

function loadProgress(): string[] {
  try {
    const raw = localStorage.getItem("pace_setup_progress");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function AdminSetup() {
  const status = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();

  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(loadProgress()), []);

  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [keepSeed, setKeepSeed] = useState(true);
  const [dbMessage, setDbMessage] = useState("");
  const [dbTone, setDbTone] = useState<"muted" | "error" | "success">("muted");
  const [dbPending, setDbPending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credMessage, setCredMessage] = useState("");
  const [credTone, setCredTone] = useState<"muted" | "error" | "success">("muted");

  const [licenseKey, setLicenseKey] = useState("");
  const [licenseMessage, setLicenseMessage] = useState("");

  function toggle(key: string) {
    const next = done.includes(key) ? done.filter((item) => item !== key) : [...done, key];
    setDone(next);
    try {
      localStorage.setItem("pace_setup_progress", JSON.stringify(next));
    } catch {
      // progress is a nicety
    }
  }

  async function testConnection() {
    setDbPending(true);
    setDbMessage("");
    try {
      const result = await adminTestDbFn({ data: { url, token } });
      setDbTone(result.ok ? "success" : "error");
      setDbMessage(result.message);
    } catch (error) {
      setDbTone("error");
      setDbMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setDbPending(false);
    }
  }

  async function connect() {
    setDbPending(true);
    setDbMessage("");
    try {
      const result = await adminConnectDbFn({ data: { url, token, keepSeed } });
      if (!result.ok) {
        setDbTone("error");
        setDbMessage(result.error);
        return;
      }
      setDbTone("success");
      setDbMessage(
        "Connected. You will be signed out of the old database — create or sign in to the owner account on the new one.",
      );
      setTimeout(() => navigate({ to: "/admin/login" }), 1200);
    } catch (error) {
      setDbTone("error");
      setDbMessage(error instanceof Error ? error.message : "Could not connect.");
    } finally {
      setDbPending(false);
    }
  }

  async function resetDatabase() {
    if (!window.confirm("Go back to the environment database?")) return;
    const result = await adminResetDbFn();
    if (!result.ok) {
      setDbTone("error");
      setDbMessage(result.error);
      return;
    }
    setDbTone("success");
    setDbMessage("Back to the environment database.");
    await router.invalidate();
  }

  async function saveCredentials(event: React.FormEvent) {
    event.preventDefault();
    setCredMessage("");
    const result = await adminChangeCredentialsFn({
      data: {
        currentPassword,
        ...(email ? { email } : {}),
        ...(newPassword ? { newPassword } : {}),
      },
    });
    if (!result.ok) {
      setCredTone("error");
      setCredMessage(result.error);
      return;
    }
    setCredTone("success");
    setCredMessage("Credentials updated. Existing sessions were signed out.");
    setCurrentPassword("");
    setNewPassword("");
    setEmail("");
    await router.invalidate();
  }

  async function activate() {
    setLicenseMessage("");
    const result = await adminActivateLicenseFn({ data: { key: licenseKey } });
    if (!result.ok) {
      setLicenseMessage(result.error);
      return;
    }
    setLicenseMessage("License activated.");
    await router.invalidate();
  }

  async function deactivate() {
    const result = await adminDeactivateLicenseFn();
    if (!result.ok) {
      setLicenseMessage(result.error);
      return;
    }
    setLicenseMessage("License removed.");
    await router.invalidate();
  }

  const completed = CHECKLIST.filter((item) => done.includes(item.key)).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="SETUP"
        description="Connect a database, secure the owner login and work through the launch checklist. The storefront stays available the whole time."
        dataTour="setup"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              restartOnboarding();
              window.location.reload();
            }}
            className="rounded-none text-[10px] uppercase tracking-[0.08em]"
          >
            Restart tour
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          label="Database"
          value={status.db.usingCustom ? "Your Turso DB" : "Environment DB"}
          tone={status.db.usingCustom ? "green" : "amber"}
        />
        <Summary label="Products" value={String(status.counts.products)} />
        <Summary label="Orders" value={String(status.counts.orders)} />
        <Summary label="Admins" value={String(status.counts.admins)} />
      </div>

      <AdminCard
        title="Database"
        description="The store ships on its environment database. Connect your own Turso database to keep data private."
        action={
          <AdminBadge tone={status.db.usingCustom ? "green" : "amber"}>
            {status.db.usingCustom ? "custom" : "environment"}
          </AdminBadge>
        }
      >
        <div className="space-y-4">
          {status.db.usingCustom && (
            <div className="flex flex-wrap items-center gap-3 border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="font-mono text-[11px]">{status.db.url}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetDatabase}
                className="ml-auto rounded-none text-[10px] uppercase"
              >
                <RotateCcw className="size-3" /> Reset
              </Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Database URL" hint="libsql://your-db.turso.io">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className={inputClass}
                placeholder="libsql://…"
                autoComplete="off"
              />
            </AdminField>
            <AdminField label="Auth token">
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className={inputClass}
                placeholder="eyJhbGciOi…"
                autoComplete="off"
              />
            </AdminField>
          </div>

          <label className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={keepSeed}
              onChange={(event) => setKeepSeed(event.target.checked)}
              className="mt-1"
            />
            Keep the sample catalog and pages in the new database. Uncheck to start empty.
          </label>

          {dbMessage && <AdminNote tone={dbTone}>{dbMessage}</AdminNote>}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={dbPending}
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              Test connection
            </Button>
            <Button
              type="button"
              onClick={connect}
              disabled={dbPending}
              className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
            >
              <Database className="size-3.5" /> Save & connect
            </Button>
          </div>
        </div>
      </AdminCard>

      <AdminCard
        title="Owner credentials"
        description="Change the email or password used to sign in to this admin."
      >
        <form onSubmit={saveCredentials} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Current password">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </AdminField>
            <AdminField label="New email" hint="Leave blank to keep it.">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </AdminField>
            <AdminField label="New password" hint="At least 10 characters.">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </AdminField>
          </div>
          {credMessage && <AdminNote tone={credTone}>{credMessage}</AdminNote>}
          <Button
            type="submit"
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            <KeyRound className="size-3.5" /> Update credentials
          </Button>
        </form>
      </AdminCard>

      <AdminCard
        title="License"
        description="Optional domain licensing. Disabled by default; the store works without it."
        action={
          <AdminBadge tone={status.license.licensed ? "green" : "amber"}>
            {status.license.licensed ? "active" : "not activated"}
          </AdminBadge>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            {status.license.enabled
              ? "This deployment requires activation for admin writes. Paste the key you received."
              : "Licensing is off for this deployment. Set LICENSE_SERVER_URL and LICENSE_PUBLIC_KEY to enable it."}
          </p>
          {status.license.enabled && !status.license.licensed && (
            <div className="flex flex-wrap items-end gap-2">
              <input
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                className={`${inputClass} max-w-sm`}
                placeholder="PetPals-XXXX-XXXX"
              />
              <Button
                type="button"
                onClick={activate}
                className="rounded-none bg-foreground text-[10px] uppercase text-background hover:bg-hot-pink hover:text-foreground"
              >
                Activate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={deactivate}
                className="rounded-none text-[10px] uppercase"
              >
                Remove
              </Button>
            </div>
          )}
          {status.license.enabled && status.license.licensed && (
            <Button
              type="button"
              variant="outline"
              onClick={deactivate}
              className="rounded-none text-[10px] uppercase"
            >
              Deactivate
            </Button>
          )}
          {licenseMessage && (
            <AdminNote
              tone={
                licenseMessage === "License activated." || licenseMessage === "License removed."
                  ? "success"
                  : "error"
              }
            >
              {licenseMessage}
            </AdminNote>
          )}
        </div>
      </AdminCard>

      <AdminCard
        title="Customer login"
        description="Google is shopper-only; the admin always signs in with email and password."
        action={
          <AdminBadge tone={status.auth.google ? "green" : "amber"}>
            {status.auth.google ? "configured" : "not configured"}
          </AdminBadge>
        }
      >
        <p className="text-[11px] leading-5 text-muted-foreground">
          {status.auth.google
            ? "Direct Google OAuth is configured. The button is live on /account; guest checkout still works without an account."
            : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then add <your-domain>/api/auth/google/callback as an authorised redirect URI in Google Cloud Console. Until then, shoppers can use email/password or continue as guest."}
        </p>
      </AdminCard>

      <AdminCard
        title="Launch checklist"
        description="Progress is stored in this browser."
        action={
          <span className="text-xs font-semibold text-hot-pink">
            {completed} / {CHECKLIST.length}
          </span>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECKLIST.map((item) => {
            const isDone = done.includes(item.key);
            return (
              <div
                key={item.key}
                className={`flex items-start gap-3 border p-3 ${isDone ? "border-hot-pink/40 bg-hot-pink/5" : "border-border"}`}
              >
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={`Mark ${item.label} ${isDone ? "not done" : "done"}`}
                  onClick={() => toggle(item.key)}
                  className="mt-0.5 text-hot-pink"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0">
                  <a href={item.href} className="text-xs font-semibold hover:text-hot-pink">
                    {item.label}
                  </a>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {isDone ? "Done" : "Not done yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "green" | "amber";
}) {
  return (
    <div className="border border-border bg-background p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
        {tone !== "muted" && (
          <span
            className={`size-2 rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-amber-500"}`}
          />
        )}
        {value}
      </p>
    </div>
  );
}

export const SetupIcon = ListChecks;
