import { MessageCircle } from "lucide-react";

import { useT } from "@/lib/locale";
import type { StoreWhatsApp } from "@/lib/store-settings";
import { chatHref, whatsappHref } from "@/lib/whatsapp";

export function WhatsAppFloat({ settings }: { settings: StoreWhatsApp }) {
  const { t } = useT();
  if (!settings.enabled) return null;
  const href = chatHref(settings);
  if (href === "#") return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("wa.chat")}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-background shadow-lg transition-colors hover:bg-hot-pink hover:text-foreground"
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{settings.buttonLabel || t("wa.chat")}</span>
    </a>
  );
}

export function WhatsAppOrderLink({
  settings,
  message,
  label,
  className,
}: {
  settings: StoreWhatsApp;
  message: string;
  label?: string;
  className?: string;
}) {
  const { t } = useT();
  if (!settings.enabled) return null;
  const href = whatsappHref(settings.number, message);
  if (href === "#") return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex h-11 items-center justify-center gap-2 border border-foreground px-5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-hot-pink hover:text-foreground"
      }
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      {label ?? t("wa.orderOnWhatsApp")}
    </a>
  );
}
