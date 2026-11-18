import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completePasswordResetFn, requestPasswordResetFn } from "@/lib/api";

export function AccountRecovery({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function requestCode() {
    setPending(true);
    setError("");
    setNotice("");
    await requestPasswordResetFn({ data: { email } });
    setPending(false);
    setNotice(
      "Request received. Ask the shop for your code on WhatsApp or by phone, then enter it below.",
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const result = await completePasswordResetFn({ data: { email, code, password } });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    setCode("");
    setPassword("");
  }

  if (done) {
    return (
      <div className="mt-6 border-t border-border pt-5">
        <p className="border border-hot-pink/40 bg-hot-pink/5 px-3 py-2 text-[11px] text-foreground">
          Password updated. Sign in above with your new password.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="mt-3 h-10 w-full rounded-none text-[10px] font-bold uppercase tracking-[0.1em]"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-hot-pink">
          Recover your account
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
        No email needed. Request a code and the shop sends it to your phone or WhatsApp. Codes
        expire after 30 minutes.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 rounded-none"
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
            Code from the shop
          </span>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="mt-1.5 rounded-none font-mono tracking-[0.2em]"
            autoComplete="one-time-code"
            placeholder="XXXXXXXX"
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">New password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 rounded-none"
            autoComplete="new-password"
            required
          />
        </label>
        {notice && (
          <p className="border border-hot-pink/40 bg-hot-pink/5 px-3 py-2 text-[11px] text-foreground">
            {notice}
          </p>
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
          type="button"
          variant="outline"
          onClick={requestCode}
          disabled={pending || !email.trim()}
          className="h-10 w-full rounded-none text-[10px] font-bold uppercase tracking-[0.1em]"
        >
          Request a code for this email
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-none bg-foreground text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
        >
          {pending ? "Working…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
