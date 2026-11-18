export type StoreBranding = {
  name: string;
  logoText: string;
  announcement: string;
};

export type StoreContact = {
  email: string;
  phone: string;
  address: string;
  hours: string;
};

export type StoreFooter = {
  socials: Array<{ label: string; href: string }>;
  companyLinks: Array<{ label: string; href: string }>;
  note: string;
};

export type DeliveryZone = {
  city: string;
  fee: number;
  freeThreshold?: number;
};

export type StoreShipping = {
  flatRate: number;
  freeThreshold: number;
  currency: string;
  codLabel: string;
  minOrder: number;
  deliveryTime: string;
  zones: DeliveryZone[];
};

export type StoreWhatsApp = {
  enabled: boolean;
  /** Customer-facing shop number, international digits. */
  number: string;
  /** Number that receives new-order alerts (Meta Cloud API). */
  ownerNumber: string;
  buttonLabel: string;
  orderMessage: string;
};

export type StoreLocale = {
  language: "en" | "fr";
};

export type StoreReviews = {
  requireApproval: boolean;
};

export type StoreTheme = {
  displayFont: string;
  bodyFont: string;
  accent: string;
};

export type StorePopup = {
  enabled: boolean;
  title: string;
  body: string;
  code: string;
  delaySeconds: number;
};

export type StoreMegamenu = {
  enabled: boolean;
  featuredCategory: string;
};

export type StoreMedia = {
  /** auto: R2 when configured, else the database. */
  storage: "auto" | "r2" | "database";
};

export type StoreSettings = {
  store_branding: StoreBranding;
  store_contact: StoreContact;
  store_footer: StoreFooter;
  store_shipping: StoreShipping;
  store_whatsapp: StoreWhatsApp;
  store_locale: StoreLocale;
  store_reviews: StoreReviews;
  store_theme: StoreTheme;
  store_popup: StorePopup;
  store_megamenu: StoreMegamenu;
  store_media: StoreMedia;
};

export const defaultStoreSettings: StoreSettings = {
  store_media: { storage: "auto" },
  store_branding: {
    name: "PetPals",
    logoText: "PetPals",
    announcement: "Free delivery over 500 MAD — cash on delivery",
  },
  store_contact: {
    email: "hello@petpals.com",
    phone: "0694784176",
    address: "Mhamid 7, Marrakech",
    hours: "Mon–Sat, 9–18",
  },
  store_footer: {
    socials: [{ label: "Instagram", href: "https://instagram.com" }],
    companyLinks: [
      { label: "Shipping", href: "/pages/shipping" },
      { label: "Returns", href: "/pages/returns" },
      { label: "About", href: "/pages/about" },
      { label: "Contact", href: "/pages/contact" },
    ],
    note: "Thoughtful food, toys and everyday essentials for happy pets.",
  },
  store_shipping: {
    flatRate: 50,
    freeThreshold: 500,
    currency: "MAD",
    codLabel: "Cash on delivery",
    minOrder: 0,
    deliveryTime: "24 hours",
    zones: [],
  },
  store_whatsapp: {
    enabled: false,
    number: "",
    ownerNumber: "",
    buttonLabel: "Order on WhatsApp",
    orderMessage: "Hello! I'd like to order:",
  },
  store_locale: { language: "en" },
  store_reviews: { requireApproval: true },
  store_theme: {
    displayFont: "Poppins",
    bodyFont: "Poppins",
    accent: "#ea8a3a",
  },
  store_popup: {
    enabled: false,
    title: "A little welcome.",
    body: "Join the PetPals list for seasonal offers.",
    code: "PETPALS",
    delaySeconds: 4,
  },
  store_megamenu: {
    enabled: true,
    featuredCategory: "dogs",
  },
};

export const THEME_FONTS = [
  { label: "Poppins", display: "Poppins", body: "Poppins" },
  { label: "Fraunces + Manrope", display: "Fraunces", body: "Manrope" },
  { label: "Syne + DM Sans", display: "Syne", body: "DM Sans" },
  { label: "Space Grotesk + Inter", display: "Space Grotesk", body: "Inter" },
  { label: "Archivo + Work Sans", display: "Archivo", body: "Work Sans" },
  { label: "Bebas Neue + DM Sans", display: "Bebas Neue", body: "DM Sans" },
] as const;

export const THEME_FONT_FAMILIES = [
  "Poppins",
  "Fraunces",
  "Manrope",
  "Syne",
  "DM Sans",
  "Space Grotesk",
  "Inter",
  "Archivo",
  "Work Sans",
  "Bebas Neue",
] as const;
