
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Toast, Badge } from '../components/UI';
import { FAQItem, SystemContent, RestoreOptions } from '../types';
import { 
    generateFullSystemBackup, restoreFullSystemBackup, sendSystemNotification, 
    fetchFaq, updateFaqItem, addFaqItem, deleteFaqItem,
    fetchAboutUs, updateAboutUs
} from '../services/dataService';
// FIX: Added missing Info icon import
import { 
    Settings, Save, Megaphone, ShieldCheck, Download, 
    UploadCloud, X, CheckCircle2, AlertTriangle, Database, 
    Users, Store, ShoppingBag, FileText, Loader2, Image as ImageIcon,
    MessageSquare, ListPlus, Edit3, Trash2, Globe, Heart, Shield, Eye, Sparkles,
    CheckCircle, Info
} from 'lucide-react';
import { playSound } from '../services/soundService';

export const AdminSettingsView = () => {
    const [tab, setTab] = useState<'RULES' | 'FAQ' | 'ABOUT'>('RULES');
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-2"><Settings className="text-emerald-600"/> Parâmetros do Ecossistema</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestão de Conteúdos das Imagens Oficiais</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button onClick={() => setTab('RULES')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tab === 'RULES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Regras & Alertas</button>
                    <button onClick={() => setTab('FAQ')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tab === 'FAQ' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Gestão de FAQ</button>
                    <button onClick={() => setTab('ABOUT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${tab === 'ABOUT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Institucional</button>
                </div>
            </div>

            {tab === 'RULES' && <RulesTab setToast={setToast} />}
            {tab === 'FAQ' && <FaqTab setToast={setToast} setTab={setTab} />}
            {tab === 'ABOUT' && <AboutTab setToast={setToast} />}
        </div>
    );
};

const RulesTab = ({ setToast }: any) => {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({ commissionRate: 10, minOrderValue: 2000 });
    const [broadcast, setBroadcast] = useState({ title: '', message: '', target: 'ALL' as 'ALL' | 'CUSTOMER' | 'PHARMACY' });

    const handleSaveConfig = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); playSound('save'); setToast({msg: "Configurações Salvas!", type: 'success'}); }, 800);
    };

    const handleSendBroadcast = async () => {
        if (!broadcast.title || !broadcast.message) return;
        setLoading(true);
        const success = await sendSystemNotification(broadcast.target, broadcast.title, broadcast.message);
        setLoading(false);
        if (success) { playSound('success'); setToast({msg: "Comunicado enviado!", type: 'success'}); setBroadcast({ ...broadcast, title: '', message: '' }); }
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            <Card title="Parâmetros de Rede" className="p-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase">Taxa (%)</label><input type="number" className="w-full p-3 border rounded-xl" value={config.commissionRate} onChange={e => setConfig({...config, commissionRate: Number(e.target.value)})}/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase">Min. (Kz)</label><input type="number" className="w-full p-3 border rounded-xl" value={config.minOrderValue} onChange={e => setConfig({...config, minOrderValue: Number(e.target.value)})}/></div>
                    </div>
                    <Button onClick={handleSaveConfig} disabled={loading} className="w-full py-4"><Save size={18} className="mr-2"/> Atualizar Regras</Button>
                </div>
            </Card>
            <Card className="p-8 border-l-8 border-orange-500 shadow-sm">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6"><Megaphone className="text-orange-500"/> Alerta Global</h3>
                <div className="space-y-4">
                    <input className="w-full p-3 border rounded-xl font-bold" placeholder="Assunto..." value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})}/>
                    <textarea className="w-full p-3 border rounded-xl h-24 text-sm" placeholder="Mensagem..." value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})}/>
                    <div className="flex gap-2">
                        <select className="p-3 border rounded-xl text-xs font-bold bg-gray-50" value={broadcast.target} onChange={e => setBroadcast({...broadcast, target: e.target.value as any})}><option value="ALL">Todos</option><option value="CUSTOMER">Clientes</option><option value="PHARMACY">Farmácias</option></select>
                        <Button variant="secondary" className="flex-1 py-4 bg-orange-600 text-white" onClick={handleSendBroadcast} disabled={loading || !broadcast.title}>Enviar Notificação</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

const FaqTab = ({ setToast, setTab }: any) => {
    const [items, setItems] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ question: '', answer: '', order: 0, active: true });

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        setItems(await fetchFaq());
        setLoading(false);
    };

    const handleSave = async (id: string, item: FAQItem) => {
        const ok = await updateFaqItem(id, item);
        if(ok) { playSound('save'); setToast({msg: "FAQ atualizado!", type: 'success'}); load(); }
    };

    const handleAdd = async () => {
        if(!newItem.question || !newItem.answer) return;
        const ok = await addFaqItem({...newItem, order: items.length + 1});
        if(ok) { playSound('success'); load(); setNewItem({question:'', answer:'', order:0, active:true}); }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("Remover esta pergunta?")) return;
        if(await deleteFaqItem(id)) { playSound('trash'); load(); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="p-8 border-dashed border-2 border-emerald-100 bg-emerald-50/30">
                <h4 className="text-sm font-black text-emerald-800 uppercase mb-4 flex items-center gap-2"><ListPlus size={18}/> Nova Pergunta (FAQ)</h4>
                <div className="grid gap-4">
                    <input className="p-3 border rounded-xl w-full font-bold uppercase text-xs" placeholder="Pergunta (Ex: Como pago?)" value={newItem.question} onChange={e => setNewItem({...newItem, question: e.target.value.toUpperCase()})}/>
                    <textarea className="p-3 border rounded-xl w-full text-sm" placeholder="Resposta detalhada..." value={newItem.answer} onChange={e => setNewItem({...newItem, answer: e.target.value})}/>
                    <Button onClick={handleAdd} className="w-full py-3 bg-emerald-600">Inserir no Sistema</Button>
                </div>
            </Card>

            <div className="grid gap-4">
                {items.length === 0 && !loading && <div className="text-center p-10 text-gray-300 font-bold uppercase italic">FAQ Vazio. Adicione acima.</div>}
                {items.map(item => (
                    <Card key={item.id} className="p-6 bg-white border-l-4 border-blue-500">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-2">
                                <input className="w-full font-black text-gray-800 uppercase bg-transparent outline-none focus:border-b border-blue-200 text-xs" value={item.question} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, question: e.target.value} : i))}/>
                                <textarea className="w-full text-sm text-gray-500 bg-transparent outline-none focus:bg-gray-50 p-1 rounded transition-all" value={item.answer} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, answer: e.target.value} : i))}/>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleSave(item.id, item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Save size={16}/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

const AboutTab = ({ setToast }: any) => {
    const [data, setData] = useState<SystemContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAboutUs().then(res => { setData(res); setLoading(false); });
    }, []);

    const handleSave = async () => {
        if(!data) return;
        setLoading(true);
        if(await updateAboutUs(data)) { playSound('save'); setToast({msg: "Institucional atualizado!", type: 'success'}); }
        setLoading(false);
    };

    if(loading) return <div className="text-center p-20"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-fade-in">
            <Card className="p-8 space-y-6 rounded-[40px]">
                <h3 className="font-black text-gray-800 uppercase flex items-center gap-2 border-b pb-4"><Edit3 size={18} className="text-emerald-500"/> Editor de Texto Institucional</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-text">Título Principal</label><input className="input-field-small font-black uppercase" value={data?.title} onChange={e => setData({...data!, title: e.target.value})}/></div>
                    <div><label className="label-text">Sub-título (Slogan)</label><input className="input-field-small uppercase font-bold" value={data?.subtitle} onChange={e => setData({...data!, subtitle: e.target.value})}/></div>
                </div>

                <div className="space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <label className="label-text flex items-center gap-1 text-emerald-700"><CheckCircle size={10}/> Missão (Card Verde)</label>
                        <textarea className="w-full bg-white p-3 border rounded-xl text-xs font-medium" rows={3} value={data?.mission_text} onChange={e => setData({...data!, mission_text: e.target.value})}/>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <label className="label-text flex items-center gap-1 text-blue-700"><Sparkles size={10}/> Inovação Local (Card Azul)</label>
                        <textarea className="w-full bg-white p-3 border rounded-xl text-xs font-medium" rows={3} value={data?.innovation_text} onChange={e => setData({...data!, innovation_text: e.target.value})}/>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-text">Val. Transparência</label><textarea className="input-field-small text-[10px]" rows={2} value={data?.val_transparency} onChange={e => setData({...data!, val_transparency: e.target.value})}/></div>
                    <div><label className="label-text">Val. Segurança</label><textarea className="input-field-small text-[10px]" rows={2} value={data?.val_security} onChange={e => setData({...data!, val_security: e.target.value})}/></div>
                    <div><label className="label-text">Val. Ética</label><textarea className="input-field-small text-[10px]" rows={2} value={data?.val_ethics} onChange={e => setData({...data!, val_ethics: e.target.value})}/></div>
                    <div><label className="label-text">Val. Acessibilidade</label><textarea className="input-field-small text-[10px]" rows={2} value={data?.val_accessibility} onChange={e => setData({...data!, val_accessibility: e.target.value})}/></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-text">Texto Contador (+30...)</label><input className="input-field-small font-black text-emerald-600" value={data?.partners_count_text} onChange={e => setData({...data!, partners_count_text: e.target.value})}/></div>
                    <div><label className="label-text">Rodapé (Copyright)</label><input className="input-field-small text-[10px]" value={data?.footer_text} onChange={e => setData({...data!, footer_text: e.target.value})}/></div>
                </div>

                <Button onClick={handleSave} className="w-full py-5 bg-emerald-600 shadow-2xl rounded-[24px] font-black uppercase"><Save className="mr-2"/> Gravar Tudo no Banco</Button>
            </Card>

            <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2"><Eye size={12}/> Pré-visualização Mobile</h4>
                <div className="bg-white border-8 border-gray-100 rounded-[60px] h-[700px] overflow-y-auto custom-scrollbar p-6 space-y-6 shadow-2xl">
                    <div className="text-center space-y-2 py-4">
                        {/* FIX: Info icon added in AdminSystem.tsx preview */}
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mx-auto"><Info size={20}/></div>
                        <h2 className="text-xl font-black text-gray-800">{data?.title}</h2>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{data?.subtitle}</p>
                    </div>

                    <div className="bg-[#064e3b] p-6 rounded-[32px] text-white space-y-2">
                        <h3 className="font-black text-sm uppercase">Nossa Missão</h3>
                        <p className="text-[10px] opacity-80 leading-relaxed">{data?.mission_text}</p>
                    </div>
                    
                    <div className="bg-[#0066FF] p-6 rounded-[32px] text-white space-y-2">
                        <h3 className="font-black text-sm uppercase">Inovação Local</h3>
                        <p className="text-[10px] opacity-80 leading-relaxed">{data?.innovation_text}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-gray-400">Nossos Valores</p>
                        <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500"/>
                            <div className="min-w-0"><p className="text-[8px] font-black text-emerald-950 uppercase">TRANSPARÊNCIA</p><p className="text-[7px] text-gray-400 truncate">{data?.val_transparency}</p></div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500"/>
                            <div className="min-w-0"><p className="text-[8px] font-black text-emerald-950 uppercase">SEGURANÇA</p><p className="text-[7px] text-gray-400 truncate">{data?.val_security}</p></div>
                        </div>
                    </div>
                    
                    <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 text-center">
                        <p className="text-sm font-black text-emerald-950">Já somos {data?.partners_count_text}</p>
                    </div>
                </div>
            </div>
            
            <style>{`
                .label-text { display: block; font-size: 8px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 3px; margin-left: 5px; }
                .input-field-small { width: 100%; padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; outline: none; transition: all; font-size: 11px; }
                .input-field-small:focus { border-color: #10b981; background-color: white; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.05); }
            `}</style>
        </div>
    );
}

export const AdminBackupView = () => {
    const [loading, setLoading] = useState(false);
    const [backupFile, setBackupFile] = useState<any | null>(null);
    const [options, setOptions] = useState<RestoreOptions>({
        config: true, users: true, pharmacies: true, catalog: true, inventory: true, orders: false, prescriptions: false, support: false
    });
    
    const fileRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => { setLoading(true); await generateFullSystemBackup(); setLoading(false); };

    const handleFileSelect = (e: any) => {
        const file = e.target.files?.[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (event: any) => {
            try { const json = JSON.parse(event.target?.result); if (!json.data) throw new Error(); setBackupFile(json); playSound('click'); } catch (err) { alert("Backup inválido."); }
        };
        reader.readAsText(file);
    };

    const handleConfirmRestore = async () => {
        if (!backupFile) return;
        if (!confirm("Restaurar dados agora?")) return;
        setLoading(true);
        const res = await restoreFullSystemBackup(backupFile, options);
        if(res.success) { playSound('success'); setBackupFile(null); }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-gray-800">Cofre de Segurança</h2><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Backup e Restauro</p></div><Badge color="red" className="px-4 py-1.5 font-black uppercase text-[10px]">Zona de Risco</Badge></div>
            <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-8 border-emerald-100 flex flex-col items-center text-center"><div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner"><Download size={40} /></div><h3 className="text-xl font-black text-gray-800 mb-2">Exportar snapshot</h3><Button onClick={handleBackup} disabled={loading} className="w-full py-4 bg-emerald-600">{loading ? <Loader2 className="animate-spin" /> : "Gerar Backup Total"}</Button></Card>
                <Card className="p-8 border-blue-100 flex flex-col items-center text-center"><div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner"><UploadCloud size={40} /></div><h3 className="text-xl font-black text-gray-800 mb-2">Restaurar itens</h3><Button onClick={() => fileRef.current?.click()} disabled={loading} variant="outline" className="w-full py-4 border-blue-600 text-blue-600 border-2 font-black">Selecionar Arquivo</Button><input type="file" ref={fileRef} className="hidden" accept=".json" onChange={handleFileSelect}/></Card>
            </div>
            {backupFile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl border-4 border-emerald-500 animate-scale-in">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={32}/><div><h3 className="font-black text-gray-800 text-lg">Restauro Inteligente</h3></div></div><button onClick={() => setBackupFile(null)} className="p-2 hover:bg-gray-200 rounded-full"><X/></button></div>
                        <div className="p-8 bg-gray-50 border-t flex justify-end"><Button onClick={handleConfirmRestore} disabled={loading} className="w-full py-5 bg-emerald-600">{loading ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle2 size={24} className="mr-2"/>} Confirmar Restauro</Button></div>
                    </Card>
                </div>
            )}
        </div>
    );
};
