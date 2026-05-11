import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Moon,
  Package,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import { toast } from "@/components/ui/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { formatStorePrice } from "@/lib/store-catalog";
import { createPageUrl } from "@/utils";

const iconByCategory = {
  "Daily Tools": Package,
  "Study Books": BookOpen,
  "Study Aids": Sparkles,
  Bundles: ShoppingBag,
};

export default function Store() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["store-products"],
    queryFn: api.listStoreProducts,
  });

  const checkoutMutation = useMutation({
    mutationFn: (productId) => api.createStoreCheckout(productId),
    onSuccess: (payload) => {
      if (payload?.url) {
        window.location.assign(payload.url);
        return;
      }
      toast({
        title: "Checkout unavailable",
        description: "The store could not open checkout right now.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to start checkout",
        description: error.message || "Please try again in a moment.",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (sessionId) => api.confirmStoreCheckout(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      toast({
        title: "Order confirmed",
        description: "Your purchase was linked to your account.",
      });
      navigate(createPageUrl("Store"), { replace: true });
    },
    onError: (error) => {
      toast({
        title: "Order received",
        description:
          error.message || "We received your order, but we could not refresh the account record yet.",
      });
      navigate(createPageUrl("Store"), { replace: true });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const storeState = params.get("store");
    const sessionId = params.get("session_id");

    if (storeState === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "Your order was not completed.",
      });
      navigate(createPageUrl("Store"), { replace: true });
      return;
    }

    if (storeState === "success") {
      if (isAuthenticated && sessionId && !confirmMutation.isPending) {
        confirmMutation.mutate(sessionId);
        return;
      }

      toast({
        title: "Order received",
        description: "Thanks. Your checkout completed successfully.",
      });
      navigate(createPageUrl("Store"), { replace: true });
    }
  }, [location.search, isAuthenticated, navigate, confirmMutation]);

  const products = data?.products || [];
  const isStripeEnabled = Boolean(data?.stripe_enabled);
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-foreground dark:bg-background">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1E5EFF]">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg">RBT</span>
              <span className="truncate text-base font-bold text-[#1E5EFF] sm:text-lg">Genius</span>
              <Sparkles className="h-3.5 w-3.5 text-[#FFB800]" />
            </div>
          </Link>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            <Link to={isAuthenticated ? createPageUrl("Dashboard") : "/"}>
              <Button variant="outline" className="rounded-xl px-3 text-sm sm:px-4 sm:text-base">
                {isAuthenticated ? "Dashboard" : "Back Home"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-xs font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/10 dark:text-[#8EB0FF] sm:text-sm">
              <ShoppingBag className="h-4 w-4" />
              RBT Store
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.96] text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
              Tools, books, and study extras for everyday RBT work.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl">
              A simple storefront for practical RBT gear, study books, and review tools. You do not need a membership to order, but if you are signed in we will also keep the purchase on your account.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-[#1E5EFF]/15 dark:bg-[#0B1628] dark:text-slate-300"
                >
                  {category}
                </span>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="mt-7 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Signed-in purchases will also appear in your payment history.
              </div>
            ) : (
              <div className="mt-7 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628] dark:text-slate-300">
                You can buy as a guest. If you want the purchase tied to your member account, sign in first.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.25)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Store note
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                  Simple checkout
                </h2>
              </div>
              <Truck className="h-8 w-8 text-[#1E5EFF]" />
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>Use the store without a membership.</p>
              <p>If you are already signed in, we keep a cleaner record of your order.</p>
              <p>Billing is handled securely with Stripe.</p>
            </div>
          </div>
        </section>

        {!isStripeEnabled ? (
          <div className="mt-10 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Store checkout is not configured yet. The page is ready, but Stripe still needs to be available for live product orders.
          </div>
        ) : null}

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const CategoryIcon = iconByCategory[product.category] || ShoppingBag;
            const isLoadingThis = checkoutMutation.isPending && checkoutMutation.variables === product.id;

            return (
              <article
                key={product.id}
                className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.25)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E5EFF]/10 text-[#1E5EFF] dark:bg-[#1E5EFF]/14 dark:text-[#8EB0FF]">
                    <CategoryIcon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-[#1E5EFF]/15 dark:bg-[#0D1628] dark:text-slate-400">
                    {product.badge}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {product.category}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                    {product.name}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {product.summary}
                  </p>
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {formatStorePrice(product.price_cents)}
                  </span>
                  <span className="mb-1 text-sm text-slate-400">one-time</span>
                </div>

                <ul className="mt-5 space-y-3">
                  {product.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1E5EFF]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-8 rounded-2xl bg-[#1E5EFF] py-6 text-base hover:bg-[#1E5EFF]/90"
                  onClick={() => checkoutMutation.mutate(product.id)}
                  disabled={!isStripeEnabled || checkoutMutation.isPending}
                >
                  {isLoadingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy now"}
                </Button>
              </article>
            );
          })}
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
