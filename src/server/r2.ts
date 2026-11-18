import { AwsClient } from "aws4fetch";

import { MIME_EXTENSION, parseDataUrl } from "./image-data";

export type R2Upload = {
  id: string;
  mime: string;
  url: string;
  createdAt: string;
};

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicDomain: string;
  prefix: string;
};

function config(): R2Config | null {
  const accountId = process.env["R2_ACCOUNT_ID"] ?? "";
  const bucket = process.env["R2_BUCKET_NAME"] ?? "";
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"] ?? "";
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"] ?? "";
  const publicDomain = (process.env["R2_PUBLIC_DOMAIN"] ?? "").replace(/\/$/, "");
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicDomain) return null;
  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicDomain,
    prefix: (process.env["R2_PREFIX"] ?? "media").replace(/^\/+|\/+$/g, ""),
  };
}

/** R2 is used only when every value is present; otherwise uploads stay in the database. */
export function r2Configured(): boolean {
  return config() !== null;
}

function awsClient(settings: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectKey(prefix: string, mime: string): string {
  const extension = MIME_EXTENSION[mime] ?? "bin";
  const year = new Date().getUTCFullYear();
  const id = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}/${year}/${id}.${extension}`;
}

/** Uploads a base64 data URL to R2 and returns its public URL. */
export async function uploadImageToR2(dataUrl: string): Promise<R2Upload> {
  const settings = config();
  if (!settings) throw new Error("Cloudflare R2 is not configured.");
  const { mime, bytes } = parseDataUrl(dataUrl);
  const payload = new Uint8Array(bytes.byteLength);
  payload.set(bytes);
  const key = objectKey(settings.prefix, mime);

  const client = new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const response = await client.fetch(
    `https://${settings.accountId}.r2.cloudflarestorage.com/${settings.bucket}/${key}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: payload.buffer,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  return {
    id: key,
    mime,
    url: `${settings.publicDomain}/${key}`,
    createdAt: new Date().toISOString(),
  };
}

/** Safe-to-expose status for the admin settings screen. */
export function r2Status(): { configured: boolean; publicDomain: string } {
  const settings = config();
  return {
    configured: settings !== null,
    publicDomain: settings?.publicDomain ?? "",
  };
}

export type R2ObjectEntry = {
  key: string;
  url: string;
  size: number;
  updatedAt: string;
};

/** Lists the images under this project's prefix, newest first. */
export async function listR2Images(limit = 200): Promise<R2ObjectEntry[]> {
  const settings = config();
  if (!settings) return [];
  const client = awsClient(settings);
  const query = `?list-type=2&prefix=${encodeURIComponent(`${settings.prefix}/`)}&max-keys=${Math.min(1000, Math.max(1, limit))}`;
  const response = await client.fetch(
    `https://${settings.accountId}.r2.cloudflarestorage.com/${settings.bucket}${query}`,
    { method: "GET" },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`R2 list failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  const xml = await response.text();
  const entries: R2ObjectEntry[] = [];
  for (const block of xml.split("<Contents>").slice(1)) {
    const key = /<Key>([^<]*)<\/Key>/.exec(block)?.[1];
    if (!key) continue;
    const size = Number(/<Size>(\d+)<\/Size>/.exec(block)?.[1] ?? 0);
    const updatedAt = /<LastModified>([^<]*)<\/LastModified>/.exec(block)?.[1] ?? "";
    entries.push({ key, url: `${settings.publicDomain}/${key}`, size, updatedAt });
  }
  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Removes one object. A missing object counts as deleted. */
export async function deleteR2Object(key: string): Promise<void> {
  const settings = config();
  if (!settings) throw new Error("Cloudflare R2 is not configured.");
  const client = awsClient(settings);
  const response = await client.fetch(
    `https://${settings.accountId}.r2.cloudflarestorage.com/${settings.bucket}/${key}`,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "");
    throw new Error(`R2 delete failed (${response.status}). ${detail.slice(0, 200)}`);
  }
}
