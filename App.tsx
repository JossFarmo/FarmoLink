
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from './components/Layout';
import { AuthView, UpdatePasswordView } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { Toast, LoadingOverlay, Button } from './components/UI';
import { supabase } from './services/supabaseClient';

// Views
import { HomeView, AllPharmaciesView, PharmacyDetailsView, CartView } from './views/CustomerShop';
import { CustomerOrdersView, PrescriptionsListView, PrescriptionUploadView } from './views/CustomerActivity';
import { CustomerProfileView } from './views/CustomerProfile';
import { SupportView } from './views/SupportView';
import { PharmacyOverview, PharmacyOrdersModule, PharmacyUrgentAlert } from './views/PharmacyMain';
import { PharmacyRequestsModule } from './views/PharmacyRequests';
import { PharmacySettingsView, PharmacyPendingView, PharmacyPromotionsView, PharmacyReviewsView } from './views/PharmacyConfig';
import { PharmacyProductsView } from './views/PharmacyProductsView';
import { PharmacyFinancialView, AdminFinancialView } from './views/FinancialViews'; 
import { AdminOverview, AdminGlobalOrders } from './views/AdminMain';
import { AdminPharmacyManagement, AdminUserManagement } from './views/AdminManagement';
import { AdminMarketingView } from './views/AdminMarketingView';
import { AdminSettingsView, AdminBackupView } from './views/AdminSystem';
import { AdminCatalogView } from './views/AdminCatalogView';
import { AdminSupportView } from './views/AdminSupport';

import { UserRole, Product, CartItem, Order, PrescriptionRequest, OrderStatus, Pharmacy, User, DashboardStats } from './types';
import { 
    fetchProducts, fetchPharmacies, createOrder, fetchOrders, 
    fetchPrescriptionRequests, signOutUser, getCurrentUser, 
    fetchPharmacyById, getCacheForUser, setCacheForUser 
} from './services/dataService';
import { playSound } from './services/soundService';
import { Home, Store, FileText, ShoppingBag, User as UserIcon, HelpCircle, BarChart3, Package, DollarSign, Settings, Activity, Users, Database, ShieldCheck, Megaphone, Star, ImageIcon, Loader2, RotateCcw, AlertTriangle, X } from 'lucide-react';

const CUSTOMER_MENU = [
    { id: 'home', label: 'Shopping', icon: Home },
    { id: 'pharmacies-list', label: 'Farmácias', icon: Store },
    { id: 'prescriptions', label: 'Minhas Receitas', icon: FileText },
    { id: 'orders', label: 'Meus Pedidos', icon: ShoppingBag },
    { id: 'profile', label: 'Meu Perfil', icon: UserIcon },
    { id: 'support', label: 'Suporte', icon: HelpCircle },
];

const PHARMACY_MENU = [
    { id: 'dashboard', label: 'Visão Geral', icon: BarChart3 },
    { id: 'orders', label: 'Pedidos', icon: Package },
    { id: 'requests', label: 'Receitas Médicas', icon: FileText },
    { id: 'products', label: 'Stock', icon: Store },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'promotions', label: 'Promoções', icon: Megaphone },
    { id: 'reviews', label: 'Avaliações', icon: Star },
    { id: 'settings', label: 'Configurações', icon: Settings },
];

const ADMIN_MENU = [
    { id: 'overview', label: 'Dashboard', icon: Activity },
    { id: 'pharmacies', label: 'Farmácias', icon: Store },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'catalog', label: 'Catálogo Global', icon: Database },
    { id: 'orders', label: 'Monitoramento', icon: ShoppingBag },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'marketing', label: 'Marketing', icon: ImageIcon },
    { id: 'support', label: 'Suporte (SAC)', icon: HelpCircle },
    { id: 'security', label: 'Segurança', icon: ShieldCheck },
    { id: 'settings', label: 'Sistema', icon: Settings },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [showResetButton, setShowResetButton] = useState(false);
  
  const [page, setPage] = useState(() => sessionStorage.getItem('last_page') || 'home'); 
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [cartConflict, setCartConflict] = useState<{ newItem: Product, currentPharmacyName: string } | null>(null);

  const [pharmacyStats, setPharmacyStats] = useState<DashboardStats>({ totalOrders: 0, revenue: 0, pendingOrders: 0, productsCount: 0 });
  const [pharmacyStatus, setPharmacyStatus] = useState<string | null>(null);
  const [pharmacyIsAvailable, setPharmacyIsAvailable] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState<{type: 'ORDER' | 'RX', count: number} | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  const lastPendingCountRef = useRef(0);
  const lastRxCountRef = useRef(0);
  const isInitialLoadDone = useRef(false);

  useEffect(() => {
    if (user) sessionStorage.setItem('last_page', page);
  }, [page, user]);

  const handleCleanup = useCallback(() => {
    setUser(null);
    setPage('home');
    sessionStorage.removeItem('last_page');
    setProducts([]);
    setPharmacies([]);
    setOrders([]);
    setPrescriptions([]);
    setCart([]);
    setPharmacyStatus(null);
    setCriticalAlert(null);
    isInitialLoadDone.current = false;
  }, []);

  const handleLogout = useCallback(async () => { 
    setGlobalLoading(true);
    await signOutUser(); 
    handleCleanup();
    setGlobalLoading(false);
    playSound('logout');
  }, [handleCleanup]);

  const loadData = useCallback(async (u: User, forceStatic = false) => {
      if (!u) return;
      try {
          if (!isInitialLoadDone.current || forceStatic) {
              const [phData, prDataFetched] = await Promise.all([
                  fetchPharmacies(u.role === UserRole.ADMIN),
                  u.role === UserRole.PHARMACY && u.pharmacyId ? fetchProducts(u.pharmacyId) : fetchProducts()
              ]);
              
              setPharmacies(phData || []);
              setProducts(prDataFetched || []);
              setCacheForUser(u.id, { pharmacies: phData || [], products: prDataFetched || [] });
              isInitialLoadDone.current = true;
          }

          if (u.role === UserRole.PHARMACY && u.pharmacyId) {
              const pharm = await fetchPharmacyById(u.pharmacyId);
              if (pharm) {
                  setPharmacyStatus(pharm.status.toUpperCase());
                  setPharmacyIsAvailable(pharm.isAvailable);
                  if (pharm.status === 'APPROVED') {
                      const [myOrders, myRx] = await Promise.all([
                          fetchOrders(u.pharmacyId), 
                          fetchPrescriptionRequests(UserRole.PHARMACY, undefined, u.pharmacyId)
                      ]);
                      
                      const currentPending = (myOrders || []).filter(o => o.status === OrderStatus.PENDING).length;
                      const currentRx = (myRx || []).filter(r => r.status === 'WAITING_FOR_QUOTES' && !r.quotes?.some(q => q.pharmacyId === u.pharmacyId)).length;

                      if (currentPending > lastPendingCountRef.current || currentRx > lastRxCountRef.current) playSound('notification');

                      setCriticalAlert(currentPending > 0 ? { type: 'ORDER', count: currentPending } : (currentRx > 0 ? { type: 'RX', count: currentRx } : null));
                      lastPendingCountRef.current = currentPending;
                      lastRxCountRef.current = currentRx;

                      setOrders(myOrders || []); 
                      setPrescriptions(myRx || []);
                      setPharmacyStats({
                          pendingOrders: currentPending,
                          totalOrders: (myOrders || []).filter(o => o.status === OrderStatus.COMPLETED).length,
                          revenue: (myOrders || []).filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + (Number(o.total) || 0), 0),
                          productsCount: products.length
                      });
                  }
              }
          } else if (u.role === UserRole.CUSTOMER) {
              const [allOrders, myRx] = await Promise.all([fetchOrders(), fetchPrescriptionRequests(UserRole.CUSTOMER, u.id)]);
              const myOrders = (allOrders || []).filter(o => o.customerName === u.name);
              setOrders(myOrders);
              setPrescriptions(myRx || []);
          } else if (u.role === UserRole.ADMIN) {
              const allOrders = await fetchOrders();
              setOrders(allOrders || []);
          }
      } catch (err) { 
          console.warn("Sync silencioso interrompido."); 
      }
  }, [products.length]);

  const handleLogin = useCallback((u: User, isFirstLoad: boolean = false) => {
    setUser(u);
    if (isFirstLoad && !sessionStorage.getItem('last_page')) {
        const defaultPage = u.role === UserRole.CUSTOMER ? 'home' : (u.role === UserRole.PHARMACY ? 'dashboard' : 'overview');
        setPage(defaultPage);
    }
    loadData(u);
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => { if (authChecking) setShowResetButton(true); }, 4000);
    const handleForceLogout = () => handleLogout();
    window.addEventListener('force-logout', handleForceLogout);

    const initAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const u = await getCurrentUser();
                if (u) {
                    const cached = getCacheForUser(u.id);
                    if (cached) {
                        setProducts(cached.products || []);
                        setPharmacies(cached.pharmacies || []);
                    }
                    handleLogin(u, true);
                }
            }
        } catch (e) {
            console.error("Auth Fail:", e);
        } finally {
            setAuthChecking(false);
        }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const u = await getCurrentUser();
          if (u) handleLogin(u, event === 'SIGNED_IN');
          setAuthChecking(false);
      } else if (event === 'SIGNED_OUT') {
          handleCleanup();
          setAuthChecking(false);
      }
    });

    initAuth();
    return () => { 
        subscription.unsubscribe();
        clearTimeout(timer);
        window.removeEventListener('force-logout', handleForceLogout);
    };
  }, [handleLogin, handleLogout, handleCleanup]);

  useEffect(() => {
    if (!user) return;
    const handleReactivate = () => {
        if (document.visibilityState === 'visible') {
            loadData(user);
            supabase.getChannels().forEach(ch => { if (ch.state === 'closed') ch.subscribe(); });
        }
    };
    window.addEventListener('visibilitychange', handleReactivate);
    return () => window.removeEventListener('visibilitychange', handleReactivate);
  }, [user, loadData]);

  const handleAddToCart = (product: Product) => {
      if (cart.length > 0 && cart[0].pharmacyId !== product.pharmacyId) {
          const currentPharmacy = pharmacies.find(p => p.id === cart[0].pharmacyId);
          setCartConflict({ newItem: product, currentPharmacyName: currentPharmacy?.name || 'outra farmácia' });
          playSound('error');
          return;
      }

      setCart(prev => {
          const existing = prev.find(item => item.id === product.id);
          if (existing) {
              return prev.map(item => 
                  item.id === product.id 
                  ? { ...item, quantity: item.quantity + 1 } 
                  : item
              );
          }
          playSound('click');
          return [...prev, { ...product, quantity: 1 }];
      });
  };

  const confirmClearAndAdd = () => {
      if (cartConflict) {
          setCart([{ ...cartConflict.newItem, quantity: 1 }]);
          setCartConflict(null);
          playSound('success');
      }
  };

  const handleCheckout = async (type: 'DELIVERY' | 'PICKUP', address: string, total: number) => {
      if (!user || cart.length === 0) return;
      setGlobalLoading(true);
      const res = await createOrder({
          customerName: user.name,
          customerPhone: user.phone,
          items: cart,
          total: total,
          status: OrderStatus.PENDING,
          type: type,
          pharmacyId: cart[0].pharmacyId,
          address: address
      });
      setGlobalLoading(false);

      if (res.success) {
          setCart([]);
          setPage('orders');
          playSound('success');
          setToast({ msg: "Pedido realizado com sucesso!", type: 'success' });
          loadData(user); // Refresh orders
      } else {
          setToast({ msg: res.error || "Erro ao finalizar pedido.", type: 'error' });
      }
  };

  if (authChecking) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Rede...</p>
        {showResetButton && (
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-gray-200">
                <RotateCcw size={14} className="inline mr-2"/> Reiniciar Conexão
            </button>
        )}
    </div>
  );

  if (!user) return page === 'auth' ? <AuthView onLogin={(u) => handleLogin(u, true)} /> : <LandingPage onLoginClick={() => setPage('auth')} />;

  return (
    <MainLayout user={user} activePage={page} onNavigate={setPage} onLogout={handleLogout} menuItems={user.role === UserRole.CUSTOMER ? CUSTOMER_MENU : (user.role === UserRole.PHARMACY ? PHARMACY_MENU : ADMIN_MENU)} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {globalLoading && <LoadingOverlay />}

        {cartConflict && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-emerald-950/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-scale-in text-center border-none">
                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40}/>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Trocar de Farmácia?</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">
                        Seu carrinho já contém itens da <span className="font-black text-emerald-600">{cartConflict.currentPharmacyName}</span>. 
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button onClick={confirmClearAndAdd} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 font-black text-base rounded-3xl shadow-xl shadow-emerald-100">
                            ESVAZIAR E ADICIONAR
                        </Button>
                        <button onClick={() => setCartConflict(null)} className="w-full py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-colors">Manter itens atuais</button>
                    </div>
                </div>
            </div>
        )}
        
        {user.role === UserRole.PHARMACY ? (
            pharmacyStatus === 'PENDING' ? <PharmacyPendingView user={user} onCheckAgain={() => loadData(user)} onLogout={handleLogout} /> :
            <>
                {criticalAlert && <PharmacyUrgentAlert alert={criticalAlert} onResolve={(target) => { setPage(target); setCriticalAlert(null); }} />}
                {(() => {
                    switch(page) {
                        case 'dashboard': return <PharmacyOverview stats={pharmacyStats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} setView={setPage} />;
                        case 'orders': return <PharmacyOrdersModule pharmacyId={user.pharmacyId} onUpdate={() => loadData(user)} />;
                        case 'requests': return <PharmacyRequestsModule pharmacyId={user.pharmacyId} requests={prescriptions} onRefresh={() => loadData(user)} />;
                        case 'products': return <PharmacyProductsView products={products} pharmacyId={user.pharmacyId} onRefresh={() => loadData(user, true)} />;
                        case 'financial': return <PharmacyFinancialView pharmacyId={user.pharmacyId} />;
                        case 'promotions': return <PharmacyPromotionsView />;
                        case 'reviews': return <PharmacyReviewsView pharmacyId={user.pharmacyId} />;
                        case 'settings': return <PharmacySettingsView pharmacyId={user.pharmacyId} onComplete={() => loadData(user)} />;
                        default: return <PharmacyOverview stats={pharmacyStats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} setView={setPage} />;
                    }
                })()}
            </>
        ) : user.role === UserRole.ADMIN ? (
            (() => {
                switch(page) {
                    case 'overview': return <AdminOverview setView={setPage} />;
                    case 'pharmacies': return <AdminPharmacyManagement />;
                    case 'users': return <AdminUserManagement />;
                    case 'catalog': return <AdminCatalogView />;
                    case 'orders': return <AdminGlobalOrders />;
                    case 'financial': return <AdminFinancialView />;
                    case 'marketing': return <AdminMarketingView />;
                    case 'support': return <AdminSupportView user={user} />;
                    case 'security': return <AdminBackupView />;
                    case 'settings': return <AdminSettingsView />;
                    default: return <AdminOverview setView={setPage} />;
                }
            })()
        ) : (
            (() => {
                switch (page) {
                    case 'home': return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={setPage} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} cartPharmacyId={cart.length > 0 ? cart[0].pharmacyId : null} orders={orders} />;
                    case 'pharmacies-list': return <AllPharmaciesView pharmacies={pharmacies} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} />;
                    case 'pharmacy-details': return <PharmacyDetailsView pharmacy={pharmacies.find(p=>p.id===selectedPharmacyId)} products={products.filter(p=>p.pharmacyId===selectedPharmacyId)} onAddToCart={handleAddToCart} onBack={()=>setPage('home')} cartPharmacyId={cart.length > 0 ? cart[0].pharmacyId : null} />;
                    case 'cart': return <CartView items={cart} pharmacies={pharmacies} updateQuantity={(id:any,d:any)=>setCart(cart.map(i=>i.id===id?{...i,quantity:i.quantity+d}:i).filter(i=>i.quantity>0))} onCheckout={handleCheckout} userAddress={user.address} onBack={()=>setPage('home')} />;
                    case 'orders': return <CustomerOrdersView orders={orders} pharmacies={pharmacies} onRefresh={()=>loadData(user)} />;
                    case 'prescriptions': return <PrescriptionsListView requests={prescriptions} user={user} onNavigate={setPage} />;
                    case 'upload-rx': return <PrescriptionUploadView pharmacies={pharmacies} user={user} onNavigate={setPage} />;
                    case 'profile': return <CustomerProfileView user={user} onUpdateUser={setUser} />;
                    case 'support': return <SupportView user={user} />;
                    default: return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={setPage} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} orders={orders} />;
                }
            })()
        )}
    </MainLayout>
  );
};

export default App;
