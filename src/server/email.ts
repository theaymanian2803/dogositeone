import { formatMoney } from "@/lib/commerce";
import type { CheckoutCustomer, CheckoutTotals, ResolvedLine } from "@/lib/checkout";
import type { StoreSettings } from "@/lib/store-settings";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8_000;

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string };

export type EmailStatus = {
  configured: boolean;
  provider: string;
  from: string;
  ownerConfigured: boolean;
  testRecipientConfigured: boolean;
};

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

export function emailStatus(): EmailStatus {
  return {
    configured: emailConfigured(),
    provider: envValue("EMAIL_PROVIDER") || "resend",
    from: envValue("EMAIL_FROM"),
    ownerConfigured: Boolean(envValue("EMAIL_OWNER")),
    testRecipientConfigured: Boolean(envValue("EMAIL_TEST_TO")),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function fromAddress(settings?: StoreSettings): string {
  const configured = envValue("EMAIL_FROM");
  if (configured) return configured;
  const brand = settings?.store_branding.name ?? "Store";
  return `${brand} <orders@unccode.site>`;
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  settings?: StoreSettings;
  replyTo?: string;
  from?: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { ok: false, error: "Email is not configured." };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((value) => value.trim())
    .filter(Boolean);
  if (recipients.length === 0) return { ok: false, error: "No recipient." };

  const provider = (envValue("EMAIL_PROVIDER") || "resend").toLowerCase();
  if (provider !== "resend") {
    return { ok: false, error: `Unsupported email provider: ${provider}` };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${envValue("EMAIL_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? fromAddress(input.settings),
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: payload.message || payload.error || `Resend returned ${response.status}.`,
      };
    }

    return { ok: true, id: typeof payload.id === "string" ? payload.id : null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach the email provider.",
    };
  }
}

function money(value: number, currency: string): string {
  return formatMoney(value, currency);
}

function orderRows(lines: ResolvedLine[], currency: string): string {
  return lines
    .map(
      (line) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(line.name)}</strong><br />
            <span style="color:#666;font-size:12px;">Size ${escapeHtml(line.size)} · Qty ${line.quantity}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
            ${money(line.lineTotal, currency)}
          </td>
        </tr>`,
    )
    .join("");
}

function orderTextRows(lines: ResolvedLine[], currency: string): string {
  return lines
    .map(
      (line) =>
        `- ${line.name} · Size ${line.size} · Qty ${line.quantity} · ${money(line.lineTotal, currency)}`,
    )
    .join("\n");
}

function totalsRows(totals: CheckoutTotals, currency: string): string {
  const row = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;color:${bold ? "#111" : "#666"};${bold ? "font-weight:700;" : ""}">${label}</td>
      <td style="padding:4px 0;text-align:right;color:${bold ? "#111" : "#666"};${bold ? "font-weight:700;" : ""}">${value}</td>
    </tr>`;
  return [
    row("Subtotal", money(totals.subtotal, currency)),
    totals.discount > 0 ? row("Discount", `−${money(totals.discount, currency)}`) : "",
    row("Shipping", totals.shipping === 0 ? "Free" : money(totals.shipping, currency)),
    row("Total", money(totals.total, currency), true),
  ].join("");
}

function shell(input: {
  brand: string;
  preheader: string;
  title: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
      <div style="background:#ffffff;border:1px solid #e5e1da;padding:28px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a6d5b;">${escapeHtml(input.brand)}</p>
        <h1 style="margin:0 0 18px;font-size:28px;line-height:1.1;">${escapeHtml(input.title)}</h1>
        ${input.body}
      </div>
      <p style="margin:18px 4px 0;font-size:11px;line-height:1.6;color:#777;">${input.footer}</p>
    </div>
  </body>
</html>`;
}

export function orderConfirmationEmail(input: {
  orderNumber: string;
  customer: CheckoutCustomer;
  lines: ResolvedLine[];
  totals: CheckoutTotals;
  currency: string;
  settings: StoreSettings;
}): { subject: string; html: string; text: string } {
  const { settings, customer, lines, totals, currency, orderNumber } = input;
  const brand = settings.store_branding.name;
  const contact = settings.store_contact;
  const subject = `Order ${orderNumber} confirmed — ${brand}`;
  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Thank you, ${escapeHtml(customer.name)}. We have your order and will prepare it shortly.</p>
    <p style="margin:0 0 18px;font-size:13px;color:#666;">Order <strong>${escapeHtml(orderNumber)}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${orderRows(lines, currency)}</table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">${totalsRows(totals, currency)}</table>
    <div style="margin-top:22px;padding-top:16px;border-top:1px solid #eee;font-size:13px;line-height:1.6;color:#555;">
      <strong style="color:#111;">Delivery</strong><br />
      ${textToHtml(customer.address)}<br />
      ${textToHtml(customer.city)}, ${escapeHtml(customer.postalCode)}<br />
      ${escapeHtml(customer.country)}<br />
      ${escapeHtml(customer.phone)}
    </div>
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#777;">Questions? Reply to this email or write to ${escapeHtml(contact.email)}.</p>`;
  const text = [
    `Thank you, ${customer.name}.`,
    "",
    `Order ${orderNumber}`,
    "",
    orderTextRows(lines, currency),
    "",
    `Subtotal: ${money(totals.subtotal, currency)}`,
    totals.discount > 0 ? `Discount: -${money(totals.discount, currency)}` : "",
    `Shipping: ${totals.shipping === 0 ? "Free" : money(totals.shipping, currency)}`,
    `Total: ${money(totals.total, currency)}`,
    "",
    "Delivery:",
    customer.address,
    `${customer.city}, ${customer.postalCode}`,
    customer.country,
    customer.phone,
    "",
    `Questions? ${contact.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: shell({
      brand,
      preheader: `Order ${orderNumber} is confirmed.`,
      title: "Order confirmed.",
      body,
      footer: `${brand} · ${contact.address} · ${contact.email}`,
    }),
    text,
  };
}

export function ownerOrderEmail(input: {
  orderNumber: string;
  customer: CheckoutCustomer;
  lines: ResolvedLine[];
  totals: CheckoutTotals;
  currency: string;
  settings: StoreSettings;
}): { subject: string; html: string; text: string } {
  const { settings, customer, lines, totals, currency, orderNumber } = input;
  const brand = settings.store_branding.name;
  const subject = `New order ${orderNumber} — ${money(totals.total, currency)} — ${brand}`;
  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">A new order has been placed.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <tr><td style="padding:4px 0;color:#666;">Order</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(orderNumber)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Customer</td><td style="padding:4px 0;text-align:right;">${escapeHtml(customer.name)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Email</td><td style="padding:4px 0;text-align:right;">${escapeHtml(customer.email)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;text-align:right;">${escapeHtml(customer.phone)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${orderRows(lines, currency)}</table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">${totalsRows(totals, currency)}</table>
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eee;font-size:13px;line-height:1.6;color:#555;">
      <strong style="color:#111;">Deliver to</strong><br />
      ${textToHtml(customer.address)}<br />
      ${textToHtml(customer.city)}, ${escapeHtml(customer.postalCode)}<br />
      ${escapeHtml(customer.country)}
      ${customer.notes ? `<br /><br /><strong style="color:#111;">Notes</strong><br />${textToHtml(customer.notes)}` : ""}
    </div>`;
  const text = [
    `New order ${orderNumber}`,
    `Customer: ${customer.name} <${customer.email}>`,
    `Phone: ${customer.phone}`,
    "",
    orderTextRows(lines, currency),
    "",
    `Total: ${money(totals.total, currency)}`,
    "",
    "Deliver to:",
    customer.address,
    `${customer.city}, ${customer.postalCode}`,
    customer.country,
    customer.notes ? `\nNotes: ${customer.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: shell({
      brand,
      preheader: `New order ${orderNumber} for ${money(totals.total, currency)}.`,
      title: "New order.",
      body,
      footer: `${brand} · owner notification`,
    }),
    text,
  };
}

export async function sendOrderEmails(input: {
  orderNumber: string;
  customer: CheckoutCustomer;
  lines: ResolvedLine[];
  totals: CheckoutTotals;
  currency: string;
  settings: StoreSettings;
}): Promise<{ customer: EmailResult | null; owner: EmailResult | null }> {
  if (process.env["NODE_ENV"] === "test" || !emailConfigured()) {
    return { customer: null, owner: null };
  }

  const replyTo = envValue("EMAIL_REPLY_TO") || input.settings.store_contact.email;
  const ownerEmail = envValue("EMAIL_OWNER") || input.settings.store_contact.email;
  const customerMessage = orderConfirmationEmail(input);
  const ownerMessage = ownerOrderEmail(input);

  const [customer, owner] = await Promise.all([
    sendEmail({
      to: input.customer.email,
      subject: customerMessage.subject,
      html: customerMessage.html,
      text: customerMessage.text,
      settings: input.settings,
      replyTo,
    }),
    ownerEmail
      ? sendEmail({
          to: ownerEmail,
          subject: ownerMessage.subject,
          html: ownerMessage.html,
          text: ownerMessage.text,
          settings: input.settings,
          replyTo,
        })
      : Promise.resolve(null),
  ]);

  if (customer && !customer.ok) {
    console.warn("[email] customer confirmation failed:", customer.error);
  }
  if (owner && !owner.ok) {
    console.warn("[email] owner alert failed:", owner.error);
  }

  return { customer, owner };
}

export function passwordResetEmail(input: {
  name: string;
  code: string;
  brand: string;
  expiresMinutes?: number;
}): { subject: string; html: string; text: string } {
  const minutes = input.expiresMinutes ?? 30;
  const subject = `${input.brand} password reset code`;
  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(input.name || "there")}, use this code to reset your password.</p>
    <p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:.22em;">${escapeHtml(input.code)}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#666;">The code expires in ${minutes} minutes. If you did not ask for it, you can ignore this email.</p>`;
  return {
    subject,
    html: shell({
      brand: input.brand,
      preheader: `Your ${input.brand} password reset code.`,
      title: "Reset your password.",
      body,
      footer: `${input.brand} · account security`,
    }),
    text: `Hi ${input.name || "there"},\n\nYour ${input.brand} password reset code is:\n\n${input.code}\n\nIt expires in ${minutes} minutes. If you did not ask for it, ignore this email.`,
  };
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  code: string;
  settings: StoreSettings;
}): Promise<EmailResult> {
  if (!emailConfigured()) return { ok: false, error: "Email is not configured." };
  const message = passwordResetEmail({
    name: input.name,
    code: input.code,
    brand: input.settings.store_branding.name,
  });
  return sendEmail({
    to: input.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    settings: input.settings,
    replyTo: envValue("EMAIL_REPLY_TO") || input.settings.store_contact.email,
  });
}

export async function sendTestEmail(input: {
  to?: string;
  settings: StoreSettings;
}): Promise<EmailResult & { to?: string }> {
  const to =
    input.to?.trim() ||
    envValue("EMAIL_TEST_TO") ||
    envValue("EMAIL_OWNER") ||
    input.settings.store_contact.email;
  if (!to) return { ok: false, error: "No test recipient configured." };
  const brand = input.settings.store_branding.name;
  const result = await sendEmail({
    to,
    subject: `Test email — ${brand}`,
    html: shell({
      brand,
      preheader: "Resend is connected.",
      title: "Email is working.",
      body: `<p style="margin:0;font-size:15px;line-height:1.6;">This is a test message from ${escapeHtml(brand)}. Order confirmations and password reset codes will use the same sender.</p>`,
      footer: `${brand} · test send`,
    }),
    text: `Email is working. This is a test message from ${brand}.`,
    settings: input.settings,
    replyTo: envValue("EMAIL_REPLY_TO") || input.settings.store_contact.email,
  });
  return { ...result, to };
}
