// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import {
  buildGoogleAuthUrl,
  googleConfigured,
  googleRedirectUri,
  newOAuthState,
  parseCookieHeader,
} from "@/lib/google-oauth.server";

const original = {
  id: process.env["GOOGLE_CLIENT_ID"],
  secret: process.env["GOOGLE_CLIENT_SECRET"],
  redirect: process.env["GOOGLE_REDIRECT_URI"],
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    GOOGLE_CLIENT_ID: original.id,
    GOOGLE_CLIENT_SECRET: original.secret,
    GOOGLE_REDIRECT_URI: original.redirect,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Google sign-in helpers", () => {
  it("reports configured only with both credentials", () => {
    delete process.env["GOOGLE_CLIENT_ID"];
    delete process.env["GOOGLE_CLIENT_SECRET"];
    expect(googleConfigured()).toBe(false);

    process.env["GOOGLE_CLIENT_ID"] = "client-id";
    expect(googleConfigured()).toBe(false);
    process.env["GOOGLE_CLIENT_SECRET"] = "client-secret";
    expect(googleConfigured()).toBe(true);
  });

  it("derives the callback URL from the request origin", () => {
    delete process.env["GOOGLE_REDIRECT_URI"];
    expect(googleRedirectUri(new Request("https://store.test/account"))).toBe(
      "https://store.test/api/auth/google/callback",
    );

    process.env["GOOGLE_REDIRECT_URI"] = "https://shop.example/auth/callback";
    expect(googleRedirectUri(new Request("https://store.test/account"))).toBe(
      "https://shop.example/auth/callback",
    );
  });

  it("builds a consent URL with state and scope", () => {
    process.env["GOOGLE_CLIENT_ID"] = "client-id";
    const url = new URL(buildGoogleAuthUrl(new Request("https://store.test/account"), "state-123"));

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://store.test/api/auth/google/callback",
    );
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("creates unique URL-safe state values", () => {
    const first = newOAuthState();
    const second = newOAuthState();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThan(20);
  });

  it("parses a cookie header", () => {
    expect(parseCookieHeader("pace_session=abc; pace_oauth_state=xyz")).toEqual({
      pace_session: "abc",
      pace_oauth_state: "xyz",
    });
    expect(parseCookieHeader(null)).toEqual({});
  });
});
