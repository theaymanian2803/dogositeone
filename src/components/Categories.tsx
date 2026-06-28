import { Link } from "react-router-dom";
import groom from "@/assets/product-groom.jpg";
import collar from "@/assets/product-collar.jpg";
import bed from "@/assets/product-bed.jpg";
import bone from "@/assets/product-bone.jpg";
import food from "@/assets/product-food.jpg";

const items = [
  { name: "Groom", img: groom, to: "/category/groom" },
  { name: "Collar", img: collar, to: "/category/collar" },
  { name: "Bed", img: bed, to: "/category/bed" },
  { name: "Retractable Leash", img: bone, to: "/category/dogs" },
  { name: "Foods", img: food, to: "/category/foods" },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="text-center text-4xl md:text-5xl">Pets Products</h2>
      <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <Link key={it.name} to={it.to} className="group flex flex-col items-center text-center">
            <div className="grid aspect-square w-full place-items-center rounded-full bg-card transition-transform group-hover:-translate-y-1 group-hover:shadow-lg">
              <img
                src={it.img}
                alt={it.name}
                loading="lazy"
                width={800}
                height={800}
                className="h-3/4 w-3/4 object-contain"
              />
            </div>
            <span className="mt-4 text-sm font-semibold">{it.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
