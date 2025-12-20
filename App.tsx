
import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from './components/Layout';
import { AuthView, UpdatePasswordView } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { Button, Toast } from './components/UI';
import { supabase } from './services/supabaseClient';

// Views - Cliente
import { HomeView, AllPharmaciesView, PharmacyDetailsView, CartView } from './views/CustomerShop';
import { CustomerOrdersView, PrescriptionsListView, PrescriptionUploadView } from './views/CustomerActivity';
import { CustomerProfileView } from './views/CustomerProfile';
import { SupportView } from './views/SupportView';

// Views - Farmácia
import { PharmacyOverview, PharmacyOrdersModule, PharmacyUrgentAlert } from './views/PharmacyMain';
import { PharmacyRequestsModule } from './views/PharmacyRequests';
import { PharmacySettingsView, PharmacyPendingView, PharmacyPromotionsView, PharmacyReviewsView } from './views/PharmacyConfig';
import { PharmacyProductsView } from './views/PharmacyProductsView';
import { PharmacyFinancialView, AdminFinancialView } from './views/FinancialViews'; 

// Views - Administrador
import { AdminOverview, AdminGlobalOrders } from './views/AdminMain';
import { AdminPharmacyManagement, AdminUserManagement } from './views/AdminManagement';
import { AdminMarketingView } from './views/AdminMarketingView';
import { AdminSettingsView, AdminBackupView } from './views/AdminSystem';
import { AdminCatalogView } from './views/AdminCatalogView';
import { AdminSupportView } from './views/AdminSupport';

import { UserRole, Product, CartItem, Order, PrescriptionRequest, OrderStatus, Pharmacy, User, DashboardStats } from './types';
import { fetchProducts, fetchPharmacies, createOrder, fetchOrders, fetchPrescriptionRequests, signOutUser, getCurrentUser, fetchPharmacyById, recoverPharmacyLink } from './services/dataService';
import { playSound } from './services/soundService';
import { WifiOff, Home, Store, FileText, ShoppingBag, User as UserIcon, HelpCircle, BarChart3, Package, DollarSign, Settings, Activity, Users, Database, ShieldCheck, Megaphone, Star, ImageIcon } from 'lucide-react';

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
  const [page, setPage] = useState('home'); 
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [pharmacyStatus, setPharmacyStatus] = useState<string | null>(null); 
  const [pharmacyIsAvailable, setPharmacyIsAvailable] = useState(false); 
  const [pharmacyStats, setPharmacyStats] = useState<DashboardStats>({ totalOrders: 0, revenue: 0, pendingOrders: 0, productsCount: 0 });
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  
  const [criticalAlert, setCriticalAlert] = useState<{type: 'ORDER' | 'RX', count: number} | null>(null);

  const lastPendingCountRef = useRef(0);
  const lastRxCountRef = useRef(0);
  const lastOrderStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const check = async () => {
      const u = await getCurrentUser();
      if (u) handleLogin(u);
      setAuthChecking(false);
    };
    check();
  }, []);

  useEffect(() => {
      if(!user) return;
      const interval = setInterval(() => loadData(user), 10000);
      loadData(user);
      return () => clearInterval(interval);
  }, [user?.id]);

  const loadData = async (u: User) => {
    try {
      if (u.role === UserRole.PHARMACY && u.pharmacyId) {
        const pharm = await fetchPharmacyById(u.pharmacyId);
        if (pharm) {
            setPharmacyStatus(pharm.status.toUpperCase());
            setPharmacyIsAvailable(pharm.isAvailable);
            if (pharm.status === 'APPROVED') {
                const [myOrders, myProducts, myRx] = await Promise.all([
                    fetchOrders(u.pharmacyId), fetchProducts(u.pharmacyId), fetchPrescriptionRequests(UserRole.PHARMACY, undefined, u.pharmacyId)
                ]);
                
                const currentPending = myOrders.filter(o => o.status === OrderStatus.PENDING).length;
                const currentRx = myRx.filter(r => r.status === 'WAITING_FOR_QUOTES' && !r.quotes?.some(q => q.pharmacyId === u.pharmacyId)).length;

                // MODO BRUTO: Toca o som SEMPRE que houver pendências, não apenas quando aumenta.
                if (currentPending > 0) {
                    setCriticalAlert({ type: 'ORDER', count: currentPending });
                    playSound('notification'); // Som toca a cada ciclo de 10s enquanto houver pendência
                } else if (currentRx > 0) {
                    setCriticalAlert({ type: 'RX', count: currentRx });
                    playSound('notification'); 
                } else {
                    setCriticalAlert(null);
                }

                lastPendingCountRef.current = currentPending;
                lastRxCountRef.current = currentRx;

                setOrders(myOrders); 
                setProducts(myProducts); 
                setPrescriptions(myRx);

                setPharmacyStats({
                    pendingOrders: currentPending,
                    totalOrders: myOrders.filter(o => o.status === OrderStatus.COMPLETED).length,
                    revenue: myOrders.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + o.total, 0),
                    productsCount: myProducts.length
                });
            }
        }
      } else {
        const [phData, prData] = await Promise.all([fetchPharmacies(u.role === UserRole.ADMIN), fetchProducts()]);
        setPharmacies(phData); setProducts(prData);
        
        if (u.role === UserRole.CUSTOMER) {
            const allOrders = await fetchOrders();
            const myOrders = allOrders.filter(o => o.customerName === u.name);
            
            myOrders.forEach(order => {
                const prevStatus = lastOrderStatusesRef.current[order.id];
                if (prevStatus && prevStatus !== order.status) {
                    // CLIENTE NOTIFICADO: O sino toca no cabeçalho + som de sucesso
                    playSound('notification'); 
                    setToast({ msg: `Atualização: Seu pedido está ${order.status}`, type: 'success' });
                }
                lastOrderStatusesRef.current[order.id] = order.status;
            });

            setOrders(myOrders);
            setPrescriptions(await fetchPrescriptionRequests(UserRole.CUSTOMER, u.id));
        }
      }
    } catch (err) { console.error("Polling sync silent."); }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    if (u.role === UserRole.CUSTOMER) setPage('home');
    else if (u.role === UserRole.PHARMACY) setPage('dashboard');
    else setPage('overview');
  };

  const handleLogout = async () => { await signOutUser(); setUser(null); setPage('home'); };

  const handleCheckout = async (type: string, address: string, total: number) => {
    if(!user || cart.length === 0) return;
    const res = await createOrder({
        customerName: user.name, customerPhone: user.phone || '', items: cart, total,
        status: OrderStatus.PENDING, type: type as any, pharmacyId: cart[0].pharmacyId, address
    });
    if(res.success) { playSound('cash'); setToast({msg: "Pedido Efetuado!", type: 'success'}); setCart([]); setPage('orders'); loadData(user); }
  };

  const handleAddToCart = (p: Product) => {
      if (cart.length > 0 && cart[0].pharmacyId !== p.pharmacyId) {
          if (confirm("Seu carrinho possui itens de outra farmácia. Deseja limpar o carrinho atual para adicionar este produto?")) {
              setCart([{...p, quantity: 1}]);
              playSound('click');
              setToast({msg: "Carrinho reiniciado com novo item.", type: 'success'});
          }
          return;
      }
      playSound('click');
      setCart(prev => {
          const idx = prev.findIndex(item => item.id === p.id);
          if (idx !== -1) {
              const newCart = [...prev];
              newCart[idx] = { ...newCart[idx], quantity: newCart[idx].quantity + 1 };
              return newCart;
          }
          return [...prev, { ...p, quantity: 1 }];
      });
  };

  const renderContent = () => {
    if (!user) return null;
    if (user.role === UserRole.PHARMACY) {
        if (pharmacyStatus === 'PENDING') return <PharmacyPendingView user={user} onCheckAgain={() => loadData(user)} onLogout={handleLogout} />;
        return (
            <>
                {criticalAlert && <PharmacyUrgentAlert alert={criticalAlert} onResolve={(target) => { setPage(target); setCriticalAlert(null); }} />}
                {(() => {
                    switch(page) {
                        case 'dashboard': return <PharmacyOverview stats={pharmacyStats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} setView={setPage} />;
                        case 'orders': return <PharmacyOrdersModule pharmacyId={user.pharmacyId} onUpdate={() => loadData(user)} />;
                        case 'requests': return <PharmacyRequestsModule pharmacyId={user.pharmacyId} requests={prescriptions} onRefresh={() => loadData(user)} />;
                        case 'products': return <PharmacyProductsView products={products} pharmacyId={user.pharmacyId} onRefresh={() => loadData(user)} />;
                        case 'financial': return <PharmacyFinancialView pharmacyId={user.pharmacyId} />;
                        case 'promotions': return <PharmacyPromotionsView />;
                        case 'reviews': return <PharmacyReviewsView />;
                        case 'settings': return <PharmacySettingsView pharmacyId={user.pharmacyId} onComplete={() => loadData(user)} />;
                        default: return <PharmacyOverview stats={pharmacyStats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} setView={setPage} />;
                    }
                })()}
            </>
        );
    }
    if (user.role === UserRole.ADMIN) {
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
    }
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
  };

  if (authChecking) return <div className="h-screen flex items-center justify-center font-black text-emerald-600 animate-pulse uppercase tracking-widest">FarmoLink Angola...</div>;
  
  if (!user) {
      return page === 'auth' 
        ? <AuthView onLogin={handleLogin} /> 
        : <LandingPage onLoginClick={() => setPage('auth')} />;
  }

  return (
    <MainLayout user={user} activePage={page} onNavigate={setPage} onLogout={handleLogout} menuItems={user.role === UserRole.CUSTOMER ? CUSTOMER_MENU : (user.role === UserRole.PHARMACY ? PHARMACY_MENU : ADMIN_MENU)} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {renderContent()}
    </MainLayout>
  );
};

export default App;
