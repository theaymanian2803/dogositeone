import { useState } from "react";

export function ProductGallery({
  images,
  alt,
  badge,
  pieceNumber,
  catalogSize,
}: {
  images: string[];
  alt: string;
  badge?: string | undefined;
  pieceNumber: string;
  catalogSize: number;
}) {
  const gallery = images.filter(Boolean).slice(0, 4);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  if (gallery.length === 0) return null;

  return (
    <div className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
      <div className="relative overflow-hidden bg-secondary">
        <div
          className="relative aspect-[4/5] max-h-[70vh] w-full cursor-zoom-in overflow-hidden"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => {
            setZoomed(false);
            setOrigin("50% 50%");
          }}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setOrigin(
              `${((event.clientX - rect.left) / rect.width) * 100}% ${
                ((event.clientY - rect.top) / rect.height) * 100
              }%`,
            );
          }}
        >
          <img
            src={gallery[active]}
            alt={alt}
            width={1024}
            height={1280}
            fetchPriority="high"
            style={{ transformOrigin: origin }}
            className={`size-full object-cover object-top transition-transform duration-300 will-change-transform ${
              zoomed ? "scale-[1.9]" : "scale-100"
            }`}
          />
          <span className="pointer-events-none absolute bottom-3 left-3 bg-background/90 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] sm:bottom-4 sm:left-4">
            Hover to zoom
          </span>
        </div>
        {badge && (
          <span className="absolute left-4 top-4 bg-background px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] sm:left-6 sm:top-6">
            {badge}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-4 right-4 bg-background px-3 py-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] sm:bottom-6 sm:right-6"
        >
          PetPals / {pieceNumber}
        </span>
      </div>

      {gallery.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Product images">
          {gallery.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => {
                setActive(index);
                setZoomed(false);
              }}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === active}
              className={`relative overflow-hidden border bg-secondary transition-colors ${
                index === active ? "border-foreground" : "border-border hover:border-foreground/40"
              }`}
            >
              <img src={src} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>Everyday essentials / PetPals</span>
        <span>
          Product image / {pieceNumber} of {String(catalogSize).padStart(2, "0")}
          {gallery.length > 1 ? ` · ${active + 1}/${gallery.length}` : ""}
        </span>
      </div>
    </div>
  );
}
