export type OrderStatus = "new" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  size: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode: string | null;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

export type ReviewStatus = "pending" | "approved";

export type Review = {
  id: string;
  productId: string;
  productName?: string;
  userId: string | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  imageUrl: string | null;
  status: ReviewStatus;
  createdAt: string;
};

export type CouponType = "percentage" | "fixed";

export type CouponInput = {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxUses?: number | null;
  active?: boolean;
  expiresAt?: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "moderator" | "customer";
  createdAt: string;
  orderCount: number;
  orderTotal: number;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const ROLE_OPTIONS = ["admin", "moderator", "customer"] as const;

export function formatMoney(value: number, currency = "MAD") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
