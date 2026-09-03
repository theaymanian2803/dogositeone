import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";
import { CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";

export default function OrderConfirmed() {
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const phone = searchParams.get("phone") ?? "";

  useEffect(() => {
    document.title = "Order confirmed — PetPals";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">{t("confirmed.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("confirmed.message", { phone: phone || t("confirmed.you") })}
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <Link
            to={`/track${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <PackageSearch className="h-4 w-4" /> {t("confirmed.track")}
          </Link>
          <Link
            to="/shop"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.98]"
          >
            {t("confirmed.continue")}
          </Link>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            {t("confirmed.whatsapp")}{" "}
            <Link to="/contact" className="text-accent hover:underline">
              {t("confirmed.messageUs")}
            </Link>{" "}
            <MessageCircle className="inline h-3 w-3" />
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
