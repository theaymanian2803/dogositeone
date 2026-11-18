import { createServerFn } from "@tanstack/react-start";

import type { PageContent, PageSection } from "@/lib/cms";
import type { Order, Review } from "@/lib/commerce";
import {
  validateCheckout,
  type CheckoutCustomer,
  type CheckoutError,
  type CheckoutItem,
  type CheckoutTotals,
} from "@/lib/checkout";
import type { StoreSettings } from "@/lib/store-settings";
import type { Product } from "@/lib/storefront";
import {
  authenticate,
  clearSessionCookie,
  completePasswordReset,
  createCustomer,
  createSession,
  getSessionUser,
  readSessionCookie,
  requestPasswordReset,
  setSessionCookie,
} from "@/server/auth";
import { getProductDetail, listProducts, readProducts } from "@/server/catalog";
import { getPage, listSections } from "@/server/cms";
import {
  checkCoupon,
  createReview,
  listCustomerOrders,
  listReviews,
  listWishlist,
  toggleWishlist,
} from "@/server/commerce";
import { ensureDatabase, getDb } from "@/server/db";
import { getSettings } from "@/server/settings";
import { CheckoutValidationError, DatabaseUnavailableError, placeOrder } from "@/server/orders";

async function signIn(userId: string) {
  const client = await getDb();
  const session = await createSession(client, userId);
  setSessionCookie(session.token);
}

async function currentUser() {
  try {
    const client = await getDb();
    await ensureDatabase(client);
    const token = readSessionCookie();
    if (!token) return null;
    return await getSessionUser(client, token);
  } catch {
    return null;
  }
}

/* Catalog ----------------------------------------------------------- */

export const listProductsFn = createServerFn({ method: "GET" }).handler(async () => listProducts());

export const getProductFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => getProductDetail(data.id));

export const listSectionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const client = await getDb();
  return listSections(client, { visibleOnly: true });
});

export const listCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  const client = await getDb();
  const { listCategories } = await import("@/server/catalog");
  return listCategories(client);
});

export const listBrandsFn = createServerFn({ method: "GET" }).handler(async () => {
  const client = await getDb();
  const { listBrands } = await import("@/server/catalog");
  return listBrands(client);
});

export const listStoreReviewsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Review[]> => {
    const client = await getDb();
    return listReviews(client, { approvedOnly: true });
  },
);

export const getPageFn = createServerFn({ method: "GET" })
  .validator((data: { pageKey: string }) => data)
  .handler(async ({ data }) => {
    const client = await getDb();
    return getPage(client, data.pageKey);
  });

export const getStoreSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const client = await getDb();
  await ensureDatabase(client);
  return getSettings(client);
});

export const authOptionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { googleConfigured } = await import("@/lib/google-oauth.server");
  return { google: googleConfigured() };
});

/* Orders ------------------------------------------------------------ */

export type QuoteResult =
  | { ok: true; totals: CheckoutTotals; couponCode: string | null }
  | { ok: false; errors: CheckoutError[] };

export const quoteOrderFn = createServerFn({ method: "POST" })
  .validator(
    (data: { customer: CheckoutCustomer; items: CheckoutItem[]; couponCode?: string }) => data,
  )
  .handler(async ({ data }): Promise<QuoteResult> => {
    const client = await getDb();
    await ensureDatabase(client);
    const catalog = await readProducts(client);
    const settings = await getSettings(client);

    const base = validateCheckout(data, catalog, { shipping: settings.store_shipping });
    if (!base.ok) return { ok: false, errors: base.errors };

    let coupon: { code: string; discount: number } | undefined;
    if (data.couponCode?.trim()) {
      const check = await checkCoupon(client, data.couponCode, base.totals.subtotal);
      if (!check.ok) return { ok: false, errors: [{ field: "coupon", message: check.message }] };
      coupon = { code: check.coupon.code, discount: check.discount };
    }

    const validation = coupon
      ? validateCheckout(data, catalog, { shipping: settings.store_shipping, coupon })
      : base;
    if (!validation.ok) return { ok: false, errors: validation.errors };

    return { ok: true, totals: validation.totals, couponCode: validation.couponCode };
  });

export const createOrderFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      customer: CheckoutCustomer;
      items: CheckoutItem[];
      idempotencyKey?: string;
      couponCode?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      const user = await currentUser();
      const result = await placeOrder({ ...data, ...(user ? { userId: user.id } : {}) }, client);
      return {
        ok: true as const,
        orderNumber: result.orderNumber,
        total: result.totals.total,
        discount: result.totals.discount,
      };
    } catch (error) {
      if (error instanceof CheckoutValidationError) {
        return { ok: false as const, errors: error.errors };
      }
      if (error instanceof DatabaseUnavailableError) {
        return {
          ok: false as const,
          errors: [
            {
              field: "form",
              message: "Checkout is temporarily unavailable. Please try again.",
            },
          ],
        };
      }
      throw error;
    }
  });

/* Customer accounts ------------------------------------------------- */

export type CustomerSession = {
  user: { id: string; email: string; name: string | null; role: string } | null;
};

export const customerSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerSession> => {
    const user = await currentUser();
    return {
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
    };
  },
);

export const customerLoginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      await ensureDatabase(client);
      const user = await authenticate(client, data);
      await signIn(user.id);
      return { ok: true as const, user };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Sign in failed.",
      };
    }
  });

export const customerRegisterFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      const user = await createCustomer(client, data);
      await signIn(user.id);
      return { ok: true as const, user };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not create the account.",
      };
    }
  });

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      await requestPasswordReset(client, data);
    } catch {
      // Never reveal whether an account exists or whether the request failed.
    }
    return { ok: true as const };
  });

export const completePasswordResetFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; code: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      await completePasswordReset(client, data);
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not reset the password.",
      };
    }
  });

export const customerLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const client = await getDb();
    const token = readSessionCookie();
    if (token) {
      const { destroySession } = await import("@/server/auth");
      await destroySession(client, token);
    }
  } catch {
    // Clearing the cookie is still the right outcome.
  }
  clearSessionCookie();
  return { ok: true as const };
});

export const myOrdersFn = createServerFn({ method: "GET" }).handler(async (): Promise<Order[]> => {
  const user = await currentUser();
  if (!user) return [];
  const client = await getDb();
  return listCustomerOrders(client, user.id);
});

export const myWishlistFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const user = await currentUser();
    if (!user) return [];
    const client = await getDb();
    return listWishlist(client, user.id);
  },
);

export const toggleWishlistFn = createServerFn({ method: "POST" })
  .validator((data: { productId: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) return { ok: false as const, error: "Sign in to save pieces." };
    const client = await getDb();
    const saved = await toggleWishlist(client, user.id, data.productId);
    return { ok: true as const, saved };
  });

/* Reviews ----------------------------------------------------------- */

export const getProductReviewsFn = createServerFn({ method: "GET" })
  .validator((data: { productId: string }) => data)
  .handler(async ({ data }): Promise<Review[]> => {
    const client = await getDb();
    return listReviews(client, { productId: data.productId, approvedOnly: true });
  });

export const submitReviewFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      productId: string;
      rating: number;
      title?: string;
      body?: string;
      imageUrl?: string;
      guestName?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const client = await getDb();
      await ensureDatabase(client);
      const user = await currentUser();
      const settings = await getSettings(client);
      const authorName = user?.name || data.guestName?.trim() || "Guest";
      const review = await createReview(client, {
        productId: data.productId,
        authorName,
        rating: data.rating,
        title: data.title ?? "",
        body: data.body ?? "",
        imageUrl: data.imageUrl ?? null,
        userId: user?.id ?? null,
        status: settings.store_reviews.requireApproval ? "pending" : "approved",
      });
      return {
        ok: true as const,
        review,
        pending: settings.store_reviews.requireApproval,
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not submit the review.",
      };
    }
  });

export type { PageContent, PageSection, Product, StoreSettings };
