
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { PharmacyFinancials, UserRole } from '../types';
import { fetchFinancialReport, updatePharmacyCommission } from '../services/dataService';
import { DollarSign, TrendingUp, PieChart, Briefcase, Settings, AlertCircle, CheckCircle, RefreshCw, ShoppingBag, Clock, XCircle } from 'lucide-react';

// --- COMPONENTE DE GRÁFICO (CSS BARS) ---
const FinancialBarChart = ({ data, isAdmin }: { data: PharmacyFinancials[], isAdmin: boolean }) => {
    if (data.length === 0) return <div className="text-center p-6 text-gray-400">Sem dados financeiros para exibir.</div>;

    // Normalizar para o gráfico (achar o valor máximo para ser 100%)
    const maxVal = Math.max(...data.map(d => isAdmin ? d.stats.platformFees : d.stats.netEarnings));
    
    return (
        <div className="space-y-4">
            {data.slice(0, isAdmin ? 10 : 1).map(p => {
                const value = isAdmin ? p.stats.platformFees : p.stats.netEarnings;
                const percent = maxVal > 0 ? (value / maxVal) * 100 : 0;
                
                return (
                    <div key={p.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-gray-700">{p.name}</span>
                            <span className="font-mono text-gray-600">Kz {value.toLocaleString()}</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isAdmin ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                        {isAdmin && <div className="text-xs text-gray-400 text-right">Taxa: {p.commissionRate}%</div>}
                    </div>
                )
            })}
        </div>
    );
}

// --- VISUALIZAÇÃO DA FARMÁCIA ---
export const PharmacyFinancialView = ({ pharmacyId }: { pharmacyId: string }) => {
    const [financials, setFinancials] = useState<PharmacyFinancials | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const report = await fetchFinancialReport();
        const myStats = report.find(r => r.id === pharmacyId);
        setFinancials(myStats || null);
        setLoading(false);
    }

    if(loading) return <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-emerald-600"/></div>;
    if(!financials) return <div className="text-center p-10">Dados indisponíveis.</div>;

    const { totalSales, platformFees, netEarnings, pendingClearance } = financials.stats;

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="text-emerald-600"/> Meu Financeiro
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-100 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingBag size={20}/></div>
                        <span className="text-sm font-bold text-blue-800 uppercase">Vendas Brutas</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">Kz {totalSales.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Total transacionado (Concluídos)</p>
                </Card>

                <Card className="bg-emerald-50 border-emerald-100 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Briefcase size={20}/></div>
                        <span className="text-sm font-bold text-emerald-800 uppercase">Lucro Líquido</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600">Kz {netEarnings.toLocaleString()}</div>
                    <p className="text-xs text-emerald-700 mt-1">Após dedução da taxa ({financials.commissionRate}%)</p>
                </Card>

                <Card className="bg-orange-50 border-orange-100 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Clock size={20}/></div>
                        <span className="text-sm font-bold text-orange-800 uppercase">Aguardando</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">Kz {pendingClearance.toLocaleString()}</div>
                    <p className="text-xs text-orange-700 mt-1">Pedidos em andamento</p>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card title="Desempenho Financeiro">
                     <div className="p-4">
                        <p className="text-sm text-gray-500 mb-6">Visualização do seu lucro líquido comparado às vendas.</p>
                        <FinancialBarChart data={[financials]} isAdmin={false} />
                     </div>
                </Card>
                <Card title="Detalhes da Parceria">
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-600">Taxa de Comissão FarmoLink</span>
                            <span className="font-bold text-lg">{financials.commissionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-600">Total Pago à Plataforma</span>
                            <span className="font-bold text-red-500">- Kz {platformFees.toLocaleString()}</span>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg text-sm text-emerald-800 border border-emerald-100 flex items-start gap-2">
                            <CheckCircle size={16} className="mt-0.5 shrink-0"/>
                            <p><strong>Status:</strong> A venda e a comissão são contabilizadas automaticamente assim que você marcar o pedido como "Concluído" no painel.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

// --- VISUALIZAÇÃO DO ADMIN ---
export const AdminFinancialView = () => {
    const [report, setReport] = useState<PharmacyFinancials[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRate, setNewRate] = useState<number>(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await fetchFinancialReport();
        setReport(data.sort((a,b) => b.stats.platformFees - a.stats.platformFees)); // Ordenar por quem gera mais lucro
        setLoading(false);
    }

    const handleEditRate = (pharmacy: PharmacyFinancials) => {
        setEditingId(pharmacy.id);
        setNewRate(pharmacy.commissionRate || 10);
    }

    const saveRate = async (id: string) => {
        if(confirm(`Alterar taxa desta farmácia para ${newRate}%?`)) {
            const success = await updatePharmacyCommission(id, newRate);
            if(success) {
                alert("Taxa atualizada.");
                setEditingId(null);
                loadData();
            } else {
                alert("Erro ao atualizar.");
            }
        }
    }

    const totalRevenue = report.reduce((acc, curr) => acc + curr.stats.platformFees, 0);
    const totalVolume = report.reduce((acc, curr) => acc + curr.stats.totalSales, 0);

    if(loading) return <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-emerald-600"/></div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="text-emerald-600"/> Gestão Financeira
                </h1>
                <Button variant="outline" onClick={loadData} className="!py-1"><RefreshCw size={14} className="mr-1"/> Atualizar</Button>
            </div>

            {/* BIG NUMBERS */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                    <p className="text-emerald-100 font-medium mb-1">Lucro Total da Plataforma</p>
                    <h2 className="text-4xl font-bold">Kz {totalRevenue.toLocaleString()}</h2>
                    <p className="text-sm opacity-80 mt-2">Acumulado de comissões</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-gray-500 font-medium mb-1">Volume Total Transacionado</p>
                    <h2 className="text-4xl font-bold text-gray-800">Kz {totalVolume.toLocaleString()}</h2>
                    <p className="text-sm text-gray-400 mt-2">Vendas brutas de todas as farmácias</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* LISTA E CONTROLES */}
                <div className="md:col-span-2 space-y-6">
                    <Card title="Farmácias Parceiras & Comissões">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">Farmácia</th>
                                        <th className="p-4 text-right">Vendas</th>
                                        <th className="p-4 text-right">Nosso Ganho</th>
                                        <th className="p-4 text-center">Taxa (%)</th>
                                        <th className="p-4">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {report.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium">{p.name}</td>
                                            <td className="p-4 text-right text-gray-600">Kz {p.stats.totalSales.toLocaleString()}</td>
                                            <td className="p-4 text-right font-bold text-emerald-600">Kz {p.stats.platformFees.toLocaleString()}</td>
                                            <td className="p-4 text-center">
                                                {editingId === p.id ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 border rounded p-1 text-center" 
                                                        value={newRate} 
                                                        onChange={e => setNewRate(Number(e.target.value))}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <Badge color="blue">{p.commissionRate}%</Badge>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {editingId === p.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => saveRate(p.id)} className="p-1 bg-green-100 text-green-700 rounded"><CheckCircle size={16}/></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 bg-red-100 text-red-700 rounded"><XCircle size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleEditRate(p)} className="text-gray-400 hover:text-blue-600"><Settings size={18}/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* GRÁFICO */}
                <div className="md:col-span-1">
                    <Card title="Top Contribuintes">
                        <div className="p-4">
                             <p className="text-xs text-gray-400 mb-4">Farmácias que geram maior receita para a plataforma.</p>
                             <FinancialBarChart data={report} isAdmin={true} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
