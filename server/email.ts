type OrderEmailItem = {
  name: string;
  qty: number;
  price: number;
  image_url?: string;
};

export type OrderEmailInput = {
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
};

export type EmailResult = { ok: true; id?: string } | { ok: false; error: string };

function envValue(key: string): string {
  const raw = process.env[key]?.trim() ?? "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function emailConfigured(): boolean {
  return (
    envValue("EMAIL_ENABLED") !== "0" &&
    Boolean(envValue("EMAIL_API_KEY")) &&
    Boolean(envValue("EMAIL_FROM"))
  );
}

function brandName(): string {
  return envValue("EMAIL_BRAND") || "Store";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) return { ok: false, error: "Email is not configured." };
  if ((envValue("EMAIL_PROVIDER") || "resend").toLowerCase() !== "resend") {
    return { ok: false, error: "Only Resend is supported." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${envValue("EMAIL_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: envValue("EMAIL_FROM"),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(envValue("EMAIL_REPLY_TO") ? { reply_to: envValue("EMAIL_REPLY_TO") } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      return { ok: false, error: payload.message || payload.error || `Resend ${response.status}` };
    }
    return { ok: true, ...(typeof payload.id === "string" ? { id: payload.id } : {}) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email failed." };
  }
}

function rows(items: OrderEmailItem[], currency: string): string {
  return items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}<br /><span style="color:#666;font-size:12px;">Qty ${item.qty}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${money(item.price * item.qty, currency)}</td>
      </tr>`,
    )
    .join("");
}

function shell(title: string, body: string, brand: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;">
    <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
      <div style="background:#fff;border:1px solid #e5e1da;padding:28px;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a6d5b;">${escapeHtml(brand)}</p>
        <h1 style="margin:0 0 18px;font-size:28px;line-height:1.1;">${escapeHtml(title)}</h1>
        ${body}
      </div>
    </div>
  </body></html>`;
}

export async function sendOrderEmail(input: OrderEmailInput): Promise<{
  customer: EmailResult | null;
  owner: EmailResult | null;
}> {
  if (process.env["NODE_ENV"] === "test" || !emailConfigured()) {
    return { customer: null, owner: null };
  }

  const brand = brandName();
  const currency = input.currency || "MAD";
  const orderLabel = input.orderId.slice(0, 8).toUpperCase();
  const itemRows = rows(input.items, currency);
  const customerHtml = shell(
    "Order received.",
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Thank you, ${escapeHtml(input.customer.name)}. We have your order and will contact you to confirm.</p>
     <p style="margin:0 0 18px;font-size:13px;color:#666;">Order <strong>${escapeHtml(orderLabel)}</strong></p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemRows}</table>
     <p style="margin:16px 0 0;font-size:14px;line-height:1.8;">Shipping: ${input.shipping === 0 ? "Free" : money(input.shipping, currency)}<br /><strong>Total: ${money(input.total, currency)}</strong></p>
     <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#777;">Deliver to: ${escapeHtml(input.customer.address)} · ${escapeHtml(input.customer.phone)}</p>`,
    brand,
  );
  const customerText = [
    `Thank you, ${input.customer.name}.`,
    `Order ${orderLabel}`,
    ...input.items.map(
      (item) => `- ${item.name} x${item.qty} - ${money(item.price * item.qty, currency)}`,
    ),
    `Shipping: ${input.shipping === 0 ? "Free" : money(input.shipping, currency)}`,
    `Total: ${money(input.total, currency)}`,
    `Deliver to: ${input.customer.address}`,
  ].join("\n");

  const ownerHtml = shell(
    "New order.",
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">A new order has been placed.</p>
     <p style="margin:0 0 18px;font-size:13px;color:#666;">Order <strong>${escapeHtml(orderLabel)}</strong></p>
     <p style="margin:0 0 16px;font-size:13px;line-height:1.7;">${escapeHtml(input.customer.name)}<br />${escapeHtml(input.customer.email)}<br />${escapeHtml(input.customer.phone)}<br />${escapeHtml(input.customer.address)}</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemRows}</table>
     <p style="margin:16px 0 0;font-size:14px;line-height:1.8;">Shipping: ${input.shipping === 0 ? "Free" : money(input.shipping, currency)}<br /><strong>Total: ${money(input.total, currency)}</strong></p>`,
    brand,
  );
  const ownerText = [
    `New order ${orderLabel}`,
    `${input.customer.name} <${input.customer.email}>`,
    `${input.customer.phone} - ${input.customer.address}`,
    ...input.items.map(
      (item) => `- ${item.name} x${item.qty} - ${money(item.price * item.qty, currency)}`,
    ),
    `Total: ${money(input.total, currency)}`,
  ].join("\n");

  const ownerEmail = envValue("EMAIL_OWNER");
  const [customer, owner] = await Promise.all([
    sendEmail({
      to: input.customer.email,
      subject: `Order ${orderLabel} received — ${brand}`,
      html: customerHtml,
      text: customerText,
    }),
    ownerEmail
      ? sendEmail({
          to: ownerEmail,
          subject: `New order ${orderLabel} — ${money(input.total, currency)} — ${brand}`,
          html: ownerHtml,
          text: ownerText,
        })
      : Promise.resolve(null),
  ]);

  if (customer && !customer.ok)
    console.warn("[email] customer confirmation failed:", customer.error);
  if (owner && !owner.ok) console.warn("[email] owner alert failed:", owner.error);
  return { customer, owner };
}
