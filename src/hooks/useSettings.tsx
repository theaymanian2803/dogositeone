import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { turso } from "@/integrations/turso/client";

export const defaultSettings = {
  brand_name: "PetPals",
  tagline: "Everything your furry friend needs, delivered with love to your door.",
  contact_email: "hello@petpals.com",
  contact_phone: "+1 (555) 012-3456",
  whatsapp_number: "",
  contact_address: "124 Whisker Lane, Portland, OR 97205",
  support_hours: "Mon–Sat, 9am–6pm",
  hero_badge: "Get 40% Off On Your First Order",
  hero_title: "Puppy And Cat\nFood",
  hero_subtitle:
    "Premium nutrition crafted for your best friends. Wholesome ingredients, irresistible flavor, and tail-wagging happiness in every bowl.",
  promo_title: "Chicken Flavor Food",
  promo_old_price: "600 MAD",
  promo_price: "400 MAD",
} as const;

export type Settings = { [K in keyof typeof defaultSettings]: string };

type SettingsContextValue = {
  settings: Settings;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings as Settings,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings as Settings);

  const refresh = useCallback(async () => {
    try {
      const rs = await turso.execute("SELECT key, value FROM settings");
      const map = Object.fromEntries(
        rs.rows.map((r) => [String(r.key), String(r.value ?? "")]),
      ) as Partial<Settings>;
      setSettings({ ...defaultSettings, ...map });
    } catch {
      setSettings(defaultSettings as Settings);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}