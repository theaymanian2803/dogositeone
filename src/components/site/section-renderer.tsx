import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sectionBrandId,
  sectionBrandIds,
  sectionCategoryIds,
  sectionProductIds,
  sectionReviewIds,
  type PageSection,
} from "@/lib/cms";
import { formatMoney, type Review } from "@/lib/commerce";
import type { Brand, Collection, Product } from "@/lib/storefront";
import { ProductGridSection } from "./product-grid-section";
import { resolveSectionStyle } from "./section-style";

type CategoryTile = { id: string; name: string; slug: string; image: string | null };

function text(config: Record<string, unknown>, key: string, fallback = ""): string {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function SectionHeader({
  section,
  s,
  eyebrow,
  fallbackTitle,
}: {
  section: PageSection;
  s: ReturnType<typeof resolveSectionStyle>;
  eyebrow: string;
  fallbackTitle: string;
}) {
  const align = s.style.align;
  const stacked = align === "center" || align === "right";

  return (
    <div
      className={`border-b border-border pb-4 ${
        stacked ? "flex flex-col gap-3" : "flex flex-wrap items-end justify-between gap-4"
      }`}
    >
      <div style={s.content}>
        <p
          style={s.eyebrow}
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
        >
          {text(section.config, "eyebrow", eyebrow)}
        </p>
        <h2
          style={s.title}
          className="font-display mt-1 text-[36px] font-bold leading-none sm:text-[48px]"
        >
          {section.title || fallbackTitle}
        </h2>
      </div>
      {section.subtitle && (
        <p
          style={s.subtitle}
          className={`max-w-sm text-xs leading-5 text-muted-foreground ${
            align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""
          }`}
        >
          {section.subtitle}
        </p>
      )}
    </div>
  );
}

function Cta({ label, href, className = "" }: { label: string; href: string; className?: string }) {
  if (!label) return null;
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Button asChild className={className}>
        <a href={href}>
          {label} <ArrowRight className="size-4" />
        </a>
      </Button>
    );
  }
  return (
    <Button asChild className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label} <ArrowUpRight className="size-4" />
      </a>
    </Button>
  );
}

function BackgroundImage({ src, overlay }: { src: string; overlay: number }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{ opacity: overlay / 100 }}
      />
    </>
  );
}

export function SectionRenderer({
  section,
  products,
  categories,
  brands = [],
  reviews = [],
}: {
  section: PageSection;
  products: Product[];
  categories: CategoryTile[];
  brands?: Brand[];
  reviews?: Review[];
}) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} products={products} />;
    case "product_grid": {
      const filter = text(section.config, "filter", "all") as Collection;
      const initial: Collection = ["all", "dogs", "cats", "foods", "groom", "bed", "toys"].includes(
        filter,
      )
        ? filter
        : "all";
      return (
        <ProductGridSection products={products} section={section} initialCollection={initial} />
      );
    }
    case "promo":
      return <PromoSection section={section} />;
    case "custom_banner":
      return <CustomBanner section={section} />;
    case "rich_text":
      return <RichText section={section} />;
    case "categories":
      return <CategoriesSection section={section} categories={categories} />;
    case "products":
      return <ProductPickSection section={section} products={products} />;
    case "lookbook":
      return <Lookbook section={section} />;
    case "reviews":
      return <ReviewsSection section={section} reviews={reviews} />;
    case "featured_brand":
      return <FeaturedBrand section={section} brands={brands} />;
    case "brands":
      return <BrandsSection section={section} brands={brands} />;
    default:
      return null;
  }
}

function HeroSection({ section, products }: { section: PageSection; products: Product[] }) {
  const featuredId = text(section.config, "featured_id");
  const featured = products.find((product) => product.id === featuredId) ?? products[0];
  const eyebrow = text(section.config, "eyebrow", section.subtitle);
  const description = text(section.config, "description");
  const ctaText = text(section.config, "cta_text", "Shop the collection");
  const ctaLink = text(section.config, "cta_link", "#shop");
  const s = resolveSectionStyle(section);

  return (
    <section
      id="top"
      style={s.wrapper}
      className="mx-auto grid max-w-[1600px] grid-cols-1 items-stretch px-5 pt-5 sm:px-8 md:grid-cols-[1fr_0.94fr] md:gap-7 md:px-14 md:pt-9"
    >
      <div
        className="relative flex min-h-[420px] flex-col justify-center pb-10 pt-10 md:min-h-[490px] md:pb-14 md:pt-16"
        style={s.content}
      >
        <div
          className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
          style={s.eyebrow}
        >
          <Sparkles className="size-3.5 text-hot-pink" aria-hidden="true" />
          <span>{eyebrow}</span>
        </div>
        <h1
          style={s.title}
          className="font-display max-w-full text-[38px] font-extrabold leading-[0.89] sm:text-[58px] md:text-[34px] lg:text-[50px] xl:text-[64px] 2xl:text-[74px]"
        >
          {section.title.split("\n").map((line, index) => (
            <span key={`${line}-${index}`} className="block">
              {line}
            </span>
          ))}
        </h1>
        {description && (
          <p
            style={s.subtitle}
            className="mt-7 max-w-sm text-sm leading-6 text-muted-foreground sm:text-[15px]"
          >
            {description}
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Cta
            label={ctaText}
            href={ctaLink}
            className="h-12 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          />
          {section.subtitle && section.subtitle !== eyebrow && (
            <span
              style={s.subtitle}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              {section.subtitle}
            </span>
          )}
        </div>
        <div className="mt-11 hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground md:flex">
          <ArrowDown className="size-4 text-hot-pink" aria-hidden="true" /> Scroll to explore
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-10 right-6 font-display text-[11px] font-bold text-hot-pink md:bottom-7 md:right-10"
        >
          01—{String(products.length).padStart(2, "0")}
        </span>
      </div>

      <div
        className="relative min-h-[380px] overflow-hidden bg-secondary md:min-h-[490px]"
        style={s.imageOrder}
      >
        {section.imageUrl ? (
          <img
            src={section.imageUrl}
            alt={featured ? `${featured.name} in ${featured.color}` : "Featured piece"}
            width={1024}
            height={1280}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="absolute left-4 top-4 bg-background px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] sm:left-6 sm:top-6">
          {text(section.config, "caption", "Featured / 001")}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between sm:bottom-6 sm:left-6 sm:right-6">
          {featured && (
            <Link
              to="/products/$productId"
              params={{ productId: featured.id }}
              className="bg-background px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] hover:text-hot-pink"
            >
              {featured.name}
            </Link>
          )}
          <Button
            asChild
            size="icon"
            aria-label="Explore the collection"
            className="size-11 rounded-none bg-hot-pink text-foreground hover:bg-foreground hover:text-background"
          >
            <a href={ctaLink}>
              <ArrowUpRight className="size-5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PromoSection({ section }: { section: PageSection }) {
  const cta = (
    <Cta
      label={text(section.config, "cta_text", "Find your set")}
      href={text(section.config, "cta_link", "#shop")}
      className="h-11 w-fit rounded-none border border-input bg-background px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-accent"
    />
  );
  const s = resolveSectionStyle(section);
  const split = s.hasImage && !s.backgroundLayout;

  return (
    <section
      style={s.wrapper}
      className={`border-y border-border bg-secondary/70 ${s.backgroundLayout ? "relative overflow-hidden" : ""}`}
    >
      {s.backgroundLayout && <BackgroundImage src={section.imageUrl} overlay={s.overlay} />}
      <div className="relative z-10 mx-auto max-w-[1600px] px-5 py-12 sm:px-8 md:px-14 md:py-16">
        <div
          className={
            split
              ? "grid items-center gap-8 md:grid-cols-[1fr_0.85fr]"
              : "flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          }
        >
          <div style={s.content}>
            <p
              style={s.eyebrow}
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
            >
              {text(section.config, "eyebrow", section.subtitle)}
            </p>
            <h2
              style={s.title}
              className="font-display max-w-2xl text-[38px] font-bold leading-[0.98] sm:text-[56px]"
            >
              {section.title}
            </h2>
            {section.subtitle && (
              <p
                style={s.subtitle}
                className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground"
              >
                {section.subtitle}
              </p>
            )}
            {(split || s.backgroundLayout) && <div className="mt-6">{cta}</div>}
          </div>
          {split ? (
            <div className="overflow-hidden bg-secondary" style={s.imageOrder}>
              <img
                src={section.imageUrl}
                alt=""
                loading="lazy"
                className="h-full min-h-[220px] w-full object-cover"
              />
            </div>
          ) : (
            !s.hasImage && cta
          )}
        </div>
      </div>
    </section>
  );
}

function CustomBanner({ section }: { section: PageSection }) {
  const s = resolveSectionStyle(section);
  const split = s.hasImage && !s.backgroundLayout;

  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 md:px-14">
      <div
        className={`relative grid overflow-hidden border border-border ${s.backgroundLayout ? "" : "md:grid-cols-2"}`}
      >
        {s.backgroundLayout && <BackgroundImage src={section.imageUrl} overlay={s.overlay} />}
        <div
          className={`flex flex-col justify-center p-8 sm:p-12 ${s.backgroundLayout ? "relative z-10 min-h-[380px]" : ""}`}
          style={s.content}
        >
          <p
            style={s.eyebrow}
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
          >
            {text(section.config, "eyebrow", section.subtitle)}
          </p>
          <h2
            style={s.title}
            className="font-display mt-2 text-[34px] font-bold leading-none sm:text-[48px]"
          >
            {section.title}
          </h2>
          {section.subtitle && (
            <p style={s.subtitle} className="mt-3 text-sm leading-6 text-muted-foreground">
              {section.subtitle}
            </p>
          )}
          <div className="mt-6">
            <Cta
              label={text(section.config, "cta_text", "")}
              href={text(section.config, "cta_link", "#shop")}
              className="h-11 rounded-none bg-foreground px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
            />
          </div>
        </div>
        {split && (
          <div className="min-h-[280px] bg-secondary" style={s.imageOrder}>
            <img src={section.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
          </div>
        )}
        {!s.hasImage && (
          <div className="flex min-h-[280px] items-center justify-center bg-secondary text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Add an image
          </div>
        )}
      </div>
    </section>
  );
}

function RichText({ section }: { section: PageSection }) {
  const content = text(section.config, "content", section.subtitle);
  const s = resolveSectionStyle(section);
  return (
    <section
      style={s.wrapper}
      className="mx-auto max-w-[900px] px-5 py-14 text-center sm:px-8 md:py-20"
    >
      <p
        style={s.eyebrow}
        className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
      >
        {text(section.config, "eyebrow", "PetPals")}
      </p>
      <h2
        style={s.title}
        className="font-display mt-2 text-[36px] font-bold leading-[0.95] sm:text-[52px]"
      >
        {section.title}
      </h2>
      <div style={s.subtitle} className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
        {paragraphs(content).map((part) => (
          <p key={part}>{part}</p>
        ))}
      </div>
    </section>
  );
}

function CategoriesSection({
  section,
  categories,
}: {
  section: PageSection;
  categories: CategoryTile[];
}) {
  const s = resolveSectionStyle(section);
  const selectedIds = sectionCategoryIds(section.config);
  const shown =
    selectedIds.length > 0
      ? categories.filter((category) => selectedIds.includes(category.id))
      : categories;
  if (shown.length === 0) return null;

  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14">
      <SectionHeader section={section} s={s} eyebrow="Browse" fallbackTitle="SHOP BY CATEGORY" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((category) => (
          <Link
            key={category.id}
            to="/"
            hash="shop"
            className="group relative block overflow-hidden bg-secondary"
          >
            {category.image ? (
              <img
                src={category.image}
                alt=""
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="aspect-[4/3] w-full" />
            )}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/60 to-transparent p-4">
              <span className="bg-background px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                {category.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductPickSection({ section, products }: { section: PageSection; products: Product[] }) {
  const s = resolveSectionStyle(section);
  const ids = sectionProductIds(section.config);
  const picked =
    ids.length > 0
      ? ids
          .map((id) => products.find((product) => product.id === id))
          .filter((product): product is Product => Boolean(product))
      : products;
  if (picked.length === 0) return null;

  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14">
      <SectionHeader section={section} s={s} eyebrow="Selected" fallbackTitle="PICKED PIECES" />
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
        {picked.map((product) => (
          <article key={product.id} className="group min-w-0">
            <Link
              to="/products/$productId"
              params={{ productId: product.id }}
              className="relative block overflow-hidden bg-secondary"
            >
              <img
                src={product.image}
                alt={`${product.name} in ${product.color}`}
                width={768}
                height={960}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
              />
              {product.badge && (
                <span className="absolute left-2.5 top-2.5 bg-background px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em]">
                  {product.badge}
                </span>
              )}
            </Link>
            <div className="flex items-start justify-between gap-2 pt-3">
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold sm:text-sm">
                  <Link
                    to="/products/$productId"
                    params={{ productId: product.id }}
                    className="transition-colors hover:text-hot-pink"
                  >
                    {product.name}
                  </Link>
                </h3>
                <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{product.color}</p>
              </div>
              <div className="shrink-0 text-right">
                {product.originalPrice && (
                  <span className="block text-[9px] text-muted-foreground line-through">
                    {formatMoney(product.originalPrice, "MAD")}
                  </span>
                )}
                <span className="text-xs font-semibold sm:text-sm">
                  {formatMoney(product.price, "MAD")}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const score = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex gap-0.5 text-xs" aria-label={`${score} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={star <= score ? "text-hot-pink" : "text-border"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewsSection({ section, reviews }: { section: PageSection; reviews: Review[] }) {
  const s = resolveSectionStyle(section);
  const ids = sectionReviewIds(section.config);
  const shown = ids.length > 0 ? reviews.filter((review) => ids.includes(review.id)) : reviews;
  if (shown.length === 0) return null;

  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14">
      <SectionHeader section={section} s={s} eyebrow="Reviews" fallbackTitle="WHAT THEY SAY" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((review) => (
          <figure key={review.id} className="flex flex-col border border-border p-5">
            <Stars rating={review.rating} />
            {review.title && (
              <h3 className="font-display mt-3 text-lg font-bold leading-tight">{review.title}</h3>
            )}
            <blockquote className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">
              {review.body}
            </blockquote>
            {review.imageUrl && (
              <img
                src={review.imageUrl}
                alt=""
                loading="lazy"
                className="mt-3 h-32 w-full border border-border object-cover"
              />
            )}
            <figcaption className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em]">
              {review.authorName}
              {review.productName ? ` — ${review.productName}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Lookbook({ section }: { section: PageSection }) {
  const images = Array.isArray(section.config["images"])
    ? (section.config["images"] as unknown[]).map(String).filter(Boolean)
    : [];
  const s = resolveSectionStyle(section);
  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14">
      <SectionHeader section={section} s={s} eyebrow="Lookbook" fallbackTitle="THE LOOKBOOK" />
      <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(images.length > 0 ? images : [section.imageUrl].filter(Boolean)).map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt=""
            className="aspect-[3/4] w-full bg-secondary object-cover"
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedBrand({ section, brands }: { section: PageSection; brands: Brand[] }) {
  const s = resolveSectionStyle(section);
  const brand =
    brands.find((entry) => entry.id === sectionBrandId(section.config)) ??
    brands.find((entry) => entry.name === section.title) ??
    null;
  const imageUrl = section.imageUrl || brand?.logoUrl || "";
  const title = section.title || brand?.name || "";
  const split = Boolean(imageUrl) && !s.backgroundLayout;

  return (
    <section
      style={s.wrapper}
      className={`mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14 ${s.backgroundLayout ? "relative overflow-hidden" : ""}`}
    >
      {s.backgroundLayout && <BackgroundImage src={imageUrl} overlay={s.overlay} />}
      <div
        className={`relative z-10 grid items-center gap-8 ${split || !imageUrl ? "md:grid-cols-2" : ""}`}
      >
        <div
          className={`flex min-h-[320px] items-center justify-center bg-secondary ${s.backgroundLayout ? "hidden" : ""}`}
          style={s.imageOrder}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={brand?.name ?? ""} className="size-full object-cover" />
          ) : null}
        </div>
        <div style={s.content}>
          <p
            style={s.eyebrow}
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink"
          >
            {text(section.config, "eyebrow", brand?.name ?? "Featured brand")}
          </p>
          <h2
            style={s.title}
            className="font-display mt-2 text-[38px] font-bold leading-none sm:text-[52px]"
          >
            {title}
          </h2>
          <p style={s.subtitle} className="mt-4 text-sm leading-7 text-muted-foreground">
            {section.subtitle}
          </p>
          <div className="mt-6">
            <Cta
              label={text(section.config, "cta_text", "Shop the brand")}
              href={text(section.config, "cta_link", "#shop")}
              className="h-11 rounded-none bg-foreground px-5 text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandsSection({ section, brands }: { section: PageSection; brands: Brand[] }) {
  const s = resolveSectionStyle(section);
  const ids = sectionBrandIds(section.config);
  const selected = ids.length > 0 ? brands.filter((brand) => ids.includes(brand.id)) : brands;
  if (selected.length === 0) return null;

  return (
    <section style={s.wrapper} className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 md:px-14">
      <SectionHeader section={section} s={s} eyebrow="Brands" fallbackTitle="THE BRANDS" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {selected.map((brand) => (
          <a
            key={brand.id}
            href="/#shop"
            className="group flex min-h-[280px] flex-col items-center justify-center gap-3 border border-border bg-secondary/40 p-5 transition-colors hover:bg-secondary"
          >
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                loading="lazy"
                className="max-h-48 w-auto max-w-full object-contain"
              />
            ) : (
              <span className="font-display text-7xl font-bold">
                {brand.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{brand.name}</span>
            {brand.productCount ? (
              <span className="text-[10px] text-muted-foreground">
                {brand.productCount} {brand.productCount === 1 ? "piece" : "pieces"}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
