import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { PharmacyInput, User } from '../types';
import { fetchPharmacyById, updatePharmacyDetails, fetchPharmacyReviews } from '../services/dataService';
import { Settings, Save, Megaphone, Star, Lock, Truck, Clock, Phone, MapPin, Hash, Store, RefreshCw, LogOut, Mail, Loader2, MessageSquare } from 'lucide-react';
import { playSound } from '../services/soundService';

export const PharmacySettingsView = ({ pharmacyId, onComplete }: { pharmacyId?: string, onComplete?: () => void }) => {
    const [data, setData] = useState<PharmacyInput>({ name: '', nif: '', address: '', deliveryFee: 0, minTime: '', rating: 5, phone: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(pharmacyId) loadData(); }, [pharmacyId]);
    const loadData = async () => {
        const pharm = await fetchPharmacyById(pharmacyId!);
        if(pharm) setData({ 
            name: pharm.name, 
            nif: pharm.nif || '', 
            address: pharm.address, 
            deliveryFee: pharm.deliveryFee, 
            minTime: pharm.minTime, 
            rating: pharm.rating, 
            phone: pharm.phone || '' 
        });
    };

    const handleSave = async () => {
        if (!data.name || !data.address) return alert("Nome e endereço são obrigatórios!");
        setLoading(true);
        if(await updatePharmacyDetails(pharmacyId!, data)) { 
            playSound('save'); 
            alert("Configurações atualizadas com sucesso!"); 
            if(onComplete) onComplete(); 
        } else {
            alert("Erro ao salvar configurações.");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-24 px-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Settings size={24}/>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Configurações da Loja</h1>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Identidade Visual e Logística</p>
                </div>
            </div>

            <Card className="shadow-sm border-gray-100 p-0 overflow-hidden rounded-[32px]">
                <div className="p-6 bg-gray-50 border-b">
                    <h3 className="font-black text-gray-700 text-sm flex items-center gap-2 uppercase tracking-tight">Dados Comerciais</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold" value={data.name} onChange={e => setData({...data, name: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF (Fiscal)</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-mono" value={data.nif} onChange={e => setData({...data, nif: e.target.value})}/>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Morada de Operação</label>
                        <textarea className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all min-h-[100px] font-medium text-sm" value={data.address} onChange={e => setData({...data, address: e.target.value})}/>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                        <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold" value={data.phone} onChange={e => setData({...data, phone: e.target.value})}/>
                    </div>
                </div>
            </Card>

            <Card className="shadow-sm border-gray-100 p-0 overflow-hidden rounded-[32px]">
                <div className="p-6 bg-gray-50 border-b">
                    <h3 className="font-black text-gray-700 text-sm flex items-center gap-2 uppercase tracking-tight">Logística de Entrega</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Taxa de Entrega (Kz)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm">Kz</span>
                                <input type="number" className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-blue-600" value={data.deliveryFee} onChange={e => setData({...data, deliveryFee: Number(e.target.value)})}/>
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase ml-1 italic">Defina como 0 para retirar no local.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tempo Médio Esperado</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold" placeholder="Ex: 30 - 60 min" value={data.minTime} onChange={e => setData({...data, minTime: e.target.value})}/>
                        </div>
                    </div>
                </div>
            </Card>

            <Button onClick={handleSave} disabled={loading} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 font-black text-lg rounded-3xl shadow-xl shadow-emerald-100 uppercase tracking-widest">
                {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2"><Save size={20}/> Gravar Alterações</span>}
            </Button>
        </div>
    );
};

export const PharmacyPendingView = ({ user, onCheckAgain, onLogout }: { user?: User, onCheckAgain: () => Promise<void>, onLogout: () => void }) => {
    const [isChecking, setIsChecking] = useState(false);

    const handleCheck = async () => {
        setIsChecking(true);
        await onCheckAgain();
        setIsChecking(false);
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
            <div className="animate-fade-in max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-yellow-50">
                <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Lock size={48} className={isChecking ? "animate-spin" : "animate-bounce"}/>
                </div>
                <h1 className="text-3xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Acesso Restrito</h1>
                <p className="text-gray-500 text-sm leading-relaxed mb-10 font-medium">Sua conta está sob auditoria de segurança. Nossa equipa em Angola validará seu NIF e farmácia em até 24 horas.</p>
                
                <div className="space-y-4">
                    <Button onClick={handleCheck} disabled={isChecking} className="w-full py-5 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-100 font-black">
                        {isChecking ? <Loader2 className="animate-spin mr-2"/> : "VERIFICAR AGORA"}
                    </Button>
                    <button 
                        onClick={onLogout}
                        className="w-full py-3 text-gray-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        Encerrar Sessão
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PharmacyPromotionsView = () => (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white p-20 rounded-[40px] border-4 border-dashed border-gray-100 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6"><Megaphone size={40}/></div>
            <h3 className="font-black uppercase tracking-widest text-gray-800">Ofertas e Campanhas</h3>
            <p className="text-sm text-gray-400 mt-2 font-bold max-w-xs">Em breve: Crie cupons e ofertas relâmpago para seus clientes.</p>
        </div>
    </div>
);

export const PharmacyReviewsView = ({ pharmacyId }: { pharmacyId: string }) => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await fetchPharmacyReviews(pharmacyId);
            setReviews(data);
            setLoading(false);
        };
        load();
    }, [pharmacyId]);

    return (
        <div className="animate-fade-in max-w-4xl mx-auto px-4 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Avaliações da Rede</h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Feedback direto dos seus pacientes</p>
                </div>
                <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center gap-2">
                    <Star className="fill-yellow-600" size={20}/>
                    <span className="text-xl font-black">5.0</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>
            ) : reviews.length === 0 ? (
                <div className="bg-white p-20 rounded-[40px] border border-dashed text-center flex flex-col items-center">
                    <MessageSquare className="text-gray-100 mb-4" size={60}/>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhum depoimento ainda</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reviews.map((r, i) => (
                        <Card key={i} className="p-8 rounded-[32px] border-gray-100 shadow-sm bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">{r.customer_name.charAt(0)}</div>
                                    <div>
                                        <p className="font-black text-gray-800 text-sm">{r.customer_name}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(r.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, idx) => (
                                        <Star key={idx} size={14} className={idx < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed italic">"{r.comment || 'O cliente não deixou comentários, apenas estrelas.'}"</p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};