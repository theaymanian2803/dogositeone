import { Link } from "react-router-dom";
import heroPets from "@/assets/hero-pets.jpg";

export function Hero() {
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
            Get 40% Off On Your First Order
          </p>
          <h1 className="mt-3 text-5xl leading-tight md:text-6xl">
            Puppy And Cat
            <br />
            Food
          </h1>
          <div className="squiggle mt-5" />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Premium nutrition crafted for your best friends. Wholesome ingredients, irresistible
            flavor, and tail-wagging happiness in every bowl.
          </p>
          <Link to="/shop" className="btn-dark mt-8 inline-flex">
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
