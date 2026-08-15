import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/hooks/useCart";
import { SettingsProvider } from "@/hooks/useSettings";
import Index from "@/pages/Index";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Product from "@/pages/Product";
import Category from "@/pages/Category";
import Shop from "@/pages/Shop";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Account from "@/pages/Account";
import InfoPage from "@/pages/InfoPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>
          <SettingsProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/category/:category" element={<Category />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="/:page" element={<InfoPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          </SettingsProvider>
        </CartProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
