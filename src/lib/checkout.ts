import type { Product } from "./storefront";

export const FREE_SHIPPING_THRESHOLD = 500;
export const FLAT_SHIPPING = 50;
export const SIZES = ["One Size"] as const;

export type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
};

export type CheckoutItem = {
  productId: string;
  size: string;
  quantity: number;
};

export type ResolvedLine = {
  productId: string;
  name: string;
  size: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CheckoutTotals = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

export type CheckoutError = {
  field: string;
  message: string;
};

export type DeliveryZone = {
  city: string;
  fee: number;
  freeThreshold?: number;
};

export type CheckoutOptions = {
  shipping?: {
    flatRate: number;
    freeThreshold: number;
    minOrder?: number;
    zones?: DeliveryZone[];
  };
  coupon?: { code: string; discount: number };
};

export type CheckoutResult =
  | {
      ok: true;
      customer: CheckoutCustomer;
      lines: ResolvedLine[];
      totals: CheckoutTotals;
      couponCode: string | null;
    }
  | {
      ok: false;
      errors: CheckoutError[];
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_NOTES_LENGTH = 1000;
const MAX_LINES = 20;
const MAX_QUANTITY = 10;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

type TextRead = { value: string; invalid: boolean };

function readText(value: unknown): TextRead {
  if (value === undefined || value === null) return { value: "", invalid: false };
  if (typeof value !== "string") return { value: "", invalid: true };
  return { value: value.trim(), invalid: false };
}

export function validateCheckout(
  input: { customer: CheckoutCustomer; items: CheckoutItem[] } | null | undefined,
  catalog: Product[],
  options: CheckoutOptions = {},
): CheckoutResult {
  const errors: CheckoutError[] = [];
  const rawCustomer = (input?.customer ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(input?.items) ? input.items : [];

  const name = readText(rawCustomer["name"]);
  const email = readText(rawCustomer["email"]);
  const phone = readText(rawCustomer["phone"]);
  const address = readText(rawCustomer["address"]);
  const city = readText(rawCustomer["city"]);
  const postalCode = readText(rawCustomer["postalCode"]);
  const country = readText(rawCustomer["country"]);
  const notes = readText(rawCustomer["notes"]);

  const customer: CheckoutCustomer = {
    name: name.value,
    email: email.value,
    phone: phone.value,
    address: address.value,
    city: city.value,
    postalCode: postalCode.value,
    country: country.value,
  };

  const required: Array<{ field: keyof typeof customer; label: string; read: TextRead }> = [
    { field: "name", label: "your full name", read: name },
    { field: "email", label: "your email address", read: email },
    { field: "phone", label: "a phone number", read: phone },
    { field: "address", label: "your street address", read: address },
    { field: "city", label: "your city", read: city },
    { field: "postalCode", label: "your postal code", read: postalCode },
    { field: "country", label: "your country", read: country },
  ];

  for (const { field, label, read } of required) {
    if (read.invalid) {
      errors.push({ field, message: `Enter ${label} as text.` });
    } else if (!read.value) {
      errors.push({ field, message: `Enter ${label}.` });
    } else if (read.value.length > MAX_FIELD_LENGTH) {
      errors.push({ field, message: `Keep this under ${MAX_FIELD_LENGTH} characters.` });
    }
  }

  if (!email.invalid && email.value && !EMAIL_PATTERN.test(email.value)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  if (!phone.invalid && phone.value) {
    const digits = phone.value.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      errors.push({ field: "phone", message: "Enter a valid phone number." });
    }
  }

  if (notes.invalid) {
    errors.push({ field: "notes", message: "Notes must be text." });
  } else if (notes.value.length > MAX_NOTES_LENGTH) {
    errors.push({ field: "notes", message: `Keep notes under ${MAX_NOTES_LENGTH} characters.` });
  }

  if (rawItems.length === 0) {
    errors.push({ field: "items", message: "Add at least one piece." });
  } else if (rawItems.length > MAX_LINES) {
    errors.push({ field: "items", message: `Orders are limited to ${MAX_LINES} lines.` });
  }

  const lines: ResolvedLine[] = [];

  rawItems.slice(0, MAX_LINES).forEach((rawItem, index) => {
    const item = (rawItem ?? {}) as Record<string, unknown>;
    const productId = typeof item["productId"] === "string" ? item["productId"] : "";
    const size = typeof item["size"] === "string" ? item["size"] : "";
    const quantity = item["quantity"];
    const quantityIsValid =
      typeof quantity === "number" &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= MAX_QUANTITY;

    const product = catalog.find((entry) => entry.id === productId);
    const sizeIsValid = SIZES.includes(size as (typeof SIZES)[number]);

    if (!product) {
      errors.push({ field: `items.${index}.productId`, message: "This piece is not available." });
    }
    if (!sizeIsValid) {
      errors.push({ field: `items.${index}.size`, message: "Choose a size." });
    }
    if (!quantityIsValid) {
      errors.push({
        field: `items.${index}.quantity`,
        message: `Choose a quantity from 1 to ${MAX_QUANTITY}.`,
      });
    }

    if (product && sizeIsValid && quantityIsValid) {
      const unitPrice = product.price;
      const lineQuantity = quantity as number;
      lines.push({
        productId: product.id,
        name: product.name,
        size,
        unitPrice,
        quantity: lineQuantity,
        lineTotal: round(unitPrice * lineQuantity),
      });
    }
  });

  if (errors.length > 0) return { ok: false, errors };

  const subtotal = round(lines.reduce((total, line) => total + line.lineTotal, 0));

  const minOrder = Math.max(0, Number(options.shipping?.minOrder ?? 0));
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      ok: false,
      errors: [{ field: "items", message: `Minimum order is ${minOrder}.` }],
    };
  }

  const cityKey = customer.city.trim().toLowerCase();
  const zone = options.shipping?.zones?.find(
    (entry) => entry.city.trim().toLowerCase() === cityKey,
  );
  const freeThreshold =
    zone?.freeThreshold ?? options.shipping?.freeThreshold ?? FREE_SHIPPING_THRESHOLD;
  const flatRate = zone?.fee ?? options.shipping?.flatRate ?? FLAT_SHIPPING;
  const shipping = subtotal >= freeThreshold ? 0 : flatRate;
  const discount = round(Math.min(options.coupon?.discount ?? 0, subtotal));
  const total = round(subtotal - discount + shipping);

  return {
    ok: true,
    customer: notes.value ? { ...customer, notes: notes.value } : customer,
    lines,
    totals: { subtotal, shipping, discount, total },
    couponCode: options.coupon?.code ?? null,
  };
}
