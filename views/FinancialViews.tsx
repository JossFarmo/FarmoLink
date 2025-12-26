
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button, Toast } from '../components/UI';
import { PharmacyFinancials, Order, CommissionStatus } from '../types';
import { fetchFinancialReport, updateCommissionStatusByPharmacy } from '../services/dataService';
import { fetchOrders } from '../services/orderService';
import { 
    Wallet, TrendingUp, ShoppingBag, Percent, ArrowUpRight, 
    RefreshCw, BarChart3, CreditCard, Calendar, History, 
    CheckCircle, AlertCircle, Clock, ChevronDown, Download,
    ArrowRight, UserCheck, ShieldCheck, Loader2
} from 'lucide-react';
import { playSound } from '../services/soundService';

export const PharmacyFinancialView = ({ pharmacyId }: { pharmacyId: string }) => {
    const [data, setData] = useState<PharmacyFinancials | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    const load = async () => {
        setLoading(true);
        const [report, oData] = await Promise.all([
            fetchFinancialReport(),
            fetchOrders(pharmacyId)
        ]);
        const myStats = report.find(r => r.id === pharmacyId);
        setData(myStats || null);
        setOrders(oData.filter(o => o.status === 'Concluído'));
        setLoading(false);
    };

    useEffect(() => { load(); }, [pharmacyId]);

    // Agrupar ordens por mês para o histórico de prestação de contas
    const monthlyStatements = useMemo(() => {
        const groups: Record<string, { sales: number, fees: number, status: CommissionStatus }> = {};
        
        orders.forEach(o => {
            // "MM/YYYY"
            const date = new Date(o.date);
            const key = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            if (!groups[key]) groups[key] = { sales: 0, fees: 0, status: o.commissionStatus || 'PENDING' };
            groups[key].sales += o.total;
            groups[key].fees += o.commissionAmount || 0;
            
            // Prioridade de status: Se um for PENDING, o mês está PENDING. Se um for WAITING, o mês está WAITING.
            if (o.commissionStatus === 'PENDING') groups[key].status = 'PENDING';
            else if (o.commissionStatus === 'WAITING_APPROVAL' && groups[key].status !== 'PENDING') groups[key].status = 'WAITING_APPROVAL';
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [orders]);

    const handleNotifyPayment = async (monthKey: string) => {
        const [m, y] = monthKey.split('/');
        if (!confirm(`Confirmar que realizou o pagamento das taxas de ${monthKey}?\nO Administrador será notificado para validar.`)) return;
        
        setActionLoading(monthKey);
        const success = await updateCommissionStatusByPharmacy(pharmacyId, m, parseInt(y), 'WAITING_APPROVAL');
        if (success) {
            playSound('success');
            setToast({msg: "Pagamento notificado ao Admin!", type: 'success'});
            await load();
        }
        setActionLoading(null);
    };

    if(loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-emerald-600" size={40}/></div>;
    if(!data) return <div className="p-20 text-center text-gray-400 italic">Sem registros financeiros.</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 uppercase tracking-tighter"><Wallet className="text-emerald-600" size={32}/> Auditoria Financeira</h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Controle de faturamento e taxas plataforma</p>
                </div>
                <Button onClick={load} variant="outline" className="border-gray-200 bg-white"><RefreshCw size={16} className="mr-2"/> Sincronizar Tudo</Button>
            </div>

            {/* CARDS DE RESUMO INDUSTRIAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-8 border-l-8 border-emerald-500 shadow-sm relative overflow-hidden bg-white">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendas Líquidas (Após Taxa)</p>
                    <h3 className="text-3xl font-black text-emerald-600">Kz {data.stats.netEarnings.toLocaleString()}</h3>
                    <p className="text-[9px] text-gray-400 mt-4 font-bold">Baseado em {orders.length} pedidos concluídos.</p>
                </Card>

                <Card className="p-8 border-l-8 border-red-500 shadow-sm bg-white">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Taxas FarmoLink</p>
                    <h3 className="text-3xl font-black text-red-600">Kz {data.stats.platformFees.toLocaleString()}</h3>
                    <div className="flex gap-4 mt-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Pagas</span>
                            <span className="text-xs font-bold text-emerald-600">Kz {data.stats.paidFees.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Em Aberto</span>
                            <span className="text-xs font-bold text-red-500">Kz {data.stats.unpaidFees.toLocaleString()}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 border-l-8 border-blue-500 shadow-sm bg-white">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendente de Entrega/Conclusão</p>
                    <h3 className="text-3xl font-black text-blue-600">Kz {data.stats.pendingClearance.toLocaleString()}</h3>
                    <p className="text-[9px] text-gray-400 mt-4 font-bold uppercase tracking-tighter">Valores em fluxo de transação.</p>
                </Card>
            </div>

            {/* SEÇÃO DE PRESTAÇÃO DE CONTAS MENSAL */}
            <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                    <History size={16}/> Histórico Mensal de Fechamento
                </h4>
                
                <div className="grid gap-4">
                    {monthlyStatements.length === 0 ? (
                        <div className="bg-white p-12 rounded-[32px] border-2 border-dashed text-center text-gray-300 italic">Aguardando primeira movimentação mensal.</div>
                    ) : (
                        monthlyStatements.map(([key, stats]) => (
                            <div key={key} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border shadow-inner">
                                        <Calendar size={20} className="text-emerald-500 mb-1"/>
                                        <span className="text-[10px] font-black text-gray-800">{key}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Faturamento do Mês</p>
                                        <p className="text-xl font-black text-gray-800">Kz {stats.sales.toLocaleString()}</p>
                                    </div>
                                    <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Taxa de Rede</p>
                                        <p className="text-xl font-black text-red-600">Kz {stats.fees.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <Badge color={stats.status === 'PAID' ? 'green' : (stats.status === 'WAITING_APPROVAL' ? 'yellow' : 'red')}>
                                        {stats.status === 'PAID' ? 'LIQUIDADO' : (stats.status === 'WAITING_APPROVAL' ? 'AGUARDANDO VALIDAÇÃO' : 'TAXA PENDENTE')}
                                    </Badge>

                                    {stats.status === 'PENDING' && (
                                        <button 
                                            onClick={() => handleNotifyPayment(key)}
                                            disabled={!!actionLoading}
                                            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                                        >
                                            {actionLoading === key ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle size={14}/>}
                                            Já Paguei
                                        </button>
                                    )}
                                    {stats.status === 'WAITING_APPROVAL' && (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase">
                                            <Clock size={14}/> Sob Revisão
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* INSTRUÇÕES FINANCEIRAS */}
            <div className="bg-gray-900 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <h4 className="text-2xl font-black flex items-center justify-center md:justify-start gap-3"><ShieldCheck className="text-emerald-400"/> Política de Repasse</h4>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">
                        O faturamento bruto é recebido pela farmácia no ato da entrega (TPA ou Dinheiro). 
                        A farmácia deve prestar contas da **Taxa de Manutenção (10%)** mensalmente para manter o acesso à plataforma FarmoLink ativo.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                        <Badge color="gray" className="!bg-white/10 !text-white border-none px-4 py-2">Fechamento: Dia 30</Badge>
                        <Badge color="gray" className="!bg-white/10 !text-white border-none px-4 py-2">Vencimento: Dia 05</Badge>
                    </div>
                </div>
                <div className="w-full md:w-64 bg-emerald-800/30 p-8 rounded-[32px] border border-white/10 text-center">
                    <CreditCard className="mx-auto mb-4 text-emerald-400" size={48}/>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Dúvidas?</p>
                    <button className="mt-4 text-white font-bold underline text-sm hover:text-emerald-300">Falar com Financeiro</button>
                </div>
            </div>
        </div>
    );
};

export const AdminFinancialView = () => {
    const [report, setReport] = useState<PharmacyFinancials[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        setReport(await fetchFinancialReport());
        setLoading(false);
    };

    const handleConfirmReceipt = async (pharmacyId: string, name: string) => {
        if (!confirm(`Confirma que recebeu o pagamento das taxas pendentes da farmácia ${name}?`)) return;
        
        setActionLoading(pharmacyId);
        // Busca o mês atual ou anterior (simplificado para demonstração total)
        const date = new Date();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();

        const success = await updateCommissionStatusByPharmacy(pharmacyId, m, y, 'PAID');
        if (success) {
            playSound('cash');
            setToast({msg: `Recebimento confirmado para ${name}!`, type: 'success'});
            await load();
        }
        setActionLoading(null);
    };

    if(loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-emerald-600" size={40}/></div>;

    const totalGlobalSales = report.reduce((acc, r) => acc + r.stats.totalSales, 0);
    const totalGlobalFees = report.reduce((acc, r) => acc + r.stats.platformFees, 0);
    const totalFeesUnpaid = report.reduce((acc, r) => acc + r.stats.unpaidFees, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 tracking-tighter"><BarChart3 className="text-blue-600" size={32}/> Consolidação de Rede</h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gestão de recebíveis e liquidação de parceiros</p>
                </div>
                <Button onClick={load} variant="outline" className="h-10 border-gray-200 bg-white"><RefreshCw size={14} className="mr-2"/> Atualizar Painel</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-600 p-8 rounded-[32px] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Taxas Plataforma (Global)</p>
                    <h3 className="text-4xl font-black">Kz {totalGlobalFees.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume Total de Vendas</p>
                    <h3 className="text-4xl font-black text-gray-800">Kz {totalGlobalSales.toLocaleString()}</h3>
                </div>
                <div className="bg-red-600 p-8 rounded-[32px] text-white shadow-xl shadow-red-100 relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">A Receber das Farmácias</p>
                    <h3 className="text-4xl font-black">Kz {totalFeesUnpaid.toLocaleString()}</h3>
                </div>
            </div>

            {/* TABELA DE LIQUIDAÇÃO DETALHADA */}
            <Card className="p-0 overflow-hidden shadow-sm border-gray-100 rounded-[32px] bg-white">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Painel de Cobrança por Farmácia</h4>
                    <span className="text-[10px] font-bold text-gray-400">{report.length} parceiros monitorados</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm min-w-[900px]">
                        <thead className="bg-white border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-6">Farmácia Parceira</th>
                                <th className="p-6 text-right">Faturamento Concluído</th>
                                <th className="p-6 text-right">Taxa Devida</th>
                                <th className="p-6 text-right">Status de Liquidação</th>
                                <th className="p-6 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {report.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">{r.name.charAt(0)}</div>
                                            <div>
                                                <span className="font-black text-gray-800 text-sm">{r.name}</span>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Comissão: {r.commissionRate}%</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right font-mono font-bold text-gray-600">Kz {r.stats.totalSales.toLocaleString()}</td>
                                    <td className="p-6 text-right font-mono font-black text-red-600">Kz {r.stats.platformFees.toLocaleString()}</td>
                                    <td className="p-6 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge color={r.stats.unpaidFees <= 0 ? 'green' : 'red'}>
                                                {r.stats.unpaidFees <= 0 ? 'EM DIA' : `PENDENTE: Kz ${r.stats.unpaidFees.toLocaleString()}`}
                                            </Badge>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Pago: Kz {r.stats.paidFees.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        {r.stats.unpaidFees > 0 ? (
                                            <button 
                                                onClick={() => handleConfirmReceipt(r.id, r.name)}
                                                disabled={!!actionLoading}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2 ml-auto"
                                            >
                                                {actionLoading === r.id ? <Loader2 className="animate-spin" size={12}/> : <UserCheck size={12}/>}
                                                Confirmar Recebimento
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] justify-end">
                                                <CheckCircle size={14}/> Tudo Pago
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="bg-white p-8 rounded-[40px] border border-blue-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner"><Download size={32}/></div>
                    <div>
                        <h4 className="font-black text-lg text-gray-800">Exportar Livro de Caixa</h4>
                        <p className="text-gray-400 text-sm font-medium">Baixe todos os registros financeiros deste mês em formato auditável.</p>
                    </div>
                </div>
                <button className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all flex items-center gap-2">Gerar CSV <ArrowRight size={18}/></button>
            </div>
        </div>
    );
};
