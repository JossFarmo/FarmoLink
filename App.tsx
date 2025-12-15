
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Layout';
import { AuthView } from './components/Auth';
import { Button } from './components/UI';

// Novas importações modularizadas
import { HomeView, AllPharmaciesView, PharmacyDetailsView, CartView } from './views/CustomerShop';
import { CustomerOrdersView, PrescriptionsListView, PrescriptionUploadView } from './views/CustomerActivity';
import { CustomerProfileView } from './views/CustomerProfile';
import { SupportView } from './views/SupportView'; // Nova view

import { PharmacyDashboard, PharmacyOrdersView, PharmacyRequestsView, PharmacyProductsView, PharmacySetupView, PharmacyPendingView, PharmacySettingsView } from './views/PharmacyViews';
import { PharmacyFinancialView, AdminFinancialView } from './views/FinancialViews'; 
import { AdminDashboard, AdminPharmaciesView } from './views/AdminViews';
import { UserRole, Product, CartItem, Order, PrescriptionRequest, OrderStatus, Pharmacy, User } from './types';
import { fetchProducts, fetchPharmacies, createOrder, fetchOrders, fetchPrescriptionRequests, signOutUser, getCurrentUser, fetchPharmacyById, recoverPharmacyLink } from './services/dataService';
import { playSound } from './services/soundService';
import { WifiOff, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [page, setPage] = useState('home');
  const [isLoading, setIsLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Pharmacy State
  const [pharmacyStatus, setPharmacyStatus] = useState<string | null>(null); 
  const [pharmacyDataFilled, setPharmacyDataFilled] = useState(false); 
  const [pharmacyIsAvailable, setPharmacyIsAvailable] = useState(false); // Novo estado
  
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);

  // Referência para controlar notificações sonoras
  const prevPendingOrders = useRef(0);
  const prevPendingRequests = useRef(0);

  // Estados de Notificação
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) handleLogin(currentUser);
      setAuthChecking(false);
    };
    checkSession();

    // Polling Global para atualizações (a cada 10s)
    const interval = setInterval(() => {
        if(user) loadData(user);
    }, 10000);

    return () => clearInterval(interval);
  }, []); 

  // Effect dedicado para polling que depende do user state atual
  useEffect(() => {
      if(!user) return;
      const interval = setInterval(() => loadData(user), 10000);
      return () => clearInterval(interval);
  }, [user]);

  const loadData = async (currentUser?: User) => {
    const userToLoad = currentUser || user;
    if (!userToLoad) return;

    try {
      if (userToLoad.role === UserRole.PHARMACY) {
        if (userToLoad.pharmacyId) {
            const pharmDetails = await fetchPharmacyById(userToLoad.pharmacyId);
            setPharmacyStatus(pharmDetails?.status || 'PENDING');
            setPharmacyIsAvailable(pharmDetails?.isAvailable || false); // Atualiza estado Online/Offline
            
            const isSetupDone = !!pharmDetails?.address && pharmDetails.address !== 'Pendente de Configuração' && !!pharmDetails?.nif;
            setPharmacyDataFilled(isSetupDone);

            if (pharmDetails?.status === 'APPROVED') {
                const [prodData, myOrders, allRx] = await Promise.all([
                  fetchProducts(userToLoad.pharmacyId),
                  fetchOrders(userToLoad.pharmacyId),
                  fetchPrescriptionRequests(UserRole.PHARMACY, undefined, userToLoad.pharmacyId)
                ]);
                setProducts(prodData);
                setOrders(myOrders);
                setPrescriptions(allRx);

                // Lógica de Notificação e Som (Farmácia)
                const currentPendingOrders = myOrders.filter(o => o.status === OrderStatus.PENDING).length;
                const currentPendingRequests = allRx.filter(r => !r.quotes?.some(q => q.pharmacyId === userToLoad.pharmacyId)).length;

                setPendingOrdersCount(currentPendingOrders);
                setPendingRequestsCount(currentPendingRequests);

                // Toca som se houver NOVOS pedidos ou receitas
                if (currentPendingOrders > prevPendingOrders.current || currentPendingRequests > prevPendingRequests.current) {
                    console.log("🔔 NOVA ENCOMENDA/RECEITA DETECTADA! Tocando som...");
                    playSound('notification');
                }

                prevPendingOrders.current = currentPendingOrders;
                prevPendingRequests.current = currentPendingRequests;
            }
        }
      } else {
        const [prodData, pharmData] = await Promise.all([fetchProducts(), fetchPharmacies()]);
        setProducts(prodData);
        setPharmacies(pharmData);

        if (userToLoad.role === UserRole.CUSTOMER) {
          const allOrders = await fetchOrders(); 
          setOrders(allOrders.filter(o => o.customerName === userToLoad.name));
          const myRx = await fetchPrescriptionRequests(UserRole.CUSTOMER, userToLoad.id);
          setPrescriptions(myRx);
        }
      }
    } catch (e) {
      console.error("Erro loadData", e);
      setIsOfflineMode(true);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === UserRole.CUSTOMER) setPage('home');
    else setPage('dashboard');
    loadData(loggedInUser);
  };

  const handleLogout = () => {
      playSound('logout'); 
      signOutUser(); 
      setUser(null);
      // Resetar estados
      setOrders([]);
      setPrescriptions([]);
      prevPendingOrders.current = 0;
      prevPendingRequests.current = 0;
  }

  const handleViewPharmacy = (pharmacyId: string) => {
      setSelectedPharmacyId(pharmacyId);
      setPage('pharmacy-details');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    playSound('click'); 
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const checkout = async (type: 'DELIVERY' | 'PICKUP', address: string, finalTotal: number): Promise<{ success: boolean, error?: string }> => {
    if (!user || cart.length === 0) return { success: false, error: "Carrinho vazio ou usuário inválido." };

    // VALIDATION: Telefone é obrigatório para comunicação
    if (!user.phone || user.phone.length < 9) {
        playSound('error');
        alert("Atenção: Para finalizar o pedido, precisamos do seu número de telefone para que a farmácia possa contactá-lo.\n\nPor favor, atualize seu perfil.");
        setPage('profile');
        return { success: false, error: "Telefone obrigatório." };
    }

    // Garante que o ID da farmácia existe
    const targetPharmacyId = cart[0]?.pharmacyId;
    if (!targetPharmacyId) {
        playSound('error');
        return { success: false, error: "Erro: Produto sem identificação da farmácia. Tente limpar o carrinho e adicionar novamente." };
    }

    const orderData = {
      customerName: user.name, 
      customerPhone: user.phone, 
      items: cart, 
      total: finalTotal,
      status: OrderStatus.PENDING, 
      type: type, 
      pharmacyId: targetPharmacyId, 
      address: address
    };

    const result = await createOrder(orderData);

    if (result.success) {
      // Atualiza lista localmente para feedback imediato
      setOrders(prev => [{ ...orderData, id: 'temp-' + Date.now(), date: new Date().toLocaleString() } as Order, ...prev]); 
      setCart([]); 
      setPage('orders'); 
      loadData(user); 
    } else {
      playSound('error');
      console.error("Falha ao criar pedido no Supabase:", result.error);
    }
    return result;
  };

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-pulse text-gray-800">Carregando FarmoLink...</div>;
  if (!user) return <AuthView onLogin={handleLogin} />;

  const renderContent = () => {
    // ROTA COMUM DE SUPORTE
    if (page === 'support') return <SupportView user={user} />;

    if (user.role === UserRole.CUSTOMER) {
      switch (page) {
        case 'home': return <HomeView products={products} pharmacies={pharmacies} onAddToCart={addToCart} onNavigate={setPage} onViewPharmacy={handleViewPharmacy} />;
        case 'pharmacies-list': return <AllPharmaciesView pharmacies={pharmacies} onViewPharmacy={handleViewPharmacy} />;
        case 'pharmacy-details': 
            const targetPharm = pharmacies.find(p => p.id === selectedPharmacyId);
            const pharmProducts = products.filter(p => p.pharmacyId === selectedPharmacyId);
            if (!targetPharm) return <div>Farmácia não encontrada</div>;
            return <PharmacyDetailsView pharmacy={targetPharm} products={pharmProducts} onAddToCart={addToCart} onBack={() => setPage('pharmacies-list')} />;
        case 'cart': return (
          <CartView 
            items={cart} 
            updateQuantity={updateCartQuantity} 
            onCheckout={checkout} 
            userAddress={user.address} 
            pharmacies={pharmacies} 
          />
        );
        case 'upload-rx': return <PrescriptionUploadView pharmacies={pharmacies} user={user} onNavigate={setPage} />;
        case 'profile': return <CustomerProfileView user={user} onUpdateUser={setUser} />;
        case 'prescriptions': return (
             <div className="space-y-4">
               <div className="flex justify-end max-w-4xl mx-auto"><button onClick={() => setPage('upload-rx')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow">+ Nova Receita</button></div>
               <PrescriptionsListView requests={prescriptions} user={user} onNavigate={setPage} />
             </div>
          );
        case 'orders': return <CustomerOrdersView orders={orders} pharmacies={pharmacies} onRefresh={() => loadData(user)} />;
        default: return <HomeView products={products} pharmacies={pharmacies} onAddToCart={addToCart} onNavigate={setPage} onViewPharmacy={handleViewPharmacy} />;
      }
    }

    if (user.role === UserRole.PHARMACY) {
      if (!user.pharmacyId) {
         return (
             <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-fade-in">
                 <div className="bg-red-50 p-4 rounded-full mb-4"><AlertTriangle className="w-12 h-12 text-red-500"/></div>
                 <h2 className="text-2xl font-bold text-gray-800 mb-2">Vínculo de Farmácia Necessário</h2>
                 <p className="text-gray-600 mb-6 max-w-md">Detectamos que sua conta não está vinculada a uma farmácia ativa (possivelmente devido a uma atualização do sistema).</p>
                 <Button onClick={async () => {
                     setIsLoading(true);
                     const success = await recoverPharmacyLink(user);
                     if(success) {
                        const updatedUser = await getCurrentUser();
                        if (updatedUser) {
                            setUser(updatedUser);
                            await loadData(updatedUser);
                        } else {
                            window.location.reload(); 
                        }
                     } else {
                        alert("Erro ao recuperar. Contate suporte.");
                     }
                     setIsLoading(false);
                 }}>
                     {isLoading ? 'Processando...' : 'Recuperar Acesso Automaticamente'}
                 </Button>
             </div>
         );
      }
      
      if (pharmacyStatus === 'PENDING') return <PharmacyPendingView onCheckAgain={() => loadData(user)} />;

      if (pharmacyStatus === 'APPROVED' && !pharmacyDataFilled) {
          return <PharmacySetupView user={user} onComplete={() => loadData(user)} />;
      }

      const stats = { pendingOrders: pendingOrdersCount, totalOrders: orders.filter(o => o.status === OrderStatus.COMPLETED).length, revenue: orders.reduce((acc, o) => acc + o.total, 0), productsCount: products.length };
      switch (page) {
        case 'dashboard': return <PharmacyDashboard stats={stats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} onNavigate={setPage} />;
        case 'orders': return <PharmacyOrdersView orders={orders} onUpdate={() => loadData(user)} />;
        case 'requests': return <PharmacyRequestsView requests={prescriptions} pharmacyId={user.pharmacyId || ''} products={products} onRefresh={() => loadData(user)} />;
        case 'products': return <PharmacyProductsView products={products} pharmacyId={user.pharmacyId || ''} onRefresh={() => loadData(user)} />;
        case 'financial': return <PharmacyFinancialView pharmacyId={user.pharmacyId || ''} />; 
        case 'settings': return <PharmacySettingsView user={user} onComplete={() => loadData(user)} />;
        default: return <PharmacyDashboard stats={stats} pharmacyId={user.pharmacyId} isAvailable={pharmacyIsAvailable} onRefresh={() => loadData(user)} onNavigate={setPage} />;
      }
    }

    if (user.role === UserRole.ADMIN) {
        if (page === 'financial') return <AdminFinancialView />;
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50 transition-colors duration-300">
      <Header 
         role={user.role} 
         setRole={(r) => {}} 
         cartCount={cart.reduce((a, b) => a + b.quantity, 0)} 
         onCartClick={() => { playSound('click'); setPage('cart'); }} 
         currentPage={page} 
         setPage={(p) => { playSound('click'); setPage(p); }} 
         pendingOrdersCount={pendingOrdersCount}
         pendingRequestsCount={pendingRequestsCount}
      />
      
      {isOfflineMode && <div className="bg-yellow-50 text-center text-yellow-800 text-sm p-2"><WifiOff className="inline w-4 h-4 mr-1"/> Modo Offline</div>}
      <main className="flex-1 container mx-auto px-4 py-8">{renderContent()}</main>
      <div className="fixed bottom-4 left-4 z-50">
          <button onClick={handleLogout} className="bg-gray-800 text-white px-3 py-1 rounded text-xs opacity-50 hover:opacity-100 hover:bg-red-900 transition-colors">
              Sair ({user.name})
          </button>
      </div>
    </div>
  );
};

export default App;
