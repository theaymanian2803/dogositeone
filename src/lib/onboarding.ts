export const ONBOARDING_KEY = "pace_onboarded";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  target: string | null;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "WELCOME TO YOUR STORE.",
    body: "This is the admin. Five quick stops: the dashboard, page controls, products, settings and setup. The storefront stays live the whole time.",
    href: null,
    target: null,
  },
  {
    id: "dashboard",
    title: "DASHBOARD",
    body: "Revenue, orders, customers, low stock and the latest orders at a glance.",
    href: "/admin",
    target: '[data-tour="admin-dashboard"]',
  },
  {
    id: "page-controls",
    title: "PAGE CONTROLS",
    body: "The homepage is built from these sections. Add, edit, hide or reorder them and the store updates immediately.",
    href: "/admin/page-controls",
    target: '[data-tour="page-controls"]',
  },
  {
    id: "products",
    title: "PRODUCTS",
    body: "Your catalog. The prices, stock and copy here are exactly what the storefront and checkout use.",
    href: "/admin/products",
    target: '[data-tour="products"]',
  },
  {
    id: "settings",
    title: "SETTINGS",
    body: "Branding, contact details, shipping, reviews, the promo popup and footer all live here.",
    href: "/admin/settings",
    target: '[data-tour="settings"]',
  },
  {
    id: "setup",
    title: "SETUP",
    body: "Connect your own database, change the owner credentials and work the launch checklist. You can restart this tour from here.",
    href: "/admin/setup",
    target: '[data-tour="setup"]',
  },
  {
    id: "done",
    title: "THAT'S THE TOUR.",
    body: "The storefront is always public; admin changes are live. Everything else lives in the sidebar.",
    href: null,
    target: null,
  },
];

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // Tour state is a nicety; storage can be unavailable.
  }
}

export function restartOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
