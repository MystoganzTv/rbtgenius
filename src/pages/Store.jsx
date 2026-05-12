import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  BookOpen,
  Boxes,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Moon,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import { toast } from '@/components/ui/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { formatStorePrice } from '@/lib/store-catalog';
import { createPageUrl } from '@/utils';

const CATEGORY_META = {
  all: { label: 'Todos', icon: ShoppingBag },
  'Daily Tools': { label: 'Herramientas', icon: Package },
  'Study Books': { label: 'Libros', icon: BookOpen },
  'Study Aids': { label: 'Estudio', icon: Sparkles },
  Bundles: { label: 'Bundles', icon: Boxes },
};

const PRODUCT_PRESENTATION = {
  'rbt-session-clipboard-kit': {
    badge: 'Popular',
    summary:
      'Clipboard con checklist, notas de sesión y prompts para recolección de datos. Todo listo para tu día a día.',
    tags: ['Checklist incluido', 'Formato diario', 'Portátil'],
    gradient: 'from-slate-100 via-white to-slate-200',
    accent: 'bg-[#F59E0B]',
    image: '/1.png',
  },
  'reinforcer-pouch-essentials': {
    badge: 'Nuevo',
    summary:
      'Bolsa compacta con tokens, visuales, timer y mini herramientas para cada sesión terapéutica.',
    tags: ['Tokens incluidos', 'Compacta', 'Fácil de llevar'],
    gradient: 'from-rose-50 via-white to-sky-50',
    accent: 'bg-[#4F7CFF]',
    image: '/2.png',
  },
  'rbt-rapid-review-book': {
    badge: 'Popular',
    summary:
      'Libro de repaso enfocado en conceptos clave del RBT con explicaciones claras y prompts de estudio.',
    tags: ['Conceptos clave', 'Bilingüe', 'Explicaciones claras'],
    gradient: 'from-slate-100 via-white to-slate-200',
    accent: 'bg-[#F59E0B]',
    image: '/3.png',
  },
  'mock-exam-workbook': {
    badge: 'Nuevo',
    summary:
      'Cuaderno de práctica con exámenes simulados, revisión de respuestas y ejercicios de confianza.',
    tags: ['Exámenes simulados', 'Notas de revisión', 'Prep completa'],
    gradient: 'from-indigo-50 via-white to-slate-100',
    accent: 'bg-[#4F7CFF]',
    image: '/4.png',
  },
  'visual-study-card-bundle': {
    badge: 'Popular',
    summary:
      'Tarjetas de memoria con conceptos clave y ayudas visuales para memorizar más rápido antes del examen.',
    tags: ['170+ tarjetas', 'Memorización rápida', 'Repaso final'],
    gradient: 'from-sky-50 via-white to-slate-100',
    accent: 'bg-[#F59E0B]',
    image: '/5.png',
  },
  'rbt-starter-study-pack': {
    badge: 'Oferta',
    summary:
      'Bundle completo que combina herramientas prácticas y material de estudio en un solo paquete con descuento.',
    tags: ['Todo incluido', 'Para principiantes', 'Ahorra $13'],
    compareAt: 5500,
    gradient: 'from-emerald-50 via-white to-sky-50',
    accent: 'bg-[#34C38F]',
    image: '/6.png',
  },
};


export default function Store() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productsRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data } = useQuery({
    queryKey: ['store-products'],
    queryFn: api.listStoreProducts,
  });

  const checkoutMutation = useMutation({
    mutationFn: productId => api.createStoreCheckout(productId),
    onSuccess: payload => {
      if (payload?.url) {
        window.location.assign(payload.url);
        return;
      }
      toast({
        title: 'Checkout unavailable',
        description: 'The store could not open checkout right now.',
      });
    },
    onError: error => {
      toast({
        title: 'Unable to start checkout',
        description: error.message || 'Please try again in a moment.',
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: sessionId => api.confirmStoreCheckout(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-data'] });
      toast({
        title: 'Order confirmed',
        description: 'Your purchase was linked to your account.',
      });
      navigate(createPageUrl('Store'), { replace: true });
    },
    onError: error => {
      toast({
        title: 'Order received',
        description:
          error.message ||
          'We received your order, but we could not refresh the account record yet.',
      });
      navigate(createPageUrl('Store'), { replace: true });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const storeState = params.get('store');
    const sessionId = params.get('session_id');

    if (storeState === 'cancelled') {
      toast({
        title: 'Checkout cancelled',
        description: 'Your order was not completed.',
      });
      navigate(createPageUrl('Store'), { replace: true });
      return;
    }

    if (storeState === 'success') {
      if (isAuthenticated && sessionId && !confirmMutation.isPending) {
        confirmMutation.mutate(sessionId);
        return;
      }

      toast({
        title: 'Order received',
        description: 'Thanks. Your checkout completed successfully.',
      });
      navigate(createPageUrl('Store'), { replace: true });
    }
  }, [location.search, isAuthenticated, navigate, confirmMutation]);

  const products = data?.products || [];
  const isStripeEnabled = Boolean(data?.stripe_enabled);

  const categoryTabs = useMemo(() => {
    const dynamic = Array.from(
      new Set(products.map(product => product.category)),
    ).map(category => ({
      key: category,
      ...(CATEGORY_META[category] || { label: category, icon: ShoppingBag }),
    }));

    return [{ key: 'all', ...CATEGORY_META.all }, ...dynamic];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(product => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const bundleProduct = useMemo(
    () => products.find(product => product.category === 'Bundles') || null,
    [products],
  );

  const handleCategorySelect = category => {
    setSelectedCategory(category);
    requestAnimationFrame(() => {
      productsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,124,255,0.08),_transparent_34%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_45%,#ffffff_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(79,124,255,0.14),_transparent_28%),linear-gradient(180deg,#08101f_0%,#091426_42%,#0b1628_100%)]'>
      <header className='border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/90'>
        <div className='mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-4 sm:px-6'>
          <Link to='/' className='flex min-w-0 items-center gap-2.5'>
            <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1E5EFF] shadow-[0_18px_36px_-18px_rgba(30,94,255,0.85)]'>
              <GraduationCap className='h-5 w-5 text-white' />
            </div>
            <div className='flex min-w-0 items-center gap-1'>
              <span className='truncate text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg'>
                RBT
              </span>
              <span className='truncate text-base font-bold text-[#1E5EFF] sm:text-lg'>
                Genius
              </span>
              <Sparkles className='h-3.5 w-3.5 text-[#FFB800]' />
            </div>
          </Link>

          <div className='flex flex-shrink-0 items-center gap-2 sm:gap-3'>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
              onClick={toggleTheme}>
              {isDark ? (
                <Sun className='h-[18px] w-[18px]' />
              ) : (
                <Moon className='h-[18px] w-[18px]' />
              )}
            </Button>
            <Link to={isAuthenticated ? createPageUrl('Dashboard') : '/'}>
              <Button
                variant='outline'
                className='rounded-xl px-3 text-sm sm:px-4 sm:text-base'>
                {isAuthenticated ? 'Dashboard' : 'Volver al inicio'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12'>
        <section className='grid gap-8'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-xs font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/10 dark:text-[#8EB0FF] sm:text-sm'>
              <ShoppingBag className='h-4 w-4' />
              RBT Store
            </div>
            <h1 className='mt-5 max-w-4xl font-jakarta text-4xl font-black leading-[1.05] text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-[5rem]'>
              Todo lo que necesitas{' '}
              <span className='relative inline-block pb-3'>
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400'>
                  para tu carrera RBT.
                </span>
                <svg className='absolute -bottom-1 left-0 w-full' viewBox='0 0 300 12' fill='none'>
                  <path d='M2 9 Q75 2 150 7 Q225 12 298 5' stroke='url(#gStore)' strokeWidth='3' strokeLinecap='round' fill='none'/>
                  <defs>
                    <linearGradient id='gStore' x1='0' y1='0' x2='300' y2='0' gradientUnits='userSpaceOnUse'>
                      <stop stopColor='#60a5fa'/>
                      <stop offset='1' stopColor='#a78bfa'/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            <p className='mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl'>
              Herramientas, libros y bundles diseñados para RBTs — compra como invitado o con tu cuenta.
            </p>

            <div className='mt-7 flex flex-wrap gap-3'>
              <div className='inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 dark:bg-[#0E1A31] dark:text-slate-200 dark:ring-[#1E5EFF]/15'>
                <ShieldCheck className='h-4 w-4 text-[#4F7CFF]' /> Pago seguro con Stripe
              </div>
              <div className='inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 dark:bg-[#0E1A31] dark:text-slate-200 dark:ring-[#1E5EFF]/15'>
                <ShoppingBag className='h-4 w-4 text-[#4F7CFF]' /> Sin membresía obligatoria
              </div>
            </div>
          </div>
        </section>

        {bundleProduct ? (
          <section className='mt-8 overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-sky-50 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] dark:border-[#34C38F]/18 dark:from-[#0B172B] dark:via-[#0E1A31] dark:to-[#0B1B2E]'>
            <div className='grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-9'>
              <div>
                <div className='inline-flex items-center gap-2 rounded-full bg-[#34C38F]/14 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#158A5E]'>
                  <BadgePercent className='h-4 w-4' /> Oferta Especial
                </div>
                <h2 className='mt-4 text-3xl font-black leading-tight text-slate-900 dark:text-slate-50 sm:text-4xl'>
                  Ahorra con nuestros Bundles
                </h2>
                <p className='mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg'>
                  Combina libros, tarjetas de estudio y herramientas diarias en
                  un solo paquete con descuento. Perfecto para quienes empiezan
                  su camino como RBT.
                </p>
                <div className='mt-6 flex flex-wrap items-center gap-4'>
                  <Button
                    className='rounded-2xl bg-[#1E5EFF] px-6 py-6 text-base font-semibold hover:bg-[#1E5EFF]/90'
                    onClick={() => handleCategorySelect('Bundles')}>
                    Ver Bundles <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                  <div className='text-sm text-slate-500 dark:text-slate-300'>
                    {PRODUCT_PRESENTATION[bundleProduct.id]?.compareAt ? (
                      <>
                        Antes{' '}
                        <span className='line-through'>
                          {formatStorePrice(
                            PRODUCT_PRESENTATION[bundleProduct.id].compareAt,
                          )}
                        </span>
                      </>
                    ) : (
                      <>Oferta activa por tiempo limitado</>
                    )}
                  </div>
                </div>
              </div>

              <div className='relative rounded-[1.8rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.25)] backdrop-blur dark:border-[#1E5EFF]/15 dark:bg-[#0E1A31]/92'>
                <div className='absolute right-5 top-5 rounded-full bg-[#34C38F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white'>
                  Bundle
                </div>
                <div className='grid grid-cols-[110px_1fr] items-center gap-4'>
                  <div className='flex h-28 w-full items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-emerald-50 to-sky-50'>
                    <Boxes className='h-10 w-10 text-[#1E5EFF]' />
                  </div>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500'>
                      Producto destacado
                    </p>
                    <h3 className='mt-2 text-2xl font-black text-slate-900 dark:text-slate-50'>
                      {bundleProduct.name}
                    </h3>
                    <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                      {PRODUCT_PRESENTATION[bundleProduct.id]?.summary ||
                        bundleProduct.summary}
                    </p>
                    <div className='mt-4 flex items-end gap-2'>
                      <span className='text-3xl font-black text-slate-900 dark:text-slate-50'>
                        {formatStorePrice(bundleProduct.price_cents)}
                      </span>
                      {PRODUCT_PRESENTATION[bundleProduct.id]?.compareAt ? (
                        <span className='pb-1 text-sm text-slate-400 line-through dark:text-slate-500'>
                          {formatStorePrice(
                            PRODUCT_PRESENTATION[bundleProduct.id].compareAt,
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!isStripeEnabled ? (
          <div className='mt-8 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'>
            Store checkout is not configured yet. The page is ready, but Stripe
            still needs to be available for live product orders.
          </div>
        ) : null}

        <section ref={productsRef} className='mt-10'>
          <div className='flex flex-col gap-5 rounded-[2rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_26px_80px_-50px_rgba(15,23,42,0.22)] dark:border-[#1E5EFF]/12 dark:bg-[#0B1628] lg:flex-row lg:items-center lg:justify-between lg:px-6'>
            <div>
              <h2 className='text-3xl font-black text-slate-900 dark:text-slate-50 sm:text-[2.6rem]'>
                Nuestros Productos
              </h2>
              <p className='mt-2 text-base text-slate-500 dark:text-slate-300'>
                {filteredProducts.length} productos disponibles
              </p>
            </div>
            <div className='flex flex-wrap gap-3'>
              {categoryTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = selectedCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    type='button'
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'border-[#4F7CFF] bg-[#4F7CFF] text-white shadow-[0_18px_38px_-24px_rgba(79,124,255,0.85)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#4F7CFF]/30 hover:text-[#1E5EFF] dark:border-[#1E5EFF]/12 dark:bg-[#0E1A31] dark:text-slate-300 dark:hover:border-[#4F7CFF]/35 dark:hover:text-[#8EB0FF]'
                    }`}>
                    <Icon className='h-4 w-4' />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
            {filteredProducts.map(product => {
              const presentation = PRODUCT_PRESENTATION[product.id] || {};
              const isLoadingThis =
                checkoutMutation.isPending &&
                checkoutMutation.variables === product.id;
              const categoryMeta = CATEGORY_META[product.category];

              return (
                <article
                  key={product.id}
                  className='group flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_-48px_rgba(15,23,42,0.28)] dark:border-[#1E5EFF]/12 dark:bg-[#0B1628] dark:hover:border-[#1E5EFF]/20'>
                  <div
                    className={`relative h-[260px] bg-gradient-to-br ${presentation.gradient || 'from-slate-100 to-white'} p-4 dark:from-[#0F1C34] dark:via-[#0B1628] dark:to-[#091221]`}>
                    {presentation.badge ? (
                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white ${presentation.accent || 'bg-[#4F7CFF]'}`}>
                        {presentation.badge}
                      </span>
                    ) : null}

                    <img
                      src={presentation.image}
                      alt={product.name}
                      className='h-full w-full object-cover rounded-[1.8rem]'
                    />
                  </div>

                  <div className='flex flex-1 flex-col px-6 pb-6 pt-5'>
                    <p className='text-sm font-semibold uppercase tracking-[0.12em] text-[#4F7CFF]'>
                      {categoryMeta?.label || product.category}
                    </p>
                    <h3 className='mt-2 text-[1.85rem] font-black leading-tight text-slate-900 dark:text-slate-50'>
                      {product.name}
                    </h3>
                    <p className='mt-3 text-[1.02rem] leading-8 text-slate-500 dark:text-slate-300'>
                      {presentation.summary || product.summary}
                    </p>

                    <div className='mt-4 flex flex-wrap gap-2'>
                      {(presentation.tags || product.bullets || []).map(tag => (
                        <span
                          key={tag}
                          className='rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500 dark:bg-[#101D36] dark:text-slate-300'>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className='mt-auto pt-6'>
                      <div className='h-px bg-slate-200 dark:bg-[#1E5EFF]/12' />
                      <div className='mt-5 flex items-end justify-between gap-4'>
                        <div>
                          <div className='flex items-end gap-2'>
                            <span className='text-[2.25rem] font-black tracking-tight text-slate-900 dark:text-slate-50'>
                              {formatStorePrice(product.price_cents)}
                            </span>
                            {presentation.compareAt ? (
                              <span className='pb-1 text-sm text-slate-400 line-through dark:text-slate-500'>
                                {formatStorePrice(presentation.compareAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          className='rounded-2xl bg-[#4F7CFF] px-5 py-5 text-base font-semibold shadow-[0_18px_40px_-24px_rgba(79,124,255,0.8)] hover:bg-[#3E68E8]'
                          onClick={() => checkoutMutation.mutate(product.id)}
                          disabled={
                            !isStripeEnabled || checkoutMutation.isPending
                          }>
                          {isLoadingThis ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            'Comprar'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
