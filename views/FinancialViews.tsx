
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { PharmacyFinancials } from '../types';
import { fetchFinancialReport } from '../services/dataService';
import { Wallet, TrendingUp, ShoppingBag, Percent, ArrowUpRight, RefreshCw, BarChart3, CreditCard } from 'lucide-react';

export const PharmacyFinancialView = ({ pharmacyId }: { pharmacyId: string }) => {
    const [data, setData] = useState<PharmacyFinancials | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const report = await fetchFinancialReport();
        const myStats = report.find(r => r.id === pharmacyId);
        setData(myStats || null);
        setLoading(false);
    };

    useEffect(() => { load(); }, [pharmacyId]);

    if(loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-emerald-600"/></div>;
    if(!data) return <div className="p-20 text-center text-gray-400 italic">Sem movimentações financeiras no período.</div>;

    const { totalSales, platformFees, netEarnings, pendingClearance } = data.stats;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight"><Wallet className="text-emerald-600"/> Gestão de Caixa</h1>
                <Button onClick={load} variant="outline" className="text-xs h-10 border-gray-200"><RefreshCw size={14} className="mr-2"/> Atualizar</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-l-4 border-blue-500 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume Bruto de Vendas</p>
                    <h3 className="text-2xl font-black text-gray-800">Kz {totalSales.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase"><ShoppingBag size={12}/> Vendas Liquidadas</div>
                </Card>

                <Card className="bg-white border-l-4 border-red-500 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Taxa FarmoLink ({data.commissionRate}%)</p>
                    <h3 className="text-2xl font-black text-red-600">- Kz {platformFees.toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase"><Percent size={12}/> Manutenção da Rede</div>
                </Card>

                <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-200 flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Saldo Líquido a Receber</p>
                        <h3 className="text-3xl font-black">Kz {netEarnings.toLocaleString()}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase bg-white/20 p-2 rounded-xl w-fit"><TrendingUp size={12}/> Pronto para Saque</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 p-8 rounded-[40px] text-white space-y-4 shadow-xl">
                    <h4 className="text-xl font-black text-emerald-400 flex items-center gap-2"><CreditCard/> Conciliação Digital</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Seu saldo líquido é transferido automaticamente seguindo o cronograma contratual. A FarmoLink garante o processamento seguro de todos os pagamentos realizados no shopping.
                    </p>
                    <div className="pt-4 flex gap-3">
                         <Badge color="green" className="!bg-emerald-500/20 !text-emerald-400 border-none">Pagamentos Verificados</Badge>
                         <Badge color="gray" className="!bg-white/10 !text-white border-none">Taxa Única: 10%</Badge>
                    </div>
                </div>
                
                <Card className="p-8 border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendas em Processamento</p>
                    <h4 className="text-3xl font-black text-orange-500">Kz {pendingClearance.toLocaleString()}</h4>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Pedidos aceitos que ainda não foram concluídos pelo cliente ou entregues.</p>
                </Card>
            </div>
        </div>
    );
};

export const AdminFinancialView = () => {
    const [report, setReport] = useState<PharmacyFinancials[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        setReport(await fetchFinancialReport());
        setLoading(false);
    };

    if(loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-emerald-600"/></div>;

    const totalSales = report.reduce((acc, r) => acc + r.stats.totalSales, 0);
    const totalFees = report.reduce((acc, r) => acc + r.stats.platformFees, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight"><BarChart3 className="text-blue-600"/> Dashboard Financeiro Global</h1>
                <Button onClick={load} variant="outline" className="h-10 border-gray-200"><RefreshCw size={14} className="mr-2"/> Atualizar</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-600 p-10 rounded-[32px] text-white shadow-xl shadow-emerald-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Lucro FarmoLink (Acumulado)</p>
                        <h3 className="text-4xl font-black">Kz {totalFees.toLocaleString()}</h3>
                    </div>
                    <Percent size={60} className="opacity-20"/>
                </div>
                <div className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume Total Transacionado</p>
                        <h3 className="text-4xl font-black text-gray-800">Kz {totalSales.toLocaleString()}</h3>
                    </div>
                    <ShoppingBag size={60} className="text-gray-100"/>
                </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="p-6">Farmácia Parceira</th><th className="p-6 text-right">Volume Bruto</th><th className="p-6 text-right">Receita Plataforma</th><th className="p-6 text-center">Taxa</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {report.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6 font-bold text-gray-800">{r.name}</td>
                                <td className="p-6 text-right font-mono font-bold text-gray-500">Kz {r.stats.totalSales.toLocaleString()}</td>
                                <td className="p-6 text-right font-mono font-black text-emerald-600">Kz {r.stats.platformFees.toLocaleString()}</td>
                                <td className="p-6 text-center"><Badge color="blue">{r.commissionRate}%</Badge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};
