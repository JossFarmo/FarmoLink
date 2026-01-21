
import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { Order, OrderStatus, Pharmacy } from '../types';
import { 
    fetchOrders, updateOrderStatus, togglePharmacyAvailability, 
    togglePharmacyDelivery, fetchPharmacyById, fetchPrescriptionRequests 
} from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { 
    Clock, Package, Star, RefreshCw, Truck, Search, 
    CheckCircle2, Loader2, Bell, Check, X, Phone, BrainCircuit
} from 'lucide-react';
import { playSound } from '../services/soundService';

export const PharmacyUrgentAlert = ({ alert, onResolve }: { alert: {type: 'ORDER' | 'RX', count: number}, onResolve: (target: string) => void }) => {
    return (
        <div className="mb-6 animate-bounce">
            <div className="bg-red-600 text-white p-5 rounded-[28px] shadow-2xl border-4 border-yellow-400 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Bell size={28} className="animate-ring" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black uppercase tracking-tighter leading-tight">Ação Urgente!</h4>
                        <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest">
                            {alert.type === 'ORDER' ? `Novo pedido direto pendente (${alert.count})` : `Nova receita para triagem ou cotação`}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => onResolve(alert.type === 'ORDER' ? 'pharmacy-orders' : 'pharmacy-requests')}
                    className="px-8 py-3 bg-yellow-400 text-red-900 rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg relative z-10 uppercase"
                >
                    ATENDER AGORA
                </button>
                <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse"></div>
            </div>
        </div>
    );
};

export const PharmacyOverview = ({ stats, pharmacyId, onRefresh, setView }: any) => {
    const [toggling, setToggling] = useState<string | null>(null);
    const [myPharmacy, setMyPharmacy] = useState<Pharmacy | null>(null);
    const [urgentAlert, setUrgentAlert] = useState<{type: 'ORDER' | 'RX', count: number} | null>(null);
    const soundIntervalRef = useRef<any>(null);

    useEffect(() => {
        if (!pharmacyId) return;
        loadMyPharmacy();
        checkTasks();

        // CANAL REALTIME REFORÇADO: Escuta notificações do sistema para disparar alarme
        const channel = supabase
            .channel(`pharmacy-global-monitor-${pharmacyId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
                onRefresh(); checkTasks();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, () => {
                onRefresh(); checkTasks();
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel);
            if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
        };
    }, [pharmacyId]);

    const loadMyPharmacy = async () => {
        const data = await fetchPharmacyById(pharmacyId);
        if (data) setMyPharmacy(data);
    };

    const checkTasks = async () => {
        const [orders, rx] = await Promise.all([
            fetchOrders(pharmacyId),
            fetchPrescriptionRequests('PHARMACY' as any, undefined, pharmacyId)
        ]);
        
        const pOrders = orders.filter(o => o.status === OrderStatus.PENDING).length;
        const pRx = rx.filter(r => (r.status === 'WAITING_FOR_QUOTES' && !r.quotes?.some(q => q.pharmacyId === pharmacyId)) || r.status === 'UNDER_REVIEW').length;

        if (pOrders > 0) {
            setUrgentAlert({ type: 'ORDER', count: pOrders });
            startAlarm();
        } else if (pRx > 0) {
            setUrgentAlert({ type: 'RX', count: pRx });
            startAlarm();
        } else {
            setUrgentAlert(null);
            if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
            soundIntervalRef.current = null;
        }
    };

    const startAlarm = () => {
        if (soundIntervalRef.current) return;
        playSound('notification');
        soundIntervalRef.current = setInterval(() => playSound('notification'), 8000);
    };

    const handleToggle = async (type: 'ONLINE' | 'DELIVERY') => {
        if (!myPharmacy || toggling) return;
        setToggling(type);
        const isOnline = type === 'ONLINE';
        const newVal = isOnline ? !myPharmacy.isAvailable : !myPharmacy.deliveryActive;

        setMyPharmacy(prev => prev ? { ...prev, [isOnline ? 'isAvailable' : 'deliveryActive']: newVal } : null);
        playSound(newVal ? 'success' : 'click');

        const ok = isOnline ? await togglePharmacyAvailability(pharmacyId, newVal) : await togglePharmacyDelivery(pharmacyId, newVal);
        if (!ok) loadMyPharmacy();
        setToggling(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {urgentAlert && <PharmacyUrgentAlert alert={urgentAlert} onResolve={(target) => {
                if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
                soundIntervalRef.current = null;
                setView(target);
            }} />}

            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Monitor Operacional</h1>
                        {myPharmacy?.receives_low_conf_rx && (
                            <span className="bg-orange-50 text-orange-600 text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 border border-orange-100 animate-pulse">
                                <BrainCircuit size={10}/> MODO ESPECIALISTA
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronizado via FarmoLink Core</p>
                </div>
                
                <div className="flex items-center gap-4 bg-gray-50 p-2 px-6 rounded-[22px] border border-gray-100">
                    <div className="flex items-center gap-3 border-r pr-4">
                        <span className={`text-[9px] font-black uppercase ${myPharmacy?.isAvailable ? 'text-emerald-600' : 'text-gray-400'}`}>ABERTA</span>
                        <button onClick={() => handleToggle('ONLINE')} disabled={!!toggling} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${myPharmacy?.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ml-1 ${myPharmacy?.isAvailable ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase ${myPharmacy?.deliveryActive ? 'text-blue-600' : 'text-gray-400'}`}>ENTREGAS</span>
                        <button onClick={() => handleToggle('DELIVERY')} disabled={!!toggling} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${myPharmacy?.deliveryActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ml-1 ${myPharmacy?.deliveryActive ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setView('pharmacy-orders')}>
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Vendas Ativas</p>
                    <h3 className="text-4xl font-black text-gray-800">{stats?.pendingOrders || 0}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-orange-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setView('pharmacy-requests')}>
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Receitas / IA</p>
                    <h3 className="text-4xl font-black text-orange-600">{stats?.rxCount || 0}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-emerald-500">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Receita Hoje</p>
                    <h3 className="text-3xl font-black text-emerald-600">Kz {stats?.revenue?.toLocaleString()}</h3>
                </Card>
                <Card className="p-6 border-l-4 border-purple-500">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Reputação</p>
                    <h3 className="text-4xl font-black text-gray-800 flex items-center gap-2">5.0 <Star className="fill-purple-500 text-purple-500" size={24}/></h3>
                </Card>
            </div>
        </div>
    );
};

export const PharmacyOrdersModule = ({ pharmacyId, onUpdate }: { pharmacyId: string, onUpdate: () => void }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    const load = async () => { 
        if (!pharmacyId) return;
        setLoading(true); 
        const data = await fetchOrders(pharmacyId);
        setOrders(data); 
        setLoading(false); 
    };

    useEffect(() => { 
        load();
        const sub = supabase.channel(`order-live-updates-${pharmacyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, load)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [pharmacyId]);

    const handleAction = async (orderId: string, next: OrderStatus) => {
        if(await updateOrderStatus(orderId, next)) {
            playSound('success'); load(); onUpdate();
        }
    };

    const getAction = (o: Order) => {
        if (o.status === OrderStatus.PENDING) return { label: 'ACEITAR', next: OrderStatus.PREPARING, color: 'bg-emerald-100 text-emerald-800' };
        if (o.status === OrderStatus.PREPARING) return { label: o.type === 'DELIVERY' ? 'DESPACHAR' : 'PRONTO', next: o.type === 'DELIVERY' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY_FOR_PICKUP, color: 'bg-blue-100 text-blue-800' };
        if (o.status === OrderStatus.OUT_FOR_DELIVERY || o.status === OrderStatus.READY_FOR_PICKUP) return { label: 'ENTREGUE', next: OrderStatus.COMPLETED, color: 'bg-emerald-600 text-white' };
        return null;
    };

    const list = orders.filter(o => {
        const isP = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status);
        return activeTab === 'PENDING' ? isP : !isP;
    });

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('PENDING')} className={`text-xs font-black uppercase transition-all ${activeTab === 'PENDING' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400'}`}>PENDENTES</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`text-xs font-black uppercase transition-all ${activeTab === 'HISTORY' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400'}`}>HISTÓRICO</button>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <RefreshCw size={20} className={loading ? 'animate-spin text-emerald-600' : 'text-gray-400'}/>
                </button>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr><th className="p-5">CÓDIGO</th><th className="p-5">CLIENTE</th><th className="p-5 text-right">TOTAL</th><th className="p-5 text-center">ESTADO</th><th className="p-5 text-right">ACÇÃO</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {list.map(o => {
                                const act = getAction(o);
                                return (
                                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-5">
                                            <p className="text-[10px] font-black text-gray-300">#{o.id.slice(0,6).toUpperCase()}</p>
                                            <p className="text-xs font-bold text-gray-700">{o.date.split(',')[1]}</p>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-black text-gray-800">{o.customerName}</p>
                                                {o.customerPhone && (
                                                    <a href={`tel:${o.customerPhone}`} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Ligar para Cliente">
                                                        <Phone size={12}/>
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{o.type}</p>
                                        </td>
                                        <td className="p-5 text-right font-black text-emerald-600 text-xs">Kz {o.total.toLocaleString()}</td>
                                        <td className="p-5 text-center"><Badge color={o.status === OrderStatus.COMPLETED ? 'green' : 'yellow'}>{o.status.toUpperCase()}</Badge></td>
                                        <td className="p-5 text-right">
                                            {act && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleAction(o.id, act.next)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm ${act.color}`}>{act.label}</button>
                                                    {o.status === OrderStatus.PENDING && <button onClick={() => handleAction(o.id, OrderStatus.REJECTED)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
