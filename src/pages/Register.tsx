import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "@/hooks/useUserAuth";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function Register() {
  const { register, user } = useUserAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Create account — PetPals";
  }, []);

  useEffect(() => {
    if (user) navigate("/account");
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name.trim());
      toast.success("Account created!");
      navigate("/account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-accent">
            ← Back to store
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join us and track your orders.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              required
              minLength={2}
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-4 outline-none focus:border-accent"
            />
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
              {loading ? "..." : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
