import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";

export function ExtraBanner() {
  const { settings } = useSettings();
  if (!settings.banner_image) return null;
  const buttonText = settings.banner_button_text.trim() || "Shop Now";
  const buttonLink = settings.banner_button_link.trim() || "/shop";
  return (
    <section className="relative overflow-hidden bg-promo">
      <img
        src={settings.banner_image}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-start px-6 py-16 md:py-24">
        <div className="max-w-xl rounded-2xl bg-background/90 p-6 backdrop-blur-sm md:p-10">
          {settings.banner_title && (
            <h3 className="text-2xl font-bold md:text-3xl">{settings.banner_title}</h3>
          )}
          {settings.banner_subtitle && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {settings.banner_subtitle}
            </p>
          )}
          <Link to={buttonLink} className="btn-dark mt-6 inline-flex">
            {buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
