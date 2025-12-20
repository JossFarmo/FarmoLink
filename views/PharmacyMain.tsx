
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { Order, OrderStatus } from '../types';
import { fetchOrders, updateOrderStatus, togglePharmacyAvailability } from '../services/dataService';
import { 
    Clock, DollarSign, Package, Star, RefreshCw, Phone, 
    MessageCircle, X, Truck, ChevronRight, Search, 
    Bike, User as UserIcon, CheckCircle2, XCircle,
    ArrowRight, ExternalLink, Store, AlertCircle, BellRing
} from 'lucide-react';
import { playSound } from '../services/soundService';

export const PharmacyUrgentAlert = ({ alert, onResolve }: { alert: {type: 'ORDER' | 'RX', count: number}, onResolve: (target: string) => void }) => {
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 animate-bounce-slow">
            <div className="bg-red-600 text-white p-6 rounded-[32px] shadow-2xl shadow-red-500/50 border-4 border-yellow-400 flex items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-red-700 animate-pulse opacity-20 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 bg-yellow-400 text-red-700 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                        <BellRing size={32} className="animate-bounce" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase tracking-tighter">Ação Necessária Urgente!</h4>
                        <p className="text-sm font-bold opacity-90">
                            {alert.type === 'ORDER' 
                                ? `Você tem ${alert.count} pedido(s) pendente(s) aguardando aceite.` 
                                : `Chegou uma nova receita médica para cotação.`}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => onResolve(alert.type === 'ORDER' ? 'orders' : 'requests')}
                    className="px-8 py-4 bg-white text-red-600 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl relative z-10 whitespace-nowrap"
                >
                    VER AGORA
                </button>
            </div>
        </div>
    );
};

export const PharmacyOverview = ({ stats, pharmacyId, isAvailable, onRefresh, setView }: any) => {
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        if(await togglePharmacyAvailability(pharmacyId, !isAvailable)) {
            playSound(isAvailable ? 'click' : 'success');
            onRefresh();
        }
        setToggling(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Status da Loja</h1>
                    <p className="text-xs text-gray-400">{isAvailable ? 'Sua farmácia está visível para os clientes.' : 'Sua loja está fechada e oculta no shopping.'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge color={isAvailable ? 'green' : 'red'}>{isAvailable ? 'LOJA ONLINE' : 'LOJA FECHADA'}</Badge>
                    <button onClick={handleToggle} disabled={toggling} className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors ${isAvailable ? 'bg-emerald-600 shadow-inner' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform ml-1 ${isAvailable ? 'translate-x-7' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setView('orders')}>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Pedidos Ativos</p>
                    <h3 className="text-4xl font-black text-gray-800">{stats?.pendingOrders || 0}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-emerald-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setView('financial')}>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Receita do Dia</p>
                    <h3 className="text-3xl font-black text-emerald-600">Kz {stats?.revenue?.toLocaleString()}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-orange-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setView('products')}>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Stock de Produtos</p>
                    <h3 className="text-4xl font-black text-gray-800">{stats?.productsCount || 0}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-purple-500">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Avaliação Média</p>
                    <h3 className="text-4xl font-black text-gray-800 flex items-center gap-2">5.0 <Star className="fill-purple-500 text-purple-500" size={24}/></h3>
                </Card>
            </div>
        </div>
    );
};

export const PharmacyOrdersModule = ({ pharmacyId, onUpdate }: { pharmacyId: string, onUpdate: () => void }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const load = async () => { 
        setLoading(true); 
        setOrders(await fetchOrders(pharmacyId)); 
        setLoading(false); 
    };

    useEffect(() => { load(); }, [pharmacyId]);

    const handleAction = async (orderId: string, nextStatus: OrderStatus) => {
        if(await updateOrderStatus(orderId, nextStatus)) {
            playSound('success');
            load();
            onUpdate();
        }
    };

    const getActionConfig = (status: OrderStatus, type: 'DELIVERY' | 'PICKUP') => {
        switch(status) {
            case OrderStatus.PENDING: 
                return { label: 'Aceitar Pedido', next: OrderStatus.PREPARING, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', icon: <CheckCircle2 size={16}/> };
            case OrderStatus.PREPARING: 
                const nextS = type === 'DELIVERY' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY_FOR_PICKUP;
                const label = type === 'DELIVERY' ? 'Enviar p/ Entrega' : 'Pronto p/ Levantamento';
                return { label: label, next: nextS, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', icon: <Truck size={16}/> };
            case OrderStatus.OUT_FOR_DELIVERY:
            case OrderStatus.READY_FOR_PICKUP: 
                return { label: 'Finalizar Pedido', next: OrderStatus.COMPLETED, color: 'bg-emerald-600 text-white hover:bg-emerald-700', icon: <CheckCircle2 size={16}/> };
            default: return null;
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
            const isFinished = o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
            return matchesSearch && (showHistory ? isFinished : !isFinished);
        });
    }, [orders, searchTerm, showHistory]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800">Gerenciar Pedidos</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <button 
                            onClick={() => setShowHistory(false)}
                            className={`text-xs font-black uppercase tracking-widest transition-colors ${!showHistory ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Ativos ({orders.filter(o => o.status !== OrderStatus.COMPLETED && !o.status.includes('Cancelado')).length})
                        </button>
                        <span className="text-gray-200">|</span>
                        <button 
                            onClick={() => setShowHistory(true)}
                            className={`text-xs font-black uppercase tracking-widest transition-colors ${showHistory ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Histórico
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-white border rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-1 md:w-64 shadow-sm">
                        <Search size={18} className="text-gray-300"/>
                        <input 
                            placeholder="Buscar cliente ou ID..." 
                            className="bg-transparent outline-none text-sm w-full font-bold text-gray-700" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 animate-pulse">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> {loading ? 'Sincronizando...' : 'Atualizado'}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="p-6">ID / Tipo</th>
                            <th className="p-6">Cliente</th>
                            <th className="p-6">Total</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center">
                                    <div className="flex flex-col items-center opacity-20">
                                        <Package size={64}/>
                                        <p className="mt-4 font-black text-sm uppercase">Nenhum pedido encontrado</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(o => {
                                const action = getActionConfig(o.status, o.type);
                                return (
                                    <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-mono text-xs font-black text-gray-800 uppercase tracking-tighter">#{o.id.slice(0, 8)}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase flex items-center gap-1">
                                                {o.type === 'DELIVERY' ? <Bike size={10}/> : <Store size={10}/>} {o.type === 'DELIVERY' ? 'Entrega' : 'Levantamento'}
                                            </p>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-black text-gray-800 text-sm mb-2">{o.customerName}</p>
                                            <div className="flex gap-2">
                                                <a 
                                                    href={`tel:${o.customerPhone}`} 
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                                                >
                                                    <Phone size={10}/> Ligar
                                                </a>
                                                <a 
                                                    href={`https://wa.me/${o.customerPhone?.replace(/\D/g,'')}`} 
                                                    target="_blank" 
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase hover:bg-green-600 hover:text-white transition-all"
                                                >
                                                    <MessageCircle size={10}/> WhatsApp
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="font-black text-gray-700 text-sm">Kz {o.total.toLocaleString()}</span>
                                        </td>
                                        <td className="p-6">
                                            <Badge color={
                                                o.status === OrderStatus.COMPLETED ? 'green' : 
                                                o.status.includes('Cancelado') ? 'red' : 
                                                o.status === OrderStatus.PREPARING ? 'blue' : 'yellow'
                                            }>
                                                {o.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {action ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleAction(o.id, action.next)}
                                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase transition-all shadow-sm ${action.color}`}
                                                        >
                                                            {action.label} {action.icon}
                                                        </button>
                                                        {o.status === OrderStatus.PENDING && (
                                                            <button 
                                                                onClick={() => handleAction(o.id, OrderStatus.REJECTED)}
                                                                className="p-2.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                                                title="Recusar Pedido"
                                                            >
                                                                <XCircle size={18}/>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1">
                                                        <CheckCircle2 size={14}/> Finalizado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
