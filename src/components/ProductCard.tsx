import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

export type ProductCardProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  badge: string | null;
  tag: string | null;
};

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const { add } = useCart();
  const { t } = useI18n();

  return (
    <div className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
          {product.badge && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
              {product.badge}
            </span>
          )}
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-sm font-semibold">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatPrice(product.price)}</p>
          {product.tag && (
            <span className="mt-2 inline-block rounded-full border border-border px-3 py-0.5 text-xs">
              {product.tag}
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          add({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            image_url: product.image_url,
          });
          toast.success(`${product.name} added to cart`);
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2 text-xs font-semibold text-white hover:opacity-90"
      >
        <ShoppingBag className="h-3.5 w-3.5" /> {t("products.add")}
      </button>
    </div>
  );
}