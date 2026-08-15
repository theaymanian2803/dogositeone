import { Link } from "react-router-dom";
import heroPets from "@/assets/hero-pets.jpg";
import { useSettings } from "@/hooks/useSettings";

export function Hero() {
  const { settings } = useSettings();
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 md:grid-cols-2 md:py-20">
        <div className="relative order-2 md:order-1">
          <div className="absolute inset-0 -z-10 mx-auto h-[420px] w-[420px] rounded-full bg-white/40 blur-2xl" />
          <img
            src={heroPets}
            alt="Puppy and kitten with bowl of food"
            width={1024}
            height={1024}
            className="mx-auto w-full max-w-md"
          />
        </div>

        <div className="order-1 md:order-2 md:pl-6">
          <p className="text-xl font-semibold text-accent md:text-2xl">
            {settings.hero_badge}
          </p>
          <h1 className="mt-3 text-5xl leading-tight md:text-6xl">
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
          <Link to="/shop" className="btn-dark mt-8 inline-flex">
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
