
import React, { useState, useRef } from 'react';
import { Card, Button, Toast, Badge } from '../components/UI';
import { generateFullSystemBackup, restoreFullSystemBackup, sendSystemNotification, RestoreOptions } from '../services/dataService';
import { 
    Settings, Save, Megaphone, ShieldCheck, Download, 
    UploadCloud, X, CheckCircle2, AlertTriangle, Database, 
    Users, Store, ShoppingBag, FileText, Loader2, Image as ImageIcon,
    MessageSquare
} from 'lucide-react';
import { playSound } from '../services/soundService';

export const AdminSettingsView = () => {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [config, setConfig] = useState({ commissionRate: 10, minOrderValue: 2000, supportWhatsapp: '244923123456', supportEmail: 'ajuda@farmolink.ao' });
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
        <div className="space-y-8 animate-fade-in pb-20">
            {toast && <Toast message={toast.msg} type={toast.type === 'success' ? 'success' : 'error'} onClose={() => setToast(null)} />}
            <div className="grid lg:grid-cols-2 gap-8">
                <Card title="Parâmetros de Rede" className="p-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">Taxa (%)</label><input type="number" className="w-full p-3 border rounded-xl" value={config.commissionRate} onChange={e => setConfig({...config, commissionRate: Number(e.target.value)})}/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">Min. (Kz)</label><input type="number" className="w-full p-3 border rounded-xl" value={config.minOrderValue} onChange={e => setConfig({...config, minOrderValue: Number(e.target.value)})}/></div>
                        </div>
                        <Button onClick={handleSaveConfig} disabled={loading} className="w-full py-4"><Save size={18} className="mr-2"/> Atualizar Regras</Button>
                    </div>
                </Card>
                <Card className="p-8 border-l-8 border-orange-500 shadow-lg">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6"><Megaphone className="text-orange-500"/> Alerta Global</h3>
                    <div className="space-y-4">
                        <input className="w-full p-3 border rounded-xl font-bold" placeholder="Assunto..." value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})}/>
                        <textarea className="w-full p-3 border rounded-xl h-24 text-sm" placeholder="Mensagem..." value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})}/>
                        <div className="flex gap-2">
                            <select 
                                className="p-3 border rounded-xl text-xs font-bold bg-gray-50"
                                value={broadcast.target}
                                onChange={e => setBroadcast({...broadcast, target: e.target.value as any})}
                            >
                                <option value="ALL">Todos</option>
                                <option value="CUSTOMER">Clientes</option>
                                <option value="PHARMACY">Farmácias</option>
                            </select>
                            <Button variant="secondary" className="flex-1 py-4 bg-orange-600 text-white" onClick={handleSendBroadcast} disabled={loading || !broadcast.title}>Enviar Notificação</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export const AdminBackupView = () => {
    const [loading, setLoading] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
    const [backupFile, setBackupFile] = useState<any | null>(null);
    const [options, setOptions] = useState<RestoreOptions>({
        config: true,
        users: true,
        pharmacies: true,
        catalog: true,
        inventory: true,
        orders: false,
        prescriptions: false,
        support: false
    });
    
    const fileRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => { 
        setLoading(true); 
        await generateFullSystemBackup(); 
        setLoading(false); 
    };

    const handleFileSelect = (e: any) => {
        const file = e.target.files?.[0]; 
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (event: any) => {
            try {
                const json = JSON.parse(event.target?.result);
                if (!json.data) throw new Error("Arquivo inválido");
                setBackupFile(json);
                playSound('click');
            } catch (err) {
                alert("Erro ao ler arquivo de backup. Certifique-se que é um JSON válido do FarmoLink.");
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmRestore = async () => {
        if (!backupFile) return;
        if (!confirm("AVISO CRÍTICO: Esta operação irá sobrescrever dados existentes com base nas suas seleções. Continuar?")) return;

        setLoading(true);
        setRestoreProgress("🚀 Sincronizando dados...");
        
        const res = await restoreFullSystemBackup(backupFile, options);
        
        if(res.success) { 
            playSound('success'); 
            setRestoreProgress("✅ Dados restaurados sem duplicatas!");
            setBackupFile(null);
            if (fileRef.current) fileRef.current.value = '';
        } else {
            playSound('error');
            setRestoreProgress(`❌ Erro: ${res.message}`);
        }
        setLoading(false);
    };

    const toggleOption = (key: keyof RestoreOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
        playSound('click');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Cofre de Segurança</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Backup e Restauro Inteligente</p>
                </div>
                <Badge color="red" className="px-4 py-1.5 font-black uppercase text-[10px]">Zona de Risco</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-8 border-emerald-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <Download size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">Exportar snapshot</h3>
                    <p className="text-sm text-gray-400 mb-8">Baixa todos os dados criados no software até agora em um arquivo protegido.</p>
                    <Button onClick={handleBackup} disabled={loading} className="w-full py-4 bg-emerald-600 shadow-lg shadow-emerald-100">
                        {loading ? <Loader2 className="animate-spin" /> : "Gerar Backup Total"}
                    </Button>
                </Card>

                <Card className="p-8 border-blue-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <UploadCloud size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">Restaurar itens</h3>
                    <p className="text-sm text-gray-400 mb-8">Sobe um arquivo de backup e escolhe quais grupos de dados deseja recuperar.</p>
                    <Button onClick={() => fileRef.current?.click()} disabled={loading} variant="outline" className="w-full py-4 border-blue-600 text-blue-600 border-2 font-black">
                        Selecionar Arquivo
                    </Button>
                    <input type="file" ref={fileRef} className="hidden" accept=".json" onChange={handleFileSelect}/>
                </Card>
            </div>

            {backupFile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl border-4 border-emerald-500 animate-scale-in">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-emerald-500" size={32}/>
                                <div>
                                    <h3 className="font-black text-gray-800 text-lg">Configurar Restauro Inteligente</h3>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Arquivo gerado em: {new Date(backupFile.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setBackupFile(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X/></button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 p-3 rounded-xl border border-dashed text-center">
                                O restauro não criará itens duplicados. IDs existentes serão apenas atualizados.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <RestoreOptionToggle 
                                    label="Marketing & Visual" 
                                    count={(backupFile.data.carousel_slides?.length || 0) + (backupFile.data.partners?.length || 0)} 
                                    icon={<ImageIcon size={16}/>} 
                                    active={options.config} 
                                    onClick={() => toggleOption('config')} 
                                />
                                <RestoreOptionToggle 
                                    label="Diretório de Usuários" 
                                    count={backupFile.data.profiles?.length || 0} 
                                    icon={<Users size={16}/>} 
                                    active={options.users} 
                                    onClick={() => toggleOption('users')} 
                                />
                                <RestoreOptionToggle 
                                    label="Parceiros (Farmácias)" 
                                    count={backupFile.data.pharmacies?.length || 0} 
                                    icon={<Store size={16}/>} 
                                    active={options.pharmacies} 
                                    onClick={() => toggleOption('pharmacies')} 
                                />
                                <RestoreOptionToggle 
                                    label="Catálogo Mestre" 
                                    count={backupFile.data.global_products?.length || 0} 
                                    icon={<Database size={16}/>} 
                                    active={options.catalog} 
                                    onClick={() => toggleOption('catalog')} 
                                />
                                <RestoreOptionToggle 
                                    label="Stock das Lojas" 
                                    count={backupFile.data.products?.length || 0} 
                                    icon={<ShieldCheck size={16}/>} 
                                    active={options.inventory} 
                                    onClick={() => toggleOption('inventory')} 
                                />
                                <RestoreOptionToggle 
                                    label="Histórico de Vendas" 
                                    count={backupFile.data.orders?.length || 0} 
                                    icon={<ShoppingBag size={16}/>} 
                                    active={options.orders} 
                                    onClick={() => toggleOption('orders')} 
                                />
                                <RestoreOptionToggle 
                                    label="Receitas & Cotações" 
                                    count={(backupFile.data.prescriptions?.length || 0) + (backupFile.data.prescription_quotes?.length || 0)} 
                                    icon={<FileText size={16}/>} 
                                    active={options.prescriptions} 
                                    onClick={() => toggleOption('prescriptions')} 
                                />
                                <RestoreOptionToggle 
                                    label="SAC & Notificações" 
                                    count={(backupFile.data.support_tickets?.length || 0) + (backupFile.data.notifications?.length || 0)} 
                                    icon={<MessageSquare size={16}/>} 
                                    active={options.support} 
                                    onClick={() => toggleOption('support')} 
                                />
                            </div>

                            <div className="pt-6 border-t flex flex-col gap-4">
                                <Button onClick={handleConfirmRestore} disabled={loading} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200">
                                    {loading ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle2 size={24} className="mr-2"/>}
                                    Confirmar Injeção de Dados
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {restoreProgress && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] w-full max-w-sm">
                    <div className="bg-gray-900 p-5 rounded-2xl text-white font-mono text-xs flex items-center justify-between shadow-2xl border border-gray-700 animate-slide-in-bottom">
                        <span className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                            {restoreProgress}
                        </span>
                        <button onClick={() => setRestoreProgress(null)} className="text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded"><X size={16}/></button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente Interno de Toggle
const RestoreOptionToggle = ({ label, count, icon, active, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${active ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white opacity-60 hover:opacity-100'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors ${active ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                {icon}
            </div>
            <div>
                <p className={`text-[11px] font-black uppercase tracking-tight ${active ? 'text-emerald-900' : 'text-gray-400'}`}>{label}</p>
                <p className="text-[9px] text-gray-400 font-bold">{count} registros identificados</p>
            </div>
        </div>
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${active ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'border-gray-200'}`}>
            {active && <CheckCircle2 size={14}/>}
        </div>
    </div>
);
