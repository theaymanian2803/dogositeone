import { useState } from "react";
import { Database, X } from "lucide-react";
import { dismissSetupBanner, shouldShowSetupBanner } from "@/lib/tursoConfig";
import { useOpenSettingsDialog } from "@/lib/settingsDialog";

export function DemoBanner() {
  const [visible, setVisible] = useState(shouldShowSetupBanner());
  const openSettings = useOpenSettingsDialog();

  if (!visible) return null;

  return (
    <div className="border-b border-border bg-accent/5 px-4 py-1.5 sm:px-6 lg:px-20">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <Database className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="flex-1">Demo store — connect your own database to keep your data.</span>
        <button
          data-tour="connect-button"
          onClick={openSettings}
          className="inline-flex h-7 shrink-0 items-center rounded-full bg-accent px-3 text-[11px] font-semibold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Connect
        </button>
        <button
          onClick={() => {
            dismissSetupBanner();
            setVisible(false);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
