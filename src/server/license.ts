import { importJWK, jwtVerify } from "jose";
import { getRequest } from "@tanstack/react-start/server";

import { AuthError } from "./auth";
import { getBaseDb } from "./db";

export type LicenseStatus = {
  enabled: boolean;
  licensed: boolean;
  product: string;
  domain?: string;
  mode?: string;
  reason?: string;
};

export type GrantPayload = {
  key: string;
  product: string;
  domain: string;
  mode: "forever" | "managed";
  iat: number;
  exp?: number;
};

function licenseConfig() {
  return {
    serverUrl: (process.env["LICENSE_SERVER_URL"] ?? "").replace(/\/$/, ""),
    publicKey: process.env["LICENSE_PUBLIC_KEY"] ?? "",
    product: process.env["LICENSE_PRODUCT"] ?? "track-suit-society",
    disabled: process.env["LICENSE_DISABLED"] === "1",
  };
}

export function licenseEnabled(): boolean {
  const config = licenseConfig();
  return !config.disabled && Boolean(config.serverUrl && config.publicKey);
}

export function currentHost(): string {
  try {
    return normalizeHost(new URL(getRequest().url).host);
  } catch {
    return "";
  }
}

export function normalizeHost(input: string): string {
  let value = String(input ?? "")
    .trim()
    .toLowerCase();
  try {
    if (value.includes("://")) value = new URL(value).host;
  } catch {
    // treat as a bare host
  }
  return value.split("/")[0]!.replace(/:\d+$/, "").replace(/\.$/, "");
}

export async function verifyGrant(
  token: string,
  host: string,
  publicJwk: string,
): Promise<{
  ok: boolean;
  reason?: "domain" | "expired" | "bad_signature";
  payload?: GrantPayload;
}> {
  try {
    const key = await importJWK(JSON.parse(publicJwk), "EdDSA");
    const { payload } = await jwtVerify(token, key, { algorithms: ["EdDSA"] });
    const grant = payload as unknown as GrantPayload;
    if (normalizeHost(grant.domain) !== normalizeHost(host)) return { ok: false, reason: "domain" };
    if (grant.exp && grant.exp * 1000 < Date.now()) return { ok: false, reason: "expired" };
    return { ok: true, payload: grant };
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_JWT_EXPIRED") {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "bad_signature" };
  }
}

export async function readGrant(): Promise<string | null> {
  try {
    const result = await getBaseDb().execute({
      sql: "SELECT value FROM settings WHERE key = 'license_grant'",
      args: [],
    });
    const value = result.rows[0]?.["value"];
    return value ? String(value) : null;
  } catch {
    return null;
  }
}

export async function writeGrant(token: string): Promise<void> {
  await getBaseDb().execute({
    sql: "INSERT INTO settings (key, value) VALUES ('license_grant', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [token],
  });
}

export async function clearGrant(): Promise<void> {
  await getBaseDb().execute("DELETE FROM settings WHERE key = 'license_grant'");
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const config = licenseConfig();
  const host = currentHost();

  if (!licenseEnabled()) {
    return {
      enabled: false,
      licensed: true,
      product: config.product,
      domain: host,
      mode: "disabled",
    };
  }

  const token = await readGrant();
  if (!token) {
    return {
      enabled: true,
      licensed: false,
      product: config.product,
      domain: host,
      reason: "missing",
    };
  }
  const verified = await verifyGrant(token, host, config.publicKey);
  return {
    enabled: true,
    licensed: verified.ok,
    product: config.product,
    domain: host,
    ...(verified.payload?.mode ? { mode: verified.payload.mode } : {}),
    ...(verified.ok ? {} : { reason: verified.reason }),
  };
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const config = licenseConfig();
  if (!licenseEnabled()) throw new AuthError("Licensing is not configured for this store.", 400);

  const host = currentHost();
  const response = await fetch(`${config.serverUrl}/v1/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: key.trim(), product: config.product, domain: host }),
  });

  const data = (await response.json().catch(() => null)) as {
    grant?: string;
    mode?: string;
    error?: string;
  } | null;

  if (!response.ok || !data?.grant) {
    throw new AuthError(data?.error ?? "That key could not be activated.", 400);
  }

  const verified = await verifyGrant(data.grant, host, config.publicKey);
  if (!verified.ok) {
    throw new AuthError(`License verification failed (${verified.reason ?? "invalid"}).`, 400);
  }

  await writeGrant(data.grant);
  return getLicenseStatus();
}

/** Gate for admin writes when licensing is enabled. No-op by default. */
export async function requireLicense(): Promise<void> {
  if (!licenseEnabled()) return;
  const status = await getLicenseStatus();
  if (!status.licensed) {
    throw new AuthError("Activate a license before making changes.", 402);
  }
}
