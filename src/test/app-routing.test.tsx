import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the product detail route for a piece id", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/products/dog-chew-toy-beef-bone-9sl2");

    expect(matches.at(-1)?.routeId).toBe("/products/$productId");
    expect(matches.at(-1)?.params).toEqual({ productId: "dog-chew-toy-beef-bone-9sl2" });
  });

  it("still routes an unknown piece id through the product loader", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/products/does-not-exist");

    expect(matches.at(-1)?.routeId).toBe("/products/$productId");
  });

  it("matches the checkout route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/checkout");

    expect(matches.at(-1)?.routeId).toBe("/checkout");
  });

  it("matches the account and content page routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/account").at(-1)?.routeId).toBe("/account");

    const page = router.matchRoutes("/pages/shipping");
    expect(page.at(-1)?.routeId).toBe("/pages/$pageKey");
    expect(page.at(-1)?.params).toEqual({ pageKey: "shipping" });
  });

  it("matches the admin shell and its sections", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/admin").at(-1)?.routeId).toBe("/admin/");
    expect(router.matchRoutes("/admin/login").at(-1)?.routeId).toBe("/admin_/login");
    expect(router.matchRoutes("/admin/products").at(-1)?.routeId).toBe("/admin/products");
    expect(router.matchRoutes("/admin/page-controls").at(-1)?.routeId).toBe("/admin/page-controls");
    expect(router.matchRoutes("/admin/setup").at(-1)?.routeId).toBe("/admin/setup");
  });

  it("matches the Google OAuth routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/api/auth/google").at(-1)?.routeId).toBe("/api/auth/google/");
    expect(router.matchRoutes("/api/auth/google/callback").at(-1)?.routeId).toBe(
      "/api/auth/google/callback",
    );
  });
});
