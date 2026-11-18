import type { Product } from "./storefront";
import type { CheckoutCustomer } from "./checkout";
import type { StoreWhatsApp } from "./store-settings";

export function whatsappDigits(value: string): string {
  return String(value ?? "").replace(/[^\d]/g, "");
}

export function whatsappHref(number: string, message: string): string {
  const digits = whatsappDigits(number);
  if (!digits) return "#";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function money(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

export function productWhatsAppMessage({
  shopName,
  product,
  option,
  currency,
}: {
  shopName: string;
  product: Product;
  option: string;
  currency: string;
}): string {
  const path =
    typeof window !== "undefined"
      ? `${window.location.origin}/products/${product.id}`
      : `/products/${product.id}`;
  return [
    `Hello ${shopName}! I'd like to order:`,
    `• ${product.name}`,
    `  Option: ${option}`,
    `  Price: ${money(product.price, currency)}`,
    `  Link: ${path}`,
  ].join("\n");
}

export function orderWhatsAppMessage({
  shopName,
  orderNumber,
  customer,
  items,
  total,
  currency,
}: {
  shopName: string;
  orderNumber: string;
  customer: CheckoutCustomer;
  items: Array<{ name: string; size: string; quantity: number; unitPrice: number }>;
  total: number;
  currency: string;
}): string {
  const lines = items.map(
    (item) =>
      `• ${item.name} — ${item.size} × ${item.quantity} — ${money(
        item.unitPrice * item.quantity,
        currency,
      )}`,
  );
  return [
    `Hello ${shopName}! New order ${orderNumber}.`,
    ...lines,
    `Total: ${money(total, currency)}`,
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}, ${customer.city}`,
    customer.notes ? `Notes: ${customer.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function chatHref(settings: StoreWhatsApp): string {
  if (!settings.enabled) return "#";
  return whatsappHref(settings.number, settings.orderMessage || "Hello!");
}
