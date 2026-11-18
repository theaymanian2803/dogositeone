export type ProductCategory = "dogs" | "cats" | "foods" | "groom" | "bed" | "toys";

export type Brand = {
  id: string;
  name: string;
  logoUrl: string | null;
  productCount?: number;
};

export type Product = {
  id: string;
  name: string;
  color: string;
  price: number;
  image: string;
  category: ProductCategory;
  badge?: string;
  originalPrice?: number;
  brand?: string;
  stock?: number;
  images?: string[];
  tagline: string;
  description: string;
  fabric: string;
  composition: string[];
  care: string[];
  fit: string;
  modelNote: string;
  features: string[];
};

export type Collection = "all" | ProductCategory;

export function getRelatedProducts(product: Product, catalog: Product[], limit = 3): Product[] {
  const others = catalog.filter((item) => item.id !== product.id);
  const sameBrand = product.brand ? others.filter((item) => item.brand === product.brand) : [];
  const sameCategory = others.filter(
    (item) => !sameBrand.includes(item) && item.category === product.category,
  );
  const rest = others.filter((item) => !sameBrand.includes(item) && !sameCategory.includes(item));
  return [...sameBrand, ...sameCategory, ...rest].slice(0, limit);
}

export function filterProducts(
  items: Product[],
  collection: Collection,
  query: string,
  savedIds: string[] = [],
  savedOnly = false,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((product) => {
    const matchesCollection = collection === "all" || product.category === collection;
    const matchesQuery = `${product.name} ${product.color}`.toLowerCase().includes(normalizedQuery);
    const matchesSaved = !savedOnly || savedIds.includes(product.id);
    return matchesCollection && matchesQuery && matchesSaved;
  });
}
