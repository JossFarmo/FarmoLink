
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from './components/Layout';
import { AuthView, UpdatePasswordView } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { Toast } from './components/UI';
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
import { Home, Store, FileText, ShoppingBag, User as UserIcon, HelpCircle, BarChart3, Package, DollarSign, Settings, Activity, Users, Database, ShieldCheck, Megaphone, Star, ImageIcon, Loader2, RotateCcw } from 'lucide-react';

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
  const [showResetButton, setShowResetButton] = useState(false); // Botão de pânico se demorar
  const [page, setPage] = useState('home'); 
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [pharmacyStats, setPharmacyStats] = useState<DashboardStats>({ totalOrders: 0, revenue: 0, pendingOrders: 0, productsCount: 0 });
  const [pharmacyStatus, setPharmacyStatus] = useState<string | null>(null);
  const [pharmacyIsAvailable, setPharmacyIsAvailable] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState<{type: 'ORDER' | 'RX', count: number} | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  const lastPendingCountRef = useRef(0);
  const lastRxCountRef = useRef(0);
  const isInitialLoadDone = useRef(false);

  const handleCleanup = useCallback(() => {
    setUser(null);
    setPage('home');
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
    await signOutUser(); 
    handleCleanup();
    playSound('logout');
  }, [handleCleanup]);

  const loadData = useCallback(async (u: User, forceStatic = false) => {
      if (!u) return;
      try {
          if (!isInitialLoadDone.current || forceStatic) {
              const phData = await fetchPharmacies(u.role === UserRole.ADMIN);
              const prDataFetched = u.role === UserRole.PHARMACY && u.pharmacyId ? await fetchProducts(u.pharmacyId) : await fetchProducts();
              
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
          console.warn("Sync falhou, usando cache ou resetando estado."); 
      }
  }, [products.length]);

  const handleLogin = useCallback((u: User) => {
    setUser(u);
    setPage(u.role === UserRole.CUSTOMER ? 'home' : (u.role === UserRole.PHARMACY ? 'dashboard' : 'overview'));
    loadData(u);
  }, [loadData]);

  // MONITOR DE AUTENTICAÇÃO COM FAIL-SAFE MELHORADO
  useEffect(() => {
    // Se após 4 segundos ainda estiver carregando, mostra opção de reset
    const timer = setTimeout(() => {
        if (authChecking) setShowResetButton(true);
    }, 4000);

    // Listener global para logout forçado (vindo de erros 401/403)
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
                    handleLogin(u);
                }
            }
        } catch (e) {
            console.error("Erro na inicialização:", e);
        } finally {
            setAuthChecking(false);
        }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const u = await getCurrentUser();
          if (u) handleLogin(u);
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
  }, [handleLogin, handleLogout, handleCleanup, authChecking]);

  // Heartbeat para manter sessão viva
  useEffect(() => {
      if (!user) return;
      const heartbeat = setInterval(async () => {
          const { error } = await supabase.auth.getSession();
          if (error) handleLogout();
      }, 5 * 60 * 1000); 
      return () => clearInterval(heartbeat);
  }, [user, handleLogout]);

  useEffect(() => {
      if (!user) return;
      const channel = supabase
          .channel('db-live-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData(user))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => loadData(user))
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const handleAddToCart = (product: Product) => {
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

  const handleCheckout = async (type: 'DELIVERY' | 'PICKUP', address: string, total: number) => {
      if (!user || cart.length === 0) return;
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

      if (res.success) {
          setCart([]);
          setPage('orders');
          playSound('success');
          setToast({ msg: "Pedido realizado com sucesso!", type: 'success' });
      } else {
          setToast({ msg: "Erro ao finalizar pedido.", type: 'error' });
      }
  };

  const forceNuclearReset = () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
  };

  if (authChecking) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Rede...</p>
        
        {showResetButton && (
            <div className="mt-12 animate-fade-in">
                <p className="text-xs text-gray-400 mb-4 font-medium">Demorando muito? Pode ser um erro de cache.</p>
                <button 
                    onClick={forceNuclearReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-gray-200"
                >
                    <RotateCcw size={14}/> Limpar Cache e Recarregar
                </button>
            </div>
        )}
    </div>
  );

  if (!user) return page === 'auth' ? <AuthView onLogin={handleLogin} /> : <LandingPage onLoginClick={() => setPage('auth')} />;

  return (
    <MainLayout user={user} activePage={page} onNavigate={setPage} onLogout={handleLogout} menuItems={user.role === UserRole.CUSTOMER ? CUSTOMER_MENU : (user.role === UserRole.PHARMACY ? PHARMACY_MENU : ADMIN_MENU)} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        
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
                    case 'home': return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={setPage} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} />;
                    case 'pharmacies-list': return <AllPharmaciesView pharmacies={pharmacies} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} />;
                    case 'pharmacy-details': return <PharmacyDetailsView pharmacy={pharmacies.find(p=>p.id===selectedPharmacyId)} products={products.filter(p=>p.pharmacyId===selectedPharmacyId)} onAddToCart={handleAddToCart} onBack={()=>setPage('home')} />;
                    case 'cart': return <CartView items={cart} pharmacies={pharmacies} updateQuantity={(id:any,d:any)=>setCart(cart.map(i=>i.id===id?{...i,quantity:i.quantity+d}:i).filter(i=>i.quantity>0))} onCheckout={handleCheckout} userAddress={user.address} onBack={()=>setPage('home')} />;
                    case 'orders': return <CustomerOrdersView orders={orders} pharmacies={pharmacies} onRefresh={()=>loadData(user)} />;
                    case 'prescriptions': return <PrescriptionsListView requests={prescriptions} user={user} onNavigate={setPage} />;
                    case 'upload-rx': return <PrescriptionUploadView pharmacies={pharmacies} user={user} onNavigate={setPage} />;
                    case 'profile': return <CustomerProfileView user={user} onUpdateUser={setUser} />;
                    case 'support': return <SupportView user={user} />;
                    default: return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={setPage} onViewPharmacy={(id:any)=>{setSelectedPharmacyId(id); setPage('pharmacy-details')}} />;
                }
            })()
        )}
    </MainLayout>
  );
};

export default App;
