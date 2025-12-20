
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Toast, Button } from '../components/UI';
import { Pharmacy, User, UserRole } from '../types';
import { 
    fetchPharmacies, approvePharmacy, deletePharmacy, 
    fetchAllUsers, adminUpdateUser, updatePharmacyDetails, 
    updatePharmacyCommission, resetCustomerData, 
    recoverPharmacyLink, togglePharmacyAvailability 
} from '../services/dataService';
import { 
    RefreshCw, UserCog, Edit, Ban, Trash2, X, Store, 
    Bike, ShieldCheck, Save, Loader2, RotateCcw, 
    Link2, Power, Search, Hash, MapPin, Phone, DollarSign 
} from 'lucide-react';
import { playSound } from '../services/soundService';

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const AdminUserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [q, setQ] = useState('');

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        const data = await fetchAllUsers();
        setUsers(data);
        setLoading(false);
    };

    const filtered = useMemo(() => users.filter(u => normalizeText(u.name + u.email).includes(normalizeText(q))), [users, q]);

    const handleSave = async () => {
        if (!editing) return;
        setLoading(true);
        const res = await adminUpdateUser(editing.id, { name: editing.name, phone: editing.phone || '', role: editing.role });
        setLoading(false);
        if (res.success) {
            setToast({msg: "Usuário modificado!", type: 'success'});
            setEditing(null);
            load();
        }
    };

    const handleRepairLink = async (u: User) => {
        setLoading(true);
        const pharmId = await recoverPharmacyLink(u);
        setLoading(false);
        if (pharmId) {
            playSound('success');
            setToast({ msg: "Vínculo restaurado!", type: 'success' });
            load();
        } else {
            playSound('error');
            setToast({ msg: "Falha ao reparar vínculo.", type: 'error' });
        }
    };

    const handleReset = async (u: User) => {
        if (!confirm(`Deseja REINICIAR a conta de ${u.name}?`)) return;
        setLoading(true);
        const success = await resetCustomerData(u.id, u.name);
        setLoading(false);
        if (success) {
            playSound('trash');
            setToast({ msg: "Conta reiniciada!", type: 'success' });
            load();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {toast && <Toast message={toast.msg} type={toast.type === 'success' ? 'success' : 'error'} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Diretório de Usuários</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gestão global de credenciais</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-gray-50 border rounded-xl px-3 py-2 flex items-center gap-2 flex-1 md:w-64">
                        <Search size={18} className="text-gray-400"/>
                        <input placeholder="Filtrar por nome ou email..." className="bg-transparent outline-none text-sm w-full font-medium" value={q} onChange={e => setQ(e.target.value)}/>
                    </div>
                    <button onClick={load} className="p-3 bg-white border rounded-2xl hover:bg-gray-100 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b text-[10px] uppercase font-black text-gray-400 tracking-widest">
                        <tr><th className="p-5">Perfil</th><th className="p-5">Cargo</th><th className="p-5 text-right">Ação</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filtered.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.role === 'PHARMACY' ? 'bg-emerald-100 text-emerald-700' : (u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}`}>
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{u.name}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <Badge color={u.role === 'ADMIN' ? 'red' : (u.role === 'PHARMACY' ? 'green' : 'blue')}>{u.role}</Badge>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {u.role === 'PHARMACY' && (
                                            <button onClick={() => handleRepairLink(u)} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 text-[10px] font-black" title="Reparar Vínculo de Loja"><Link2 size={14}/> VINCULAR</button>
                                        )}
                                        <button onClick={() => setEditing(u)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><UserCog size={18}/></button>
                                        <button onClick={() => handleReset(u)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-600 hover:text-white transition-all" title="Reiniciar Dados do Cliente"><RotateCcw size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {editing && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md p-8 animate-scale-in">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">Editar Perfil</h3><button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button></div>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nome</label><input className="w-full p-3 border rounded-xl" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})}/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Telefone</label><input className="w-full p-3 border rounded-xl" value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})}/></div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Acesso</label>
                                <select className="w-full p-3 border rounded-xl" value={editing.role} onChange={e => setEditing({...editing, role: e.target.value as UserRole})}>
                                    <option value="CUSTOMER">Cliente</option>
                                    <option value="PHARMACY">Farmácia</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-6"><Button className="flex-1 py-4 font-black" onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Aplicar Alterações'}</Button></div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export const AdminPharmacyManagement = () => {
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Pharmacy | null>(null);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [q, setQ] = useState('');

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        const data = await fetchPharmacies(true);
        setPharmacies(data);
        setLoading(false);
    };

    const filtered = useMemo(() => pharmacies.filter(p => normalizeText(p.name + p.ownerEmail).includes(normalizeText(q))), [pharmacies, q]);

    const handleUpdate = async () => {
        if(!editing) return;
        setLoading(true);
        const success = await updatePharmacyDetails(editing.id, { 
            name: editing.name, nif: editing.nif || '', address: editing.address, 
            deliveryFee: editing.deliveryFee, minTime: editing.minTime, 
            phone: editing.phone || '', rating: editing.rating 
        });
        await togglePharmacyAvailability(editing.id, editing.isAvailable);
        await updatePharmacyCommission(editing.id, editing.commissionRate || 10);
        setLoading(false);
        if(success) { 
            setToast({msg: "Dados Atualizados!", type: 'success'}); 
            setEditing(null); 
            load(); 
        }
    };

    const handleQuickToggleStatus = async (p: Pharmacy) => {
        setActionLoading(p.id + '_status');
        if(await togglePharmacyAvailability(p.id, !p.isAvailable)) { 
            playSound(!p.isAvailable ? 'success' : 'click'); 
            await load(); 
        }
        setActionLoading(null);
    };

    const handleQuickToggleDelivery = async (p: Pharmacy) => {
        setActionLoading(p.id + '_delivery');
        const newFee = p.deliveryFee > 0 ? 0 : 600;
        if(await updatePharmacyDetails(p.id, { ...p, nif: p.nif || '', phone: p.phone || '', deliveryFee: newFee })) { 
            playSound(newFee > 0 ? 'success' : 'click'); 
            await load(); 
        }
        setActionLoading(null);
    };

    const handleApprove = async (id: string) => {
        if(!confirm("Aprovar esta farmácia para começar a vender?")) return;
        setLoading(true);
        if((await approvePharmacy(id)).success) { 
            playSound('success'); 
            setToast({msg: "Farmácia aprovada!", type: 'success'}); 
            load(); 
        }
        setLoading(false);
    };

    const handleFreeze = async (p: Pharmacy) => {
        const newStatus = p.status === 'BLOCKED' ? 'APPROVED' : 'BLOCKED';
        if(!confirm(`Deseja alterar o status desta farmácia para ${newStatus}?`)) return;
        setLoading(true);
        const { error = null } = await (window as any).supabase.from('pharmacies').update({ status: newStatus }).eq('id', p.id);
        setLoading(false);
        if(!error) { 
            playSound(newStatus === 'APPROVED' ? 'success' : 'error'); 
            load(); 
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if(!confirm(`ELIMINAR permanentemente a farmácia ${name}? Todos os produtos e histórico serão perdidos.`)) return;
        setLoading(true);
        if(await deletePharmacy(id)) { 
            playSound('trash'); 
            load(); 
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {toast && <Toast message={toast.msg} type={toast.type === 'success' ? 'success' : 'error'} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Parceiros de Rede</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase">Gestão de acessos, comissões e logística</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-gray-50 border rounded-xl px-3 py-2 flex items-center gap-2 flex-1 md:w-64">
                        <Search size={18} className="text-gray-400"/>
                        <input placeholder="Filtrar farmácias..." className="bg-transparent outline-none text-sm w-full font-medium" value={q} onChange={e => setQ(e.target.value)}/>
                    </div>
                    <button onClick={load} className="p-3 bg-white border rounded-2xl hover:bg-gray-100 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                </div>
            </div>

            <div className="grid gap-4">
                {filtered.map(p => (
                    <div key={p.id} className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all ${p.status === 'BLOCKED' ? 'opacity-70 grayscale' : ''}`}>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-inner bg-emerald-50 text-emerald-700">{p.name.charAt(0)}</div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 text-lg truncate max-w-[250px]">{p.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <Badge color={p.status === 'APPROVED' ? 'green' : (p.status === 'BLOCKED' ? 'red' : 'yellow')}>
                                        {p.status === 'APPROVED' ? 'ATIVO' : (p.status === 'BLOCKED' ? 'BLOQUEADO' : 'PENDENTE')}
                                    </Badge>
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Comissão: {p.commissionRate}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                             <div className="flex flex-col items-center gap-1">
                                <button onClick={() => handleQuickToggleStatus(p)} disabled={!!actionLoading} className={`p-2 rounded-xl transition-all ${p.isAvailable ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-200'}`}>
                                    {actionLoading === p.id + '_status' ? <Loader2 size={16} className="animate-spin"/> : <Power size={18}/>}
                                </button>
                                <span className="text-[8px] font-black uppercase text-gray-400">Loja</span>
                             </div>
                             <div className="flex flex-col items-center gap-1">
                                <button onClick={() => handleQuickToggleDelivery(p)} disabled={!!actionLoading} className={`p-2 rounded-xl transition-all ${p.deliveryFee > 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200'}`}>
                                    {actionLoading === p.id + '_delivery' ? <Loader2 size={16} className="animate-spin"/> : <Bike size={18}/>}
                                </button>
                                <span className="text-[8px] font-black uppercase text-gray-400">Entrega</span>
                             </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {p.status === 'PENDING' ? (
                                <button onClick={() => handleApprove(p.id)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg">APROVAR AGORA</button>
                            ) : (
                                <button onClick={() => handleFreeze(p)} className="p-3 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all">
                                    {p.status === 'BLOCKED' ? <ShieldCheck size={20}/> : <Ban size={20}/>}
                                </button>
                            )}
                            <button onClick={() => setEditing(p)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={20}/></button>
                            <button onClick={() => handleDelete(p.id, p.name)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {editing && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h3 className="font-black text-2xl flex items-center gap-2 text-gray-800"><Store className="text-emerald-600"/> Configuração de Parceiro</h3>
                            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Hash size={14}/> Dados Comerciais</h4>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Nome Comercial</label><input className="w-full p-3 border rounded-xl" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">NIF</label><input className="w-full p-3 border rounded-xl" value={editing.nif || ''} onChange={e => setEditing({...editing, nif: e.target.value})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Contacto WhatsApp</label><input className="w-full p-3 border rounded-xl" value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})}/></div>
                            </div>
                            
                            <div className="space-y-5">
                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Regras de Negócio</h4>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Taxa Entrega Padrão (Kz)</label><input type="number" className="w-full p-3 border rounded-xl" value={editing.deliveryFee} onChange={e => setEditing({...editing, deliveryFee: Number(e.target.value)})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Comissão FarmoLink (%)</label><input type="number" className="w-full p-3 border rounded-xl font-bold text-blue-600" value={editing.commissionRate} onChange={e => setEditing({...editing, commissionRate: Number(e.target.value)})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Avaliação Global</label><input type="number" step="0.1" className="w-full p-3 border rounded-xl" value={editing.rating} onChange={e => setEditing({...editing, rating: Number(e.target.value)})}/></div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block"><MapPin size={10}/> Localização Exata</label>
                            <textarea className="w-full p-3 border rounded-xl h-20 text-sm" value={editing.address} onChange={e => setEditing({...editing, address: e.target.value})}/>
                        </div>

                        <div className="flex gap-3 pt-10 border-t mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
                            <Button className="flex-[2] py-4 font-black shadow-xl" onClick={handleUpdate} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2"/> : <Save size={20} className="mr-2"/>} 
                                Gravar Configurações
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
