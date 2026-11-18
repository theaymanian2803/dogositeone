import type { CheckoutCustomer, CheckoutTotals, ResolvedLine } from "@/lib/checkout";

const API_VERSION = process.env["WHATSAPP_API_VERSION"] || "v20.0";

export function whatsappAlertConfigured(ownerNumber?: string): boolean {
  return Boolean(
    process.env["WHATSAPP_TOKEN"] &&
    process.env["WHATSAPP_PHONE_NUMBER_ID"] &&
    (ownerNumber || process.env["WHATSAPP_OWNER_NUMBER"]),
  );
}

function money(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

function buildMessage(order: {
  orderNumber: string;
  customer: CheckoutCustomer;
  lines: ResolvedLine[];
  totals: CheckoutTotals;
  currency: string;
}): string {
  const items = order.lines.map(
    (line) =>
      `• ${line.name} — ${line.size} × ${line.quantity} — ${money(line.lineTotal, order.currency)}`,
  );
  return [
    `New order ${order.orderNumber}`,
    ...items,
    `Total: ${money(order.totals.total, order.currency)}`,
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Address: ${order.customer.address}, ${order.customer.city}`,
    order.customer.notes ? `Notes: ${order.customer.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sends the new-order alert to the shop owner through the Meta WhatsApp Cloud API.
 * The order is already stored; a failure here never rolls it back.
 */
export async function sendOrderWhatsAppAlert(
  order: {
    orderNumber: string;
    customer: CheckoutCustomer;
    lines: ResolvedLine[];
    totals: CheckoutTotals;
    currency: string;
  },
  options: { ownerNumber?: string } = {},
): Promise<{ ok: boolean; reason?: string }> {
  const configuredOwner = String(
    options.ownerNumber || process.env["WHATSAPP_OWNER_NUMBER"] || "",
  ).replace(/[^\d]/g, "");

  if (
    !process.env["WHATSAPP_TOKEN"] ||
    !process.env["WHATSAPP_PHONE_NUMBER_ID"] ||
    !configuredOwner
  ) {
    return { ok: false, reason: "WHATSAPP_NOT_CONFIGURED" };
  }

  const token = process.env["WHATSAPP_TOKEN"] as string;
  const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"] as string;
  const owner = configuredOwner;

  try {
    const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: owner,
        type: "text",
        text: { body: buildMessage(order) },
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[whatsapp] alert failed", response.status, detail.slice(0, 200));
      return { ok: false, reason: `HTTP_${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[whatsapp] alert error", String(error).slice(0, 200));
    return { ok: false, reason: "REQUEST_FAILED" };
  }
}
