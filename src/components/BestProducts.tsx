import { Link } from "react-router-dom";
import biscuit from "@/assets/product-biscuit.jpg";
import bed from "@/assets/product-bed.jpg";
import food from "@/assets/product-food.jpg";
import groom from "@/assets/product-groom.jpg";

const items = [
  {
    name: "Chicken Flavoured Biscuit",
    price: "80.00 MAD",
    img: biscuit,
    badge: "-46%",
    to: "/category/foods",
  },
  { name: "Ultra Soft Puppy Bed", price: "155.00 MAD", img: bed, to: "/category/bed" },
  { name: "Sea Fish Dry Cat Food", price: "120.00 MAD", img: food, to: "/category/foods" },
  { name: "Soft Pined Pet's Grooming Brush", price: "120.00 MAD", img: groom, to: "/category/groom" },
];

export function BestProducts() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl">The Best Pet Products</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Hand-picked essentials your pet will love — from nourishing meals to cozy beds and
          grooming must-haves, curated for happy, healthy companions.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
        {items.map((p) => (
          <Link key={p.name} to={p.to} className="group">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
              {p.badge && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                  {p.badge}
                </span>
              )}
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                width={800}
                height={800}
                className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-sm font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
