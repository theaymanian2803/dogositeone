import { createSession } from "@/server/auth";
import { ensureDatabase, getDb } from "@/server/db";
import { upsertOAuthUser } from "@/server/oauth";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
const STATE_COOKIE = "pace_oauth_state";
const SESSION_COOKIE = "pace_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function googleConfigured(): boolean {
  return Boolean(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
}

export function googleRedirectUri(request: Request): string {
  const configured = process.env["GOOGLE_REDIRECT_URI"]?.trim();
  if (configured) return configured;
  return `${new URL(request.url).origin}/api/auth/google/callback`;
}

export function newOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildGoogleAuthUrl(request: Request, state: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", process.env["GOOGLE_CLIENT_ID"] ?? "");
  url.searchParams.set("redirect_uri", googleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (import.meta.env.PROD) parts.push("Secure");
  return parts.join("; ");
}

function redirect(request: Request, path: string, cookies: string[] = []): Response {
  const headers = new Headers({ location: new URL(path, request.url).toString() });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export function handleGoogleStart(request: Request): Response {
  if (!googleConfigured()) return redirect(request, "/account");

  const state = newOAuthState();
  return redirect(request, buildGoogleAuthUrl(request, state), [
    serializeCookie(STATE_COOKIE, state, 600),
  ]);
}

type GoogleToken = { access_token?: string; error?: string };
type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

export async function handleGoogleCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return redirect(request, "/account?google=denied");
  if (!googleConfigured()) return redirect(request, "/account?google=unconfigured");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  if (!code || !state || !cookies[STATE_COOKIE] || state !== cookies[STATE_COOKIE]) {
    return redirect(request, "/account?google=state");
  }

  let token: GoogleToken;
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
        client_secret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
        redirect_uri: googleRedirectUri(request),
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) return redirect(request, "/account?google=token");
    token = (await response.json()) as GoogleToken;
  } catch {
    return redirect(request, "/account?google=token");
  }
  if (!token.access_token) return redirect(request, "/account?google=token");

  let profile: GoogleProfile;
  try {
    const response = await fetch(USERINFO_ENDPOINT, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok) return redirect(request, "/account?google=profile");
    profile = (await response.json()) as GoogleProfile;
  } catch {
    return redirect(request, "/account?google=profile");
  }

  if (!profile.email || profile.email_verified === false) {
    return redirect(request, "/account?google=email");
  }

  const client = await getDb();
  await ensureDatabase(client);

  const { userId, role } = await upsertOAuthUser(client, {
    email: profile.email,
    name: profile.name ?? null,
    avatar: profile.picture ?? null,
    provider: "google",
  });

  if (role === "admin" || role === "moderator") {
    // Staff never sign in through Google; the admin stays email + password.
    return redirect(request, "/account?google=staff");
  }

  const session = await createSession(client, userId);
  return redirect(request, "/account", [
    serializeCookie(SESSION_COOKIE, session.token, SESSION_MAX_AGE),
    serializeCookie(STATE_COOKIE, "", 0),
  ]);
}
