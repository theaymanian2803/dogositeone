import { createServerFn } from "@tanstack/react-start";

import type { PageBlock, PageContent, PageLayout, PageSection } from "@/lib/cms";
import type { Coupon, CouponInput, Customer, Order, OrderStatus, Review } from "@/lib/commerce";
import type { SectionInput } from "@/server/cms";
import type { StoreSettings } from "@/lib/store-settings";
import type { Product } from "@/lib/storefront";
import type { SetupStatus } from "@/server/setup";
import {
  AuthError,
  authenticate,
  clearSessionCookie,
  countAdmins,
  createOwner,
  createSession,
  destroySession,
  getSessionUser,
  getUserWithRole,
  issuePasswordReset,
  listPasswordResetRequests,
  loginLimiter,
  readSessionCookie,
  requireAdmin,
  setSessionCookie,
  type PasswordResetRequest,
  type SessionUser,
} from "@/server/auth";
import {
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  listAllProducts,
  listBrands,
  listCategories,
  updateBrand,
  updateCategory,
  updateProduct,
  type Brand,
  type Category,
  type ProductInput,
} from "@/server/catalog";
import {
  createSection,
  deleteSection,
  getPage,
  listPages,
  listSections,
  moveSection,
  updatePage,
  updateSection,
} from "@/server/cms";
import {
  createCoupon,
  createReview,
  deleteCoupon,
  deleteCustomer,
  deleteReview,
  listCoupons,
  listCustomers,
  listOrders,
  listReviews,
  updateCoupon,
  updateCustomerRole,
  updateOrderStatus,
  updateReviewStatus,
} from "@/server/commerce";
import { ensureDatabase, getDb, readDbConfig, testTursoConnection } from "@/server/db";
import { activateLicense, clearGrant, getLicenseStatus, requireLicense } from "@/server/license";
import { deleteMediaEntry, listAllMedia, saveMedia, type MediaEntry } from "@/server/media";
import { r2Status } from "@/server/r2";
import { resolveMediaStorage } from "@/lib/media-storage";
import {
  changeCredentials,
  connectDatabase,
  disconnectDatabase,
  getSetupStatus,
} from "@/server/setup";
import { sendPasswordResetEmail, sendTestEmail, emailStatus } from "@/server/email";
import { getSettings, setSetting } from "@/server/settings";
import {
  defaultStoreSettings,
  type StoreSettings as StoreSettingsShape,
} from "@/lib/store-settings";

type MutationResult = { ok: true } | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
}

async function adminContext() {
  const client = await getDb();
  await ensureDatabase(client);
  const user = await requireAdmin(client);
  return { client, user };
}

async function writeContext() {
  const context = await adminContext();
  await requireLicense();
  return context;
}

export type AdminSessionResult = { user: SessionUser | null; hasAdmin: boolean };

export const adminSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSessionResult> => {
    try {
      const client = await getDb();
      await ensureDatabase(client);
      const token = readSessionCookie();
      const user = token ? await getSessionUser(client, token) : null;
      return { user, hasAdmin: (await countAdmins(client)) > 0 };
    } catch {
      return { user: null, hasAdmin: true };
    }
  },
);

export const ownerSetupFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name?: string; setupKey?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const expectedKey = process.env["OWNER_SETUP_KEY"];
      if (expectedKey && data.setupKey !== expectedKey) {
        throw new AuthError("That setup key is not valid.", 403);
      }
      if (!loginLimiter.check(`setup:${data.email.trim().toLowerCase()}`, 5)) {
        throw new AuthError("Too many attempts. Try again in a few minutes.", 429);
      }
      const client = await getDb();
      await ensureDatabase(client);
      const user = await createOwner(client, data);
      const session = await createSession(client, user.id);
      setSessionCookie(session.token);
      return { ok: true as const, user };
    } catch (error) {
      return failure(error);
    }
  });

export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!loginLimiter.check(`login:${email}`)) {
      return { ok: false as const, error: "Too many attempts. Try again in a few minutes." };
    }
    try {
      const client = await getDb();
      await ensureDatabase(client);
      const user = await authenticate(client, data);
      if (user.role !== "admin" && user.role !== "moderator") {
        throw new AuthError("This account does not have admin access.", 403);
      }
      const session = await createSession(client, user.id);
      setSessionCookie(session.token);
      loginLimiter.reset(`login:${email}`);
      return { ok: true as const, user };
    } catch (error) {
      return failure(error);
    }
  });

export const adminLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const client = await getDb();
    const token = readSessionCookie();
    if (token) await destroySession(client, token);
  } catch {
    // Clearing the cookie is still correct.
  }
  clearSessionCookie();
  return { ok: true as const };
});

export const adminChangeCredentialsFn = createServerFn({ method: "POST" })
  .validator((data: { currentPassword: string; email?: string; newPassword?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { client, user } = await adminContext();
      const updated = await changeCredentials(client, user.id, data);
      const session = await createSession(client, updated.id);
      setSessionCookie(session.token);
      return { ok: true as const, user: updated };
    } catch (error) {
      return failure(error);
    }
  });

/* Setup ------------------------------------------------------------- */

export const adminSetupStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SetupStatus> => {
    const { client } = await adminContext();
    return getSetupStatus(client);
  },
);

export const adminTestDbFn = createServerFn({ method: "POST" })
  .validator((data: { url: string; token: string }) => data)
  .handler(async ({ data }) => {
    await adminContext();
    return testTursoConnection(data.url, data.token);
  });

export const adminConnectDbFn = createServerFn({ method: "POST" })
  .validator((data: { url: string; token: string; keepSeed: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      await adminContext();
      const result = await connectDatabase(data.url, data.token, data.keepSeed);
      clearSessionCookie();
      return { ok: true as const, seeded: result.seeded };
    } catch (error) {
      return failure(error);
    }
  });

export const adminResetDbFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await adminContext();
    await disconnectDatabase();
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
});

export const adminDbConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  await adminContext();
  return readDbConfig();
});

export const adminLicenseFn = createServerFn({ method: "GET" }).handler(async () => {
  await adminContext();
  return getLicenseStatus();
});

export const adminActivateLicenseFn = createServerFn({ method: "POST" })
  .validator((data: { key: string }) => data)
  .handler(async ({ data }) => {
    try {
      await adminContext();
      const status = await activateLicense(data.key);
      return { ok: true as const, status };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeactivateLicenseFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await adminContext();
    await clearGrant();
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
});

/* Dashboard --------------------------------------------------------- */

export type AdminStats = {
  revenue: number;
  orders: number;
  products: number;
  customers: number;
  lowStock: Product[];
  recentOrders: Order[];
};

export const adminStatsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminStats> => {
    const { client } = await adminContext();
    const [totals, products, customers, orders] = await Promise.all([
      client.execute(
        "SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count FROM orders WHERE status <> 'cancelled'",
      ),
      client.execute("SELECT COUNT(*) AS count FROM products"),
      client.execute("SELECT COUNT(*) AS count FROM user_roles WHERE role = 'customer'"),
      listOrders(client, { limit: 6 }),
    ]);
    const all = await listAllProducts(client);
    return {
      revenue: Number(totals.rows[0]?.["revenue"] ?? 0),
      orders: Number(totals.rows[0]?.["count"] ?? 0),
      products: Number(products.rows[0]?.["count"] ?? 0),
      customers: Number(customers.rows[0]?.["count"] ?? 0),
      lowStock: all.filter((product) => (product.stock ?? 0) <= 5).slice(0, 6),
      recentOrders: orders,
    };
  },
);

/* Products ---------------------------------------------------------- */

export const adminProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { client } = await adminContext();
  return listAllProducts(client);
});

export const adminSaveProductFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; input: ProductInput }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      if (data.id) await updateProduct(client, data.id, data.input);
      else await createProduct(client, data.input);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteProductFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteProduct(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminCategoriesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Category[]> => {
    const { client } = await adminContext();
    return listCategories(client);
  },
);

export const adminSaveCategoryFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; name: string; image?: string | null }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      if (data.id) await updateCategory(client, data.id, data);
      else await createCategory(client, data);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteCategoryFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteCategory(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminBrandsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Brand[]> => {
    const { client } = await adminContext();
    return listBrands(client);
  },
);

export const adminSaveBrandFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; name: string; logoUrl?: string | null }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      if (data.id) await updateBrand(client, data.id, data);
      else await createBrand(client, data);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteBrandFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteBrand(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Media ------------------------------------------------------------- */

export const adminMediaFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MediaEntry[]> => {
    const { client } = await adminContext();
    return listAllMedia(client);
  },
);

export const adminMediaStorageFn = createServerFn({ method: "GET" }).handler(async () => {
  const { client } = await adminContext();
  const settings = await getSettings(client);
  const status = r2Status();
  const mode = settings.store_media.storage;
  return {
    mode,
    configured: status.configured,
    publicDomain: status.publicDomain,
    active: resolveMediaStorage(mode, status.configured),
  };
});
export const adminUploadMediaFn = createServerFn({ method: "POST" })
  .validator((data: { dataUrl: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { client } = await writeContext();
      const media = await saveMedia(client, data.dataUrl);
      return { ok: true as const, media };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteMediaFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteMediaEntry(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* CMS --------------------------------------------------------------- */

export const adminSectionsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PageSection[]> => {
    const { client } = await adminContext();
    return listSections(client);
  },
);

export const adminSaveSectionFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; input: SectionInput }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      if (data.id) await updateSection(client, data.id, data.input);
      else await createSection(client, data.input);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteSectionFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteSection(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminMoveSectionFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; direction: "up" | "down" }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await moveSection(client, data.id, data.direction);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminPagesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PageContent[]> => {
    const { client } = await adminContext();
    return listPages(client);
  },
);

export const adminPageFn = createServerFn({ method: "GET" })
  .validator((data: { pageKey: string }) => data)
  .handler(async ({ data }) => {
    const { client } = await adminContext();
    return getPage(client, data.pageKey);
  });

export const adminSavePageFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      pageKey: string;
      title: string;
      body?: string;
      eyebrow?: string;
      heroImage?: string;
      layout?: PageLayout;
      blocks?: PageBlock[];
    }) => data,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await updatePage(client, data.pageKey, data);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Settings ---------------------------------------------------------- */

export const adminSettingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreSettingsShape> => {
    const { client } = await adminContext();
    return getSettings(client);
  },
);

export const adminSaveSettingFn = createServerFn({ method: "POST" })
  .validator((data: { key: keyof StoreSettings; value: unknown }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      if (!(data.key in defaultStoreSettings)) throw new Error("Unknown setting.");
      const { client } = await writeContext();
      await setSetting(client, data.key, data.value);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Orders ------------------------------------------------------------ */

export const adminOrdersFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Order[]> => {
    const { client } = await adminContext();
    return listOrders(client, { limit: 300 });
  },
);

export const adminUpdateOrderStatusFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: OrderStatus }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await updateOrderStatus(client, data.id, data.status);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Reviews ----------------------------------------------------------- */

export const adminReviewsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Review[]> => {
    const { client } = await adminContext();
    return listReviews(client);
  },
);

export const adminSaveReviewFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      productId: string;
      authorName: string;
      rating: number;
      title?: string;
      body?: string;
      imageUrl?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await createReview(client, { ...data, status: "approved" });
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminReviewStatusFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: "pending" | "approved" }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await updateReviewStatus(client, data.id, data.status);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteReviewFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteReview(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Coupons ----------------------------------------------------------- */

export const adminCouponsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Coupon[]> => {
    const { client } = await adminContext();
    return listCoupons(client);
  },
);

export const adminSaveCouponFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; input: CouponInput }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      if (data.id) await updateCoupon(client, data.id, data.input);
      else await createCoupon(client, data.input);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteCouponFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteCoupon(client, data.id);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

/* Customers --------------------------------------------------------- */

export const adminCustomersFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Customer[]> => {
    const { client } = await adminContext();
    return listCustomers(client);
  },
);

export const adminPasswordResetsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PasswordResetRequest[]> => {
    const { client } = await adminContext();
    return listPasswordResetRequests(client);
  },
);

export const adminIssuePasswordResetFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; email?: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; code: string; email: string; name: string; phone: string; emailed: boolean }
      | { ok: false; error: string }
    > => {
      try {
        const { client } = await writeContext();
        const result = await issuePasswordReset(client, data);
        const settings = await getSettings(client);
        const email = await sendPasswordResetEmail({
          to: result.email,
          name: result.name,
          code: result.code,
          settings,
        });
        return { ok: true, ...result, emailed: email.ok };
      } catch (error) {
        return failure(error);
      }
    },
  );

export const adminEmailStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  await adminContext();
  return { ...emailStatus(), testRecipient: process.env["EMAIL_TEST_TO"]?.trim() || null };
});

export const adminSendTestEmailFn = createServerFn({ method: "POST" })
  .validator((data: { to?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; to: string } | { ok: false; error: string }> => {
    try {
      const { client } = await adminContext();
      const settings = await getSettings(client);
      const result = await sendTestEmail({
        ...(data.to ? { to: data.to } : {}),
        settings,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, to: result.to ?? "" };
    } catch (error) {
      return failure(error);
    }
  });

export const adminSetRoleFn = createServerFn({ method: "POST" })
  .validator((data: { userId: string; role: "admin" | "moderator" | "customer" }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await updateCustomerRole(client, data.userId, data.role);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });

export const adminDeleteCustomerFn = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const { client } = await writeContext();
      await deleteCustomer(client, data.userId);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  });
