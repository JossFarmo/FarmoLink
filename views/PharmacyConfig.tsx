
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import { PharmacyInput, User } from '../types';
import { fetchPharmacyById, updatePharmacyDetails } from '../services/dataService';
import { Settings, Save, Megaphone, Star, Lock, Truck, Clock, Phone, MapPin, Hash, Store, RefreshCw, LogOut, Mail, Loader2 } from 'lucide-react';
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
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-24">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Settings size={24}/>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Configurações da Loja</h1>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Controle de identidade e logística</p>
                </div>
            </div>

            <Card className="shadow-sm border-gray-100 p-0 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b">
                    <h3 className="font-black text-gray-700 text-sm flex items-center gap-2"><Settings size={16} className="text-emerald-500"/> Identidade Visual & Legal</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Store size={10}/> Nome Fantasia</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold" value={data.name} onChange={e => setData({...data, name: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Hash size={10}/> NIF (Identificação Fiscal)</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono" value={data.nif} onChange={e => setData({...data, nif: e.target.value})}/>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Endereço Completo</label>
                        <textarea className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-h-[100px]" value={data.address} onChange={e => setData({...data, address: e.target.value})}/>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Telefone de Contacto (WhatsApp)</label>
                        <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={data.phone} onChange={e => setData({...data, phone: e.target.value})}/>
                    </div>
                </div>
            </Card>

            <Card className="shadow-sm border-gray-100 p-0 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b">
                    <h3 className="font-black text-gray-700 text-sm flex items-center gap-2"><Truck size={16} className="text-blue-500"/> Logística & Entregas</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Truck size={10}/> Taxa de Entrega (Kz)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">Kz</span>
                                <input type="number" className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-blue-600" value={data.deliveryFee} onChange={e => setData({...data, deliveryFee: Number(e.target.value)})}/>
                            </div>
                            <p className="text-[9px] text-gray-400 italic">* Defina 0 para desativar o serviço de entrega.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> Tempo Médio</label>
                            <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ex: 30 - 60 min" value={data.minTime} onChange={e => setData({...data, minTime: e.target.value})}/>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex gap-4">
                <Button onClick={handleSave} disabled={loading} className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-700 font-black text-lg shadow-xl shadow-emerald-100">
                    {loading ? 'Processando...' : <span className="flex items-center gap-2 justify-center"><Save size={20}/> Gravar Todas as Alterações</span>}
                </Button>
            </div>
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
        <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
            <div className="animate-fade-in max-w-sm w-full">
                <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Lock size={48} className={isChecking ? "animate-spin" : "animate-pulse"}/>
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-2">Conta em Análise</h1>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">Nossa equipe administrativa está validando seu cadastro para garantir a segurança da rede. Isso costuma levar menos de 24 horas.</p>
                
                {user && (
                    <div className="bg-gray-100 p-4 rounded-2xl mb-8 text-left border border-gray-200">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Informações da Conta (Para Admin)</p>
                        <p className="text-xs font-bold text-gray-700 flex items-center gap-2 mb-1"><Mail size={12}/> {user.email}</p>
                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-2"><Hash size={12}/> ID da Farmácia: <span className="select-all">{user.pharmacyId}</span></p>
                    </div>
                )}

                <div className="space-y-3">
                    <Button onClick={handleCheck} disabled={isChecking} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                        {isChecking ? <Loader2 className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
                        {isChecking ? "Sincronizando..." : "Verificar Agora"}
                    </Button>
                    <button 
                        onClick={onLogout}
                        className="w-full py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 text-xs font-black uppercase transition-colors"
                    >
                        <LogOut size={16}/> Sair da Conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PharmacyPromotionsView = () => (
    <div className="animate-fade-in">
        <Card className="p-20 text-center text-gray-300 border-dashed border-2 flex flex-col items-center justify-center">
            <Megaphone size={60} className="mb-4 opacity-10"/>
            <h3 className="font-black uppercase tracking-widest text-sm">Módulo de Promoções</h3>
            <p className="text-[10px] font-bold mt-2">EM BREVE: Crie ofertas relâmpago para seus clientes.</p>
        </Card>
    </div>
);

export const PharmacyReviewsView = () => (
    <div className="animate-fade-in">
        <Card className="p-20 text-center text-gray-300 border-dashed border-2 flex flex-col items-center justify-center">
            <Star size={60} className="mb-4 opacity-10"/>
            <h3 className="font-black uppercase tracking-widest text-sm">Avaliações dos Clientes</h3>
            <p className="text-[10px] font-bold mt-2">Visualize o que os pacientes dizem sobre seu atendimento.</p>
        </Card>
    </div>
);
