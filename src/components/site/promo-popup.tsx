import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StorePopup } from "@/lib/store-settings";

export function PromoPopup({ popup }: { popup: StorePopup }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!popup.enabled) return;
    const key = `pace_popup_${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    const timer = setTimeout(() => setOpen(true), Math.max(0, popup.delaySeconds) * 1000);
    return () => clearTimeout(timer);
  }, [popup.enabled, popup.delaySeconds]);

  if (!popup.enabled) return null;

  function close() {
    localStorage.setItem(`pace_popup_${new Date().toDateString()}`, "1");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="max-w-md rounded-none p-0">
        <div className="border-b border-border px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
            Welcome to PetPals
          </p>
          <DialogHeader className="mt-2">
            <DialogTitle className="font-display text-3xl font-bold leading-none">
              {popup.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-5">{popup.body}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          {popup.code && (
            <p className="border border-dashed border-foreground px-3 py-2 text-center font-mono text-sm font-bold tracking-[0.14em]">
              {popup.code}
            </p>
          )}
          <Button
            asChild
            onClick={close}
            className="mt-4 h-11 w-full rounded-none bg-foreground text-[10px] font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            <Link to="/" hash="shop">
              Shop the collection <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
