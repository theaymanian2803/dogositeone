import { Link } from "react-router-dom";
import promo from "@/assets/promo-pets.jpg";
import food from "@/assets/product-food.jpg";
import { Star } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="relative overflow-hidden bg-promo">
      <img
        src={promo}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-end px-6 py-16 md:py-24">
        <div className="grid w-full max-w-2xl items-center gap-6 rounded-2xl bg-promo/95 p-6 backdrop-blur-sm md:grid-cols-2 md:p-10">
          <div className="rounded-xl bg-white p-4">
            <img
              src={food}
              alt="Chicken flavor food"
              loading="lazy"
              width={800}
              height={800}
              className="aspect-square w-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-2xl font-bold md:text-3xl">Chicken Flavor Food</h3>
            <div className="mt-2 flex gap-0.5 text-accent">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="mt-3">
              <span className="text-sm text-muted-foreground line-through">$60</span>
              <span className="ml-2 text-2xl font-bold">$40 Only</span>
            </p>
            <Link to="/category/foods" className="btn-dark mt-5 inline-flex">
              Shop Food
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
