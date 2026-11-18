import { Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/commerce";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";

export function BagSheet() {
  const { bag, bagCount, bagTotal, bagOpen, setBagOpen, updateQuantity } = useCart();

  return (
    <Sheet open={bagOpen} onOpenChange={setBagOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 rounded-none p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-6 py-5 pr-14 text-left">
          <SheetTitle className="font-display text-3xl font-bold">
            YOUR BAG <span className="text-hot-pink">({bagCount})</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Your picks from the PetPals collection.
          </SheetDescription>
        </SheetHeader>
        {bag.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-6">
            {bag.map((item) => (
              <div
                key={`${item.product.id}-${item.size}`}
                className="flex gap-4 border-b border-border py-5"
              >
                <img
                  src={item.product.image}
                  alt=""
                  width={768}
                  height={960}
                  className="h-28 w-22 bg-secondary object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.product.color} · Size {item.size}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatMoney(item.product.price * item.quantity, "MAD")}
                    </span>
                  </div>
                  <div className="flex w-fit items-center border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove one ${item.product.name}`}
                      onClick={() => updateQuantity(item.product.id, item.size, -1)}
                      className="size-8 rounded-none"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-7 text-center text-xs" aria-live="polite">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Add one ${item.product.name}`}
                      onClick={() => updateQuantity(item.product.id, item.size, 1)}
                      className="size-8 rounded-none"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="size-7 text-hot-pink" />
            <p className="mt-4 font-display text-2xl font-bold">NOTHING IN HERE. YET.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Your next everyday set is a scroll away.
            </p>
            <Button asChild onClick={() => setBagOpen(false)} className="mt-5 rounded-none text-xs">
              <Link to="/" hash="shop">
                Explore the collection <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
        {bag.length > 0 && (
          <SheetFooter className="mt-auto border-t border-border px-6 py-5 sm:flex-col sm:space-x-0">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(bagTotal, "MAD")}</span>
            </div>
            <Button
              asChild
              className="h-12 w-full rounded-none bg-foreground text-xs uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
            >
              <Link to="/checkout" onClick={() => setBagOpen(false)}>
                Checkout - {formatMoney(bagTotal, "MAD")}
              </Link>
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Orders are recorded for this demo. No payment is collected.
            </p>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
