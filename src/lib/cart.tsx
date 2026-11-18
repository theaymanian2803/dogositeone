import { createContext, useContext, useState, type ReactNode } from "react";

import type { Product } from "./storefront";

export type BagItem = {
  product: Product;
  size: string;
  quantity: number;
};

type CartContextValue = {
  bag: BagItem[];
  bagCount: number;
  bagTotal: number;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  addToBag: (product: Product, size: string) => void;
  updateQuantity: (productId: string, size: string, change: number) => void;
  clearBag: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<BagItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);

  function addToBag(product: Product, size: string) {
    setBag((current) => {
      const existing = current.find((item) => item.product.id === product.id && item.size === size);
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { product, size, quantity: 1 }];
    });
    setBagOpen(true);
  }

  function updateQuantity(productId: string, size: string, change: number) {
    setBag((current) =>
      current
        .map((item) =>
          item.product.id === productId && item.size === size
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function clearBag() {
    setBag([]);
  }

  const bagCount = bag.reduce((total, item) => total + item.quantity, 0);
  const bagTotal = bag.reduce((total, item) => total + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        bag,
        bagCount,
        bagTotal,
        bagOpen,
        setBagOpen,
        addToBag,
        updateQuantity,
        clearBag,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>.");
  return context;
}
