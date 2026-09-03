import { Link } from "react-router-dom";
import heroPets from "@/assets/hero-pets.jpg";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";

export function Hero() {
  const { settings } = useSettings();
  const { t } = useI18n();
  return (
    <section className="relative min-h-[440px] overflow-hidden bg-hero md:min-h-[560px]">
      <img
        src={settings.hero_image || heroPets}
        alt={settings.hero_image ? settings.brand_name : "Puppy and kitten with bowl of food"}
        width={1024}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative mx-auto flex min-h-[440px] max-w-7xl items-center px-6 py-12 md:min-h-[560px] md:py-20">
        <div className="max-w-xl rounded-2xl bg-hero/80 p-6 backdrop-blur-md md:p-8">
          <p className="text-xl font-semibold text-accent md:text-2xl">{settings.hero_badge}</p>
          <h1 data-tour="home-hero" className="mt-3 text-5xl leading-tight md:text-6xl">
            {settings.hero_title.split("\n").map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <div className="squiggle mt-5" />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            {settings.hero_subtitle}
          </p>
          <Link to="/shop" data-tour="home-shop" className="btn-dark mt-8 inline-flex">
            {t("hero.shop")}
          </Link>
        </div>
      </div>
    </section>
  );
}
