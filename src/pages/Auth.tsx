import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Sign in — PetPals";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else {
        await signUp(email, password);
        toast.success("Account created");
      }
      const next = new URLSearchParams(window.location.search).get("next");
      navigate(next && next.startsWith("/") ? next : "/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-accent">
          ← Back to store
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-4 outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-4 outline-none focus:border-accent"
          />
          <button
            disabled={loading}
            className="h-11 w-full rounded-lg bg-accent font-semibold text-white disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-accent"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
