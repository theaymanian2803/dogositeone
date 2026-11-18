export { defaultStoreSettings as defaultSettings } from "@/lib/store-settings";

const heroImage =
  "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?q=80&w=1470&auto=format&fit=crop";

export const defaultSections: Array<{
  key: string;
  type: string;
  title: string;
  subtitle: string;
  image: string;
  visible: number;
  sort: number;
  config: Record<string, unknown>;
}> = [
  {
    key: "hero_main",
    type: "hero",
    title: "Everything Your\nPet Needs",
    subtitle: "Premium nutrition crafted for your best friends.",
    image: heroImage,
    visible: 1,
    sort: 0,
    config: {
      eyebrow: "Free delivery over 500 MAD",
      description:
        "Wholesome food, thoughtful toys and everyday essentials for happy dogs and cats — delivered with care.",
      cta_text: "Shop the collection",
      cta_link: "#shop",
      caption: "Featured / 001",
      featured_id: "dog-chew-toy-beef-bone-9sl2",
    },
  },
  {
    key: "product_grid_main",
    type: "product_grid",
    title: "THE PET EDIT",
    subtitle: "Considered essentials. Everyday happiness. Pick your favourite.",
    image: "",
    visible: 1,
    sort: 1,
    config: {
      eyebrow: "The lineup",
      description: "Food, toys, beds and grooming essentials for happy pets.",
      filter: "all",
    },
  },
  {
    key: "promo_main",
    type: "promo",
    title: "FOOD THEY COME RUNNING FOR",
    subtitle: "Wholesome recipes, gentle on sensitive stomachs.",
    image:
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=1600&auto=format&fit=crop",
    visible: 1,
    sort: 2,
    config: {
      eyebrow: "PetPals / Everyday essentials",
      cta_text: "Shop food",
      cta_link: "/shop?category=foods",
    },
  },
  {
    key: "categories_main",
    type: "categories",
    title: "SHOP BY CATEGORY",
    subtitle: "Find the right everyday essential for your pet.",
    image: "",
    visible: 1,
    sort: 3,
    config: {
      eyebrow: "Browse",
    },
  },
  {
    key: "reviews_main",
    type: "reviews",
    title: "WHAT CUSTOMERS SAY",
    subtitle: "Real reviews from happy pet parents.",
    image: "",
    visible: 1,
    sort: 4,
    config: {
      eyebrow: "Client notes",
    },
  },
];

export const defaultPages: Array<{ key: string; title: string; body: string }> = [
  {
    key: "about",
    title: "About PetPals",
    body: "PetPals is a small pet store built around one idea: better everyday essentials for dogs and cats. Thoughtful food, durable toys, comfortable beds and grooming that makes life easier.",
  },
  {
    key: "shipping",
    title: "Shipping",
    body: "Free delivery on orders over 500 MAD. Below that, delivery is 50 MAD. Orders are prepared in 1–2 working days and delivered within 24 hours in Casablanca and Marrakech.",
  },
  {
    key: "returns",
    title: "Returns",
    body: "Return unused products within 30 days in their original packaging. Contact the store to arrange a return or exchange.",
  },
  {
    key: "faq",
    title: "FAQ",
    body: "Food and treats are selected for everyday nutrition. If your pet has allergies, check the ingredients and ask your vet. Beds and toys are easy to clean and built for daily use.",
  },
  {
    key: "contact",
    title: "Contact",
    body: "Questions about an order or a product? Write to hello@petpals.com or call 0694784176, Monday to Saturday, 9:00–18:00.",
  },
];
