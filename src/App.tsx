import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthView } from './components/AuthView';
import { Backdrop } from './components/Backdrop';
import { CartDrawer } from './components/CartDrawer';
import { CategoryGrid } from './components/CategoryGrid';
import { ConsultBanner } from './components/ConsultBanner';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { QuickViewModal } from './components/QuickViewModal';
import { RxModal } from './components/RxModal';
import { useAuth } from './context/AuthContext';
import { scrollToId } from './lib/hooks';
import { ADMIN_PATH, navigate, usePath } from './lib/router';
import type { CategoryId, Drug } from './types';

const goHome = () => navigate('/');

export default function App() {
  const { user } = useAuth();
  const onAdminRoute = usePath().replace(/\/+$/, '') === ADMIN_PATH;
  const isAdmin = user?.isAdmin === true;

  // /admin is protected: signed-in customers are sent back to the homepage.
  useEffect(() => {
    if (onAdminRoute && user && !isAdmin) navigate('/', { replace: true });
  }, [onAdminRoute, user, isAdmin]);

  if (!onAdminRoute) return <Storefront />;
  if (isAdmin) return <AdminDashboard />;
  // Signed-out visitors get the sign-in screen; only the admin account gets past it.
  return user ? null : <AuthView open onClose={goHome} />;
}

function Storefront() {
  // Shared catalogue state: the hero search and the category bar both feed the product grid.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [quickView, setQuickView] = useState<Drug | null>(null);
  const [rxOpen, setRxOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Deep links such as /#products or /#contact land on the right section once the page has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, []);

  const closeQuickView = useCallback(() => setQuickView(null), []);
  const openRx = useCallback(() => setRxOpen(true), []);
  const closeRx = useCallback(() => setRxOpen(false), []);
  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const showResults = useCallback(() => scrollToId('products'), []);

  return (
    <>
      <Backdrop />

      {authOpen ? (
        <AuthView open={authOpen} onClose={closeAuth} />
      ) : (
        <>
          <Header onUploadRx={openRx} onOpenAuth={openAuth} />

          <main className="overflow-x-clip">
            <Hero query={query} onQueryChange={setQuery} onOpenDrug={setQuickView} onSubmitSearch={showResults} onUploadRx={openRx} />
            <CategoryGrid category={category} onCategoryChange={setCategory} />
            <ProductGrid
              query={query}
              category={category}
              onQueryChange={setQuery}
              onCategoryChange={setCategory}
              onQuickView={setQuickView}
            />
            <ConsultBanner />
          </main>

          <Footer />

          <CartDrawer onUploadRx={openRx} onOpenAuth={openAuth} />
          <QuickViewModal drug={quickView} onOpenDrug={setQuickView} onClose={closeQuickView} />
          <RxModal open={rxOpen} onClose={closeRx} />
        </>
      )}
    </>
  );
}
