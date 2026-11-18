import { useState } from "react";
import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLoginFn, adminSessionFn, ownerSetupFn } from "@/lib/admin-api";

export const Route = createFileRoute("/admin_/login")({
  loader: async () => {
    const session = await adminSessionFn();
    if (session.user && (session.user.role === "admin" || session.user.role === "moderator")) {
      throw redirect({ to: "/admin" });
    }
    return session;
  },
  head: () => ({ meta: [{ title: "Admin sign in â€” PetPals" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const { hasAdmin } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const result = hasAdmin
        ? await adminLoginFn({ data: { email, password } })
        : await ownerSetupFn({
            data: { email, password, name, ...(setupKey ? { setupKey } : {}) },
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      await router.invalidate();
      await navigate({ to: "/admin" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-[28px] font-extrabold">
          PetPals<span className="text-hot-pink">.</span>
        </Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
          {hasAdmin ? "Admin / Sign in" : "Admin / First run"}
        </p>
        <h1 className="font-display mt-2 text-[42px] font-extrabold leading-[0.9]">
          {hasAdmin ? (
            <>
              WELCOME
              <br />
              BACK.
            </>
          ) : (
            <>
              CLAIM
              <br />
              THE STORE.
            </>
          )}
        </h1>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {hasAdmin
            ? "Sign in with your store owner account to manage the catalog, orders and pages."
            : "No admin exists yet. Create the owner account with your own email and a strong password. This form disappears once an admin exists."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          {!hasAdmin && (
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Your name</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 rounded-none"
                placeholder="Store owner"
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 rounded-none"
              placeholder="owner@store.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 rounded-none"
              placeholder={hasAdmin ? "Your password" : "At least 8 characters"}
              autoComplete={hasAdmin ? "current-password" : "new-password"}
              required
            />
          </label>
          {!hasAdmin && (
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Setup key (optional)
              </span>
              <Input
                type="password"
                value={setupKey}
                onChange={(event) => setSetupKey(event.target.value)}
                className="mt-1.5 rounded-none"
                placeholder="Only if OWNER_SETUP_KEY is set"
                autoComplete="off"
              />
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-none bg-foreground text-xs font-bold uppercase tracking-[0.12em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            {pending ? "Workingâ€¦" : hasAdmin ? "Sign in" : "Create owner account"}
            {hasAdmin ? <KeyRound className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-hot-pink" />
          Sessions are httpOnly cookies. Passwords are hashed with PBKDF2 before storage.
        </p>
      </div>
    </main>
  );
}
