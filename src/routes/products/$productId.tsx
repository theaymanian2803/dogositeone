import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Heart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

import { BagSheet } from "@/components/bag-sheet";
import { ProductGallery } from "@/components/site/product-gallery";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import { WhatsAppOrderLink } from "@/components/site/whatsapp-order";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  customerSessionFn,
  getProductFn,
  getProductReviewsFn,
  getStoreSettingsFn,
  listProductsFn,
  myWishlistFn,
  submitReviewFn,
  toggleWishlistFn,
} from "@/lib/api";
import { useCart } from "@/lib/cart";
import { LocaleProvider, useT } from "@/lib/locale";
import { getRelatedProducts } from "@/lib/storefront";
import type { Product } from "@/lib/storefront";
import type { StoreSettings } from "@/lib/store-settings";
import { productWhatsAppMessage } from "@/lib/whatsapp";
import { formatMoney, type Review } from "@/lib/commerce";

export const Route = createFileRoute("/products/$productId")({
  loader: async ({ params }) => {
    const [product, settings, reviews, wishlist, session, catalog] = await Promise.all([
      getProductFn({ data: { id: params.productId } }),
      getStoreSettingsFn(),
      getProductReviewsFn({ data: { productId: params.productId } }),
      myWishlistFn(),
      customerSessionFn(),
      listProductsFn(),
    ]);
    if (!product) throw notFound();

    const index = catalog.findIndex((item) => item.id === product.id);

    return {
      product,
      settings,
      reviews,
      saved: wishlist.includes(product.id),
      user: session.user,
      related: getRelatedProducts(product, catalog),
      pieceNumber: String((index >= 0 ? index : 0) + 1).padStart(2, "0"),
      catalogSize: catalog.length,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found — PetPals" }] };
    const { product } = loaderData;
    const description = `${product.tagline} ${product.name} in ${product.color}, made in ${product.fabric.toLowerCase()}. $${product.price} USD.`;
    return {
      meta: [
        { title: `${product.name} - ${product.color} | PetPals` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} - PetPals` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: product.image },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  component: ProductDetail,
});

function ProductNotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
          404 / Product not found
        </p>
        <h1 className="font-display mt-4 text-[52px] font-extrabold leading-[0.9] sm:text-[74px]">
          THIS PIECE
          <br />
          <span className="text-hot-pink">ISN&apos;T HERE.</span>
        </h1>
        <Button
          asChild
          className="mt-7 h-12 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
        >
          <Link to="/" hash="shop">
            Back to the collection
          </Link>
        </Button>
      </div>
    </main>
  );
}

type ProductDetailData = {
  product: Product;
  settings: StoreSettings;
  reviews: Review[];
  saved: boolean;
  user: { name: string | null; email: string; role?: string } | null;
  related: Product[];
  pieceNumber: string;
  catalogSize: number;
};

function ProductDetail() {
  const data = Route.useLoaderData();
  return (
    <LocaleProvider language={data.settings.store_locale.language}>
      <ProductDetailBody data={data as ProductDetailData} />
    </LocaleProvider>
  );
}

function ProductDetailBody({ data }: { data: ProductDetailData }) {
  const { product, settings, reviews, related, pieceNumber, catalogSize, user } = data;
  const { bagCount, setBagOpen, addToBag } = useCart();
  const { t } = useT();
  const navigate = useNavigate();
  const [selectedSize] = useState("One Size");
  const [saved, setSaved] = useState(data.saved);
  const [saveMessage, setSaveMessage] = useState("");

  const categoryLabel = product.category.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const galleryImages = [product.image, ...(product.images ?? [])].filter(Boolean).slice(0, 4);
  const whatsappMessage = productWhatsAppMessage({
    shopName: settings.store_branding.name,
    product,
    option: selectedSize,
    currency: settings.store_shipping.currency,
  });

  async function toggleSaved() {
    if (!user) {
      await navigate({ to: "/account" });
      return;
    }
    const result = await toggleWishlistFn({ data: { productId: product.id } });
    if (!result.ok) {
      setSaveMessage(result.error);
      return;
    }
    setSaved(result.saved);
    setSaveMessage(result.saved ? "Saved to your account." : "Removed from saved pieces.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ThemeStyle theme={settings.store_theme} />
      <SiteHeader settings={settings} user={user} />

      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-[1600px] items-center gap-2 px-5 pt-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:px-8 lg:px-14"
      >
        <Link to="/" className="transition-colors hover:text-hot-pink">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link
          to="/shop"
          search={{ category: product.category }}
          className="transition-colors hover:text-hot-pink"
        >
          {categoryLabel}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span aria-current="page" className="truncate text-foreground">
          {product.name}
        </span>
      </nav>

      <section className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:px-14 lg:pb-24">
        <div className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
          <ProductGallery
            images={galleryImages}
            alt={`${product.name} in ${product.color}`}
            badge={product.badge}
            pieceNumber={pieceNumber}
            catalogSize={catalogSize}
          />
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="size-3.5 text-hot-pink" aria-hidden="true" />
            <span>
              {categoryLabel} / {product.brand || "PetPals"} / Everyday essentials
            </span>
          </div>

          <h1 className="font-display mt-4 text-[42px] font-extrabold leading-[0.9] sm:text-[58px] lg:text-[62px]">
            {product.name.toUpperCase()}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatMoney(product.originalPrice, settings.store_shipping.currency)}
              </span>
            )}
            <span className="text-xl font-semibold">
              {formatMoney(product.price, settings.store_shipping.currency)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {settings.store_shipping.currency} / tax included
            </span>
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className="size-3 rounded-full border border-border bg-foreground"
                aria-hidden="true"
              />
              {product.color}
            </span>
          </div>

          <p className="mt-6 max-w-lg text-sm leading-6 text-foreground">{product.tagline}</p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
              Size <span className="text-hot-pink">/</span> One size
            </p>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              One size suits every pet. See the details below for sizing notes.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => addToBag(product, selectedSize)}
              className="h-13 flex-1 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.12em] text-background hover:bg-hot-pink hover:text-foreground"
            >
              {t("product.addToBag")} -{" "}
              {formatMoney(product.price, settings.store_shipping.currency)}{" "}
              <ArrowUpRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              aria-pressed={saved}
              onClick={toggleSaved}
              className={`h-13 rounded-none px-5 text-xs font-bold uppercase tracking-[0.1em] sm:w-auto ${saved ? "border-hot-pink text-hot-pink" : ""}`}
            >
              <Heart className={`size-4 ${saved ? "fill-hot-pink" : ""}`} />
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
          {settings.store_whatsapp.enabled && (
            <WhatsAppOrderLink
              settings={settings.store_whatsapp}
              message={whatsappMessage}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 border border-foreground px-5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-hot-pink hover:text-foreground"
            />
          )}
          {saveMessage && <p className="mt-2 text-[10px] text-muted-foreground">{saveMessage}</p>}

          <ul className="mt-6 grid gap-3 border-y border-border py-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-hot-pink" aria-hidden="true" />{" "}
              {t("product.freeShipping", {
                amount: formatMoney(
                  settings.store_shipping.freeThreshold,
                  settings.store_shipping.currency,
                ),
              })}
            </li>
            <li className="flex items-center gap-2">
              <RefreshCw className="size-4 text-hot-pink" aria-hidden="true" />{" "}
              {t("product.returns")}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-hot-pink" aria-hidden="true" />{" "}
              {settings.store_shipping.codLabel}
            </li>
          </ul>

          <Accordion
            type="single"
            collapsible
            defaultValue="details"
            className="mt-2 border-t border-border"
          >
            <AccordionItem value="details">
              <AccordionTrigger className="text-[10px] font-bold uppercase tracking-[0.14em] hover:no-underline">
                Details
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-5 text-muted-foreground">
                <p className="mb-4">{product.description}</p>
                <ul className="space-y-2">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-3.5 shrink-0 text-hot-pink"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fit">
              <AccordionTrigger className="text-[10px] font-bold uppercase tracking-[0.14em] hover:no-underline">
                Size & suitability
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-5 text-muted-foreground">
                <p>{product.fit}</p>
                {product.modelNote ? <p className="mt-2">{product.modelNote}</p> : null}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="text-[10px] font-bold uppercase tracking-[0.14em] hover:no-underline">
                Care
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-5 text-muted-foreground">
                <ul className="space-y-2">
                  {product.care.map((step) => (
                    <li key={step} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-hot-pink" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger className="text-[10px] font-bold uppercase tracking-[0.14em] hover:no-underline">
                {t("product.shipping")}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-5 text-muted-foreground">
                <p>
                  {t("product.freeShipping", {
                    amount: formatMoney(
                      settings.store_shipping.freeThreshold,
                      settings.store_shipping.currency,
                    ),
                  })}
                  . {settings.store_shipping.deliveryTime}.
                </p>
                <p className="mt-2">
                  {settings.store_shipping.codLabel}. {t("product.returns")}.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <ReviewsSection productId={product.id} initialReviews={reviews} user={user} />

      <section aria-labelledby="related-heading" className="border-t border-border">
        <div className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 lg:px-14 lg:py-20">
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
                {product.brand ? `More from ${product.brand}` : "More essentials"}
              </p>
              <h2
                id="related-heading"
                className="font-display text-[36px] font-bold leading-none sm:text-[48px]"
              >
                {product.brand ? `MORE FROM ${product.brand.toUpperCase()}` : "MORE ESSENTIALS"}
              </h2>
            </div>
            <Link
              to="/"
              hash="shop"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:text-hot-pink"
            >
              View all pieces <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 pt-6 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6">
            {related.map((item, index) => (
              <article key={item.id} className="group min-w-0">
                <div className="relative overflow-hidden bg-secondary">
                  <img
                    src={item.image}
                    alt={`${item.name} in ${item.color}`}
                    width={768}
                    height={960}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.id }}
                    aria-label={`View ${item.name}`}
                    className="absolute inset-0"
                  />
                  {item.badge && (
                    <span className="absolute left-3 top-3 z-10 bg-background px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 pt-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold sm:text-sm">
                      <Link
                        to="/products/$productId"
                        params={{ productId: item.id }}
                        className="transition-colors hover:text-hot-pink"
                      >
                        {item.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                      {item.color}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold sm:text-sm">
                    {formatMoney(item.price, settings.store_shipping.currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter settings={settings} />
      <BagSheet />
    </main>
  );
}

function ReviewsSection({
  productId,
  initialReviews,
  user,
}: {
  productId: string;
  initialReviews: Review[];
  user: { name: string | null } | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await submitReviewFn({
      data: {
        productId,
        rating: Number(rating),
        title,
        body,
        ...(user ? {} : { guestName }),
      },
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(
      result.pending ? "Thanks — your review is waiting for approval." : "Review published.",
    );
    setTitle("");
    setBody("");
    if (!result.pending) setReviews((current) => [result.review, ...current]);
  }

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <section aria-labelledby="reviews-heading" className="border-t border-border">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
                Reviews
              </p>
              <h2
                id="reviews-heading"
                className="font-display mt-1 text-[34px] font-bold leading-none sm:text-[44px]"
              >
                WHAT THEY SAY
              </h2>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="size-4 fill-hot-pink text-hot-pink" />{" "}
              {reviews.length > 0 ? average.toFixed(1) : "New"} · {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </p>
          </div>

          {reviews.length === 0 ? (
            <p className="mt-6 text-xs text-muted-foreground">
              No reviews yet. Be the first to say something.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {reviews.map((review) => (
                <li key={review.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold">{review.title || "Review"}</p>
                    <span className="text-[10px] text-hot-pink">{"★".repeat(review.rating)}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{review.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    — {review.authorName}
                  </p>
                  {review.imageUrl && (
                    <img src={review.imageUrl} alt="" className="mt-2 h-20 w-24 object-cover" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={submit} className="border border-border p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.1em]">Write a review</h3>
          <div className="mt-4 space-y-3">
            {!user && (
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Your name</span>
                <input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-hot-pink"
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Rating</span>
              <select
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} ★
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-hot-pink"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Review</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-hot-pink"
              />
            </label>
          </div>
          {message && <p className="mt-3 text-[11px] text-muted-foreground">{message}</p>}
          <Button
            type="submit"
            disabled={pending}
            className="mt-4 h-11 w-full rounded-none bg-foreground text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            {pending ? "Sending…" : "Submit review"}
          </Button>
        </form>
      </div>
    </section>
  );
}
