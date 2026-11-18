import { describe, expect, it } from "vitest";

import { filterProducts, getRelatedProducts } from "@/lib/storefront";
import { seedProducts } from "@/server/seed";

describe("storefront product filters", () => {
  it("shows every product in the all collection", () => {
    expect(filterProducts(seedProducts, "all", "")).toHaveLength(seedProducts.length);
  });

  it("limits the dogs collection to dog products", () => {
    expect(filterProducts(seedProducts, "dogs", "").map((product) => product.id)).toEqual([
      "dog-chew-toy-beef-bone-9sl2",
    ]);
  });

  it("searches product names and colours without case sensitivity", () => {
    expect(filterProducts(seedProducts, "all", "SALMON").map((product) => product.id)).toEqual([
      "organic-cat-treats-salmon-n6d5",
    ]);
  });

  it("can narrow the collection to saved items", () => {
    expect(
      filterProducts(
        seedProducts,
        "all",
        "",
        ["dog-chew-toy-beef-bone-9sl2", "squeaky-plush-toy-set-3-pack-qa0h"],
        true,
      ).map((product) => product.id),
    ).toEqual(["dog-chew-toy-beef-bone-9sl2", "squeaky-plush-toy-set-3-pack-qa0h"]);
  });
});

describe("product detail lookup", () => {
  it("finds a product by id", () => {
    const product = seedProducts.find((item) => item.id === "dog-chew-toy-beef-bone-9sl2");

    expect(product?.name).toBe("Dog Chew Toy — Beef Bone");
    expect(product?.care.length).toBeGreaterThan(0);
    expect(product?.features.length).toBeGreaterThan(0);
  });

  it("returns no product for an unknown id", () => {
    expect(seedProducts.find((item) => item.id === "does-not-exist")).toBeUndefined();
  });

  it("derives related products from the catalog it is given", () => {
    const product = seedProducts.find((item) => item.id === "dog-chew-toy-beef-bone-9sl2");
    const other = seedProducts.find((item) => item.id === "organic-cat-treats-salmon-n6d5");
    expect(product).toBeDefined();
    expect(other).toBeDefined();

    const related = getRelatedProducts(product!, [product!, other!], 1);

    expect(related.map((item) => item.id)).toEqual(["organic-cat-treats-salmon-n6d5"]);
  });

  it("excludes the current product from related suggestions", () => {
    const product = seedProducts.find((item) => item.id === "dog-chew-toy-beef-bone-9sl2");
    expect(product).toBeDefined();

    const related = getRelatedProducts(product!, seedProducts, 3);

    expect(related).toHaveLength(3);
    expect(related.some((item) => item.id === product!.id)).toBe(false);
  });
});
