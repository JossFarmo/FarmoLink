
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { Pharmacy, Order } from '../types';
import { getAdminStats, fetchPharmacies, fetchOrders } from '../services/dataService';
import { Users, Store, ShoppingBag, Activity, TrendingUp, History, Settings, ShieldCheck, Database, Search, RefreshCw, Eye, Zap } from 'lucide-react';

export const AdminOverview = ({ setView }: any) => {
    const [stats, setStats] = useState({ users: 0, pharmacies: 0, ordersToday: 0, totalRevenue: 0 });
    const [onlinePharmacies, setOnlinePharmacies] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { 
        const load = async () => {
            const s = await getAdminStats();
            const ph = await fetchPharmacies(true);
            setStats(s);
            setOnlinePharmacies(ph.filter(p => p.isAvailable).length);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setView('users')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Usuários</p>
                        <h3 className="text-3xl font-black text-gray-800">{loading ? '...' : stats.users}</h3>
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Users size={28}/>
                    </div>
                </div>
                <div onClick={() => setView('pharmacies')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Parceiros</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-gray-800">{loading ? '...' : stats.pharmacies}</h3>
                            {!loading && (
                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    {onlinePharmacies} Online
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Store size={28}/>
                    </div>
                </div>
                <div onClick={() => setView('orders')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Ordens Hoje</p>
                        <h3 className="text-3xl font-black text-gray-800">{loading ? '...' : stats.ordersToday}</h3>
                    </div>
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all">
                        <ShoppingBag size={28}/>
                    </div>
                </div>
                <div onClick={() => setView('financial')} className="bg-emerald-900 p-6 rounded-3xl shadow-lg text-white flex items-center justify-between relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Volume do Dia</p>
                        <h3 className="text-2xl font-black">Kz {loading ? '...' : stats.totalRevenue.toLocaleString()}</h3>
                        <p className="text-[10px] text-emerald-300 mt-2 font-bold flex items-center gap-1"><TrendingUp size={10}/> Gestão</p>
                    </div>
                    <Activity size={48} className="text-emerald-800 opacity-50 relative z-10"/>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Ações Rápidas" className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Button variant="outline" className="text-xs py-3" onClick={() => setView('settings')}><Settings size={14}/> Sistema</Button>
                        <Button variant="outline" className="text-xs py-3" onClick={() => setView('security')}><ShieldCheck size={14}/> Segurança</Button>
                        <Button variant="outline" className="text-xs py-3" onClick={() => setView('catalog')}><Database size={14}/> Catálogo</Button>
                    </div>
                </Card>
                <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 flex flex-col justify-center items-center text-center">
                    <History size={24} className="text-gray-300 mb-2"/>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Atividade Recente</p>
                    <p className="text-xs text-gray-400">Monitoramento da rede FarmoLink.</p>
                </div>
            </div>
        </div>
    );
};

export const AdminGlobalOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [oData, pData] = await Promise.all([fetchOrders(), fetchPharmacies(true)]);
        setOrders(oData);
        setPharmacies(pData);
        setLoading(false);
    };

    const filtered = orders.filter(o => 
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Monitoramento da Rede</h2>
                    <p className="text-sm text-gray-500">Fluxo transacional completo.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-gray-50 border rounded-xl px-3 py-2 flex items-center gap-2 flex-1 md:w-64">
                        <Search size={18} className="text-gray-400"/>
                        <input placeholder="ID ou Cliente..." className="bg-transparent outline-none text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                    <button onClick={loadData} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                </div>
            </div>
            <Card className="p-0 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="p-5">Pedido</th><th className="p-5">Origem</th><th className="p-5">Cliente</th><th className="p-5">Valor</th><th className="p-5 text-center">Status</th><th className="p-5 text-right">Ação</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filtered.map(o => {
                            const pharm = pharmacies.find(p => p.id === o.pharmacyId);
                            return (
                                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-5"><p className="font-mono text-xs font-bold text-gray-800">#{o.id.slice(0,8)}</p></td>
                                    <td className="p-5"><span className="font-bold text-gray-700">{pharm?.name || '---'}</span></td>
                                    <td className="p-5"><p className="font-bold text-gray-800">{o.customerName}</p></td>
                                    <td className="p-5"><span className="font-black text-emerald-600">Kz {o.total.toLocaleString()}</span></td>
                                    <td className="p-5 text-center"><Badge color={o.status === 'Concluído' ? 'green' : (o.status.includes('Cancelado') ? 'red' : 'blue')}>{o.status}</Badge></td>
                                    <td className="p-5 text-right"><button className="p-2 text-gray-400 hover:text-emerald-600"><Eye size={18}/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};
