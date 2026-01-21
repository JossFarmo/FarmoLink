
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, Product, Pharmacy, Order, OrderStatus, PrescriptionRequest, CartItem } from './types';
import { MainLayout } from './components/Layout';
import { AuthView } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { LoadingOverlay, Button } from './components/UI';
import { ChatBot } from './components/ChatBot';
import { getCurrentUser, signOutUser } from './services/authService';
import { fetchPharmacies } from './services/pharmacyService';
import { fetchProducts } from './services/productService';
import { fetchOrders, fetchPrescriptionRequests, createOrder } from './services/orderService';
import { playSound } from './services/soundService';
import { getCurrentPosition, calculateDistance } from './services/locationService';
import { WifiOff, RefreshCw, AlertCircle, LayoutDashboard, ShoppingBag, Store, FileText, User as UserIcon, MessageCircle, Settings, Database, Image as ImageIcon, Wallet, Pill, History, ShieldCheck, Star, Megaphone } from 'lucide-react';

// --- Static View Imports ---
import { HomeView, AllPharmaciesView, CartView, PharmacyProfileView } from './views/CustomerShop';
import { PrescriptionUploadView } from './views/CustomerUploadRx';
import { CustomerOrdersView } from './views/CustomerOrderList';
import { PrescriptionsListView } from './views/CustomerPrescriptionList';
import { CustomerProfileView } from './views/CustomerProfile';
import { SupportView } from './views/SupportView';
import { PharmacyOverview, PharmacyOrdersModule } from './views/PharmacyMain';
import { PharmacyRequestsModule } from './views/PharmacyRequests';
import { PharmacySettingsView, PharmacyReviewsView, PharmacyPromotionsView } from './views/PharmacyConfig';
import { PharmacyProductsView } from './views/PharmacyProductsView';
import { PharmacyFinancialView, AdminFinancialView } from './views/FinancialViews';
import { AdminOverview, AdminGlobalOrders } from './views/AdminMain';
import { AdminUserManagement, AdminPharmacyManagement } from './views/AdminManagement';
import { AdminCatalogView } from './views/AdminCatalogView';
import { AdminMarketingView } from './views/AdminMarketingView';
import { AdminSettingsView, AdminBackupView } from './views/AdminSystem';
import { AdminSupportView } from './views/AdminSupport';

export const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [page, setPage] = useState('home');
    const [loading, setLoading] = useState(true);
    const [isAppLoading, setIsAppLoading] = useState(false);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
    const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

    // --- FIX 1: HISTORY API PARA BOTÃO VOLTAR NO TELEMÓVEL COM PROTEÇÃO ---
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.page) {
                setPage(event.state.page);
            } else {
                setPage('home');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigateTo = (newPage: string, pharmacyId?: string) => {
        if (pharmacyId) setActivePharmacyId(pharmacyId);
        setPage(newPage);
        
        // Proteção contra SecurityError em sandboxes (como o preview do AI Studio)
        try {
            window.history.pushState({ page: newPage }, '', `#${newPage}`);
        } catch (e) {
            console.warn("History API bloqueada pelo ambiente. O botão voltar pode não funcionar nesta pré-visualização, mas funcionará em produção (Vercel).", e);
        }
        
        playSound('click');
    };

    const updateDistances = useCallback((coords: {lat: number, lng: number}, phList: Pharmacy[]) => {
        return phList.map(ph => {
            if (ph.latitude && ph.longitude) {
                const dist = calculateDistance(coords.lat, coords.lng, ph.latitude, ph.longitude);
                return { ...ph, distanceKm: dist };
            }
            return ph;
        }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }, []);

    const loadData = useCallback(async (currUser: User) => {
        try {
            const [pData, phData] = await Promise.all([
                fetchProducts(undefined, 0),
                fetchPharmacies(currUser.role === UserRole.ADMIN)
            ]);
            
            let finalPharmacies = phData;
            if (currUser.role === UserRole.CUSTOMER) {
                const coords = await getCurrentPosition();
                if (coords) {
                    setUserCoords(coords);
                    finalPharmacies = updateDistances(coords, phData);
                }
            }

            setProducts(pData || []);
            setPharmacies(finalPharmacies || []);

            if (currUser.role === UserRole.CUSTOMER) {
                const [oData, rxData] = await Promise.all([
                    fetchOrders(),
                    fetchPrescriptionRequests(UserRole.CUSTOMER, currUser.id)
                ]);
                setOrders(oData || []);
                setPrescriptions(rxData || []);
            } else if (currUser.role === UserRole.PHARMACY) {
                const [oData, rxData] = await Promise.all([
                    fetchOrders(currUser.pharmacyId),
                    fetchPrescriptionRequests(UserRole.PHARMACY, undefined, currUser.pharmacyId)
                ]);
                setOrders(oData || []);
                setPrescriptions(rxData || []);
            }
        } catch (err) {
            console.error("Erro ao carregar dados iniciais:", err);
        }
    }, [updateDistances]);

    const checkSession = useCallback(async () => {
        setLoading(true);
        try {
            const currUser = await getCurrentUser();
            if (currUser) {
                setUser(currUser);
                await loadData(currUser);
                const startPage = currUser.role === UserRole.PHARMACY ? 'dashboard' : (currUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'home');
                setPage(startPage);
                
                try {
                    window.history.replaceState({ page: startPage }, '', `#${startPage}`);
                } catch (e) {
                    console.warn("Falha ao registrar estado inicial no histórico.");
                }
            }
        } catch (e) {
            console.warn("Sessão não pôde ser verificada:", e);
        } finally {
            setLoading(false);
        }
    }, [loadData]);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const handleLoginSuccess = (userData: User) => {
        setUser(userData);
        loadData(userData);
        const startPage = userData.role === UserRole.PHARMACY ? 'dashboard' : (userData.role === UserRole.ADMIN ? 'admin-dashboard' : 'home');
        navigateTo(startPage);
        playSound('login');
    };

    const handleLogout = async () => {
        setIsAppLoading(true);
        try {
            await signOutUser();
            setUser(null);
            setCart([]);
            setActivePharmacyId(null);
            navigateTo('home');
            playSound('logout');
        } finally {
            setIsAppLoading(false);
        }
    };

    const handleAddToCart = (product: Product) => {
        if (activePharmacyId && activePharmacyId !== product.pharmacyId) {
            if (!confirm("Esvaziar carrinho da outra farmácia?")) return;
            setCart([]);
        }
        setActivePharmacyId(product.pharmacyId);
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            playSound('click');
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateCartQuantity = (id: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0);
            if (updated.length === 0) setActivePharmacyId(null);
            return updated;
        });
    };

    const handleCheckout = async (type: 'DELIVERY' | 'PICKUP', address: string, total: number) => {
        if (!user || cart.length === 0) return;
        setIsAppLoading(true);
        try {
            const result = await createOrder({
                customerName: user.name, customerPhone: user.phone || '', items: cart, total, 
                status: OrderStatus.PENDING, type, pharmacyId: activePharmacyId!, 
                address: type === 'DELIVERY' ? (address || user.address || '') : 'Retirada'
            });
            if (result.success) {
                playSound('cash');
                setCart([]);
                navigateTo('orders');
                loadData(user);
            } else {
                alert('Erro ao finalizar: ' + (result.error || 'Erro desconhecido'));
            }
        } finally {
            setIsAppLoading(false);
        }
    };

    const getMenuItems = () => {
        if (user?.role === UserRole.ADMIN) return [
            { id: 'admin-dashboard', label: 'INÍCIO', icon: LayoutDashboard },
            { id: 'admin-users', label: 'UTENTES E EQUIPA', icon: UserIcon },
            { id: 'admin-pharmacies', label: 'FARMÁCIAS PARCEIRAS', icon: Store },
            { id: 'admin-orders', label: 'MONITOR DE VENDAS', icon: History },
            { id: 'admin-catalog', label: 'CATÁLOGO MESTRE', icon: Database },
            { id: 'admin-financial', label: 'FINANCEIRO REDE', icon: Wallet },
            { id: 'admin-marketing', label: 'BANNERS E MARCAS', icon: ImageIcon },
            { id: 'admin-support', label: 'SUPORTE (SAC)', icon: MessageCircle },
            { id: 'admin-settings', label: 'PARÂMETROS', icon: Settings },
            { id: 'admin-backup', label: 'SEGURANÇA E DADOS', icon: ShieldCheck }
        ];
        if (user?.role === UserRole.PHARMACY) return [
            { id: 'dashboard', label: 'INÍCIO', icon: LayoutDashboard },
            { id: 'pharmacy-orders', label: 'PEDIDOS DO UTENTE', icon: ShoppingBag },
            { id: 'pharmacy-requests', label: 'TRIAGEM DE RECEITAS', icon: FileText },
            { id: 'pharmacy-products', label: 'STOCK E PREÇOS', icon: Pill },
            { id: 'pharmacy-financial', label: 'AUDITORIA MENSAL', icon: Wallet },
            { id: 'pharmacy-reviews', label: 'SATISFAÇÃO UTENTE', icon: Star },
            { id: 'pharmacy-promotions', label: 'CAMPANHAS SAÚDE', icon: Megaphone },
            { id: 'support', label: 'SUPORTE TÉCNICO', icon: MessageCircle },
            { id: 'pharmacy-settings', label: 'CONFIGURAÇÕES', icon: Settings },
        ];
        return [
            { id: 'home', label: 'INÍCIO', icon: LayoutDashboard },
            { id: 'pharmacies-list', label: 'FARMÁCIAS', icon: Store },
            { id: 'upload-rx', label: 'ENVIAR RECEITA', icon: FileText },
            { id: 'prescriptions', label: 'MINHAS CONSULTAS', icon: FileText },
            { id: 'orders', label: 'MEUS MEDICAMENTOS', icon: History },
            { id: 'profile', label: 'PERFIL SAÚDE', icon: UserIcon },
            { id: 'support', label: 'AJUDA DIRETA', icon: MessageCircle },
        ];
    };

    const renderContent = () => {
        if (!user) {
            if (page === 'login') return <AuthView onLogin={handleLoginSuccess} />;
            return <LandingPage onLoginClick={() => navigateTo('login')} />;
        }
        
        const stats = {
            pendingOrders: orders.filter(o => o.status === 'Pendente' || o.status === 'Preparando').length,
            revenue: orders.filter(o => o.status === 'Concluído').reduce((acc, o) => acc + o.total, 0),
            productsCount: products.filter(p => p.pharmacyId === user.pharmacyId).length,
            rxCount: prescriptions.filter(r => r.status === 'WAITING_FOR_QUOTES').length
        };

        const onViewPharmacy = (id: string) => navigateTo('pharmacy-detail', id);

        switch (page) {
            case 'home': return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={navigateTo} onViewPharmacy={onViewPharmacy} />;
            case 'pharmacies-list': return <AllPharmaciesView pharmacies={pharmacies} onViewPharmacy={onViewPharmacy} />;
            case 'pharmacy-detail': 
                const pharm = pharmacies.find(p => p.id === activePharmacyId);
                return pharm ? (
                    <PharmacyProfileView 
                        pharmacy={pharm} 
                        onAddToCart={handleAddToCart} 
                        onBack={() => navigateTo('pharmacies-list')} 
                    />
                ) : <div className="p-10 text-center">Farmácia não encontrada</div>;
            case 'cart': return <CartView items={cart} pharmacies={pharmacies} updateQuantity={updateCartQuantity} userAddress={user.address} onBack={() => navigateTo('home')} onCheckout={handleCheckout} />;
            case 'orders': return <CustomerOrdersView orders={orders} pharmacies={pharmacies} onRefresh={() => loadData(user)} onAddToCart={handleAddToCart} onNavigate={navigateTo} />;
            case 'prescriptions': return <PrescriptionsListView prescriptions={prescriptions} pharmacies={pharmacies} onRefresh={() => loadData(user)} user={user} onNavigate={navigateTo} />;
            case 'upload-rx': return <PrescriptionUploadView pharmacies={pharmacies} user={user} onNavigate={navigateTo} onAddToCart={handleAddToCart} />;
            case 'profile': return <CustomerProfileView user={user} onUpdateUser={setUser} />;
            case 'support': return <SupportView user={user} />;
            case 'dashboard': return <PharmacyOverview stats={stats} pharmacyId={user.pharmacyId} isAvailable={pharmacies.find(p => p.id === user.pharmacyId)?.isAvailable} onRefresh={() => loadData(user)} setView={navigateTo} />;
            case 'pharmacy-orders': return <PharmacyOrdersModule pharmacyId={user.pharmacyId!} onUpdate={() => loadData(user)} />;
            case 'pharmacy-requests': return <PharmacyRequestsModule pharmacyId={user.pharmacyId!} requests={prescriptions} onRefresh={() => loadData(user)} />;
            case 'pharmacy-products': return <PharmacyProductsView pharmacyId={user.pharmacyId!} onRefresh={() => loadData(user)} />;
            case 'pharmacy-financial': return <PharmacyFinancialView pharmacyId={user.pharmacyId!} />;
            case 'pharmacy-reviews': return <PharmacyReviewsView pharmacyId={user.pharmacyId!} />;
            case 'pharmacy-promotions': return <PharmacyPromotionsView pharmacyId={user.pharmacyId} />;
            case 'pharmacy-settings': return <PharmacySettingsView pharmacyId={user.pharmacyId!} onComplete={() => loadData(user)} />;
            case 'admin-dashboard': return <AdminOverview setView={navigateTo} />;
            case 'admin-users': return <AdminUserManagement />;
            case 'admin-pharmacies': return <AdminPharmacyManagement />;
            case 'admin-orders': return <AdminGlobalOrders />;
            case 'admin-catalog': return <AdminCatalogView />;
            case 'admin-marketing': return <AdminMarketingView />;
            case 'admin-financial': return <AdminFinancialView />;
            case 'admin-support': return <AdminSupportView user={user} />;
            case 'admin-settings': return <AdminSettingsView />;
            case 'admin-backup': return <AdminBackupView />;
            default: return <HomeView products={products} pharmacies={pharmacies} onAddToCart={handleAddToCart} onNavigate={navigateTo} onViewPharmacy={onViewPharmacy} />;
        }
    };

    if (loading) return <LoadingOverlay />;

    return (
        <div className="min-h-screen bg-gray-100">
            {isAppLoading && <LoadingOverlay />}
            {user ? (
                <MainLayout 
                    user={user} activePage={page} onNavigate={navigateTo} onLogout={handleLogout}
                    menuItems={getMenuItems()} cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
                >
                    {renderContent()}
                    {user.role === UserRole.CUSTOMER && <ChatBot />}
                </MainLayout>
            ) : (
                renderContent()
            )}
        </div>
    );
};
