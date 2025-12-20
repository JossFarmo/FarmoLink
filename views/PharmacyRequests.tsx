
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { PrescriptionRequest, QuotedItem, Product } from '../types';
import { fetchPrescriptionRequests, sendPrescriptionQuote, rejectPrescription, fetchProducts } from '../services/dataService';
import { Eye, X, Check, Plus, Trash2, AlertTriangle, ChevronRight, FileText, Clock, User as UserIcon, Send, Search, PackageCheck, History, ListFilter, TrendingDown } from 'lucide-react';
import { playSound } from '../services/soundService';
import { formatProductNameForCustomer } from '../services/geminiService';

const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const PharmacyRequestsModule = ({ pharmacyId, requests, onRefresh }: { pharmacyId: string, requests: PrescriptionRequest[], onRefresh: () => void }) => {
    const [viewMode, setViewMode] = useState<'PENDING' | 'ANSWERED'>('PENDING');
    const [analysisMode, setAnalysisMode] = useState<PrescriptionRequest | null>(null);
    const [analysisStep, setAnalysisStep] = useState<'DECISION' | 'LEGIBLE' | 'ILLEGIBLE' | 'INVALID'>('DECISION');
    const [quoteItems, setQuoteItems] = useState<QuotedItem[]>([]);
    const [newItem, setNewItem] = useState({ name: '', qty: 1, price: 0 });
    const [deliveryFee, setDeliveryFee] = useState(600);
    const [notes, setNotes] = useState('');

    const [myStock, setMyStock] = useState<Product[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        loadStock();
    }, [pharmacyId]);

    const loadStock = async () => {
        const products = await fetchProducts(pharmacyId);
        setMyStock(products);
    };

    const handleOpenAnalysis = (req: PrescriptionRequest) => {
        setAnalysisMode(req);
        setAnalysisStep('DECISION');
        setQuoteItems([]);
        setNewItem({ name: '', qty: 1, price: 0 });
        playSound('click');
    };

    const handleSendQuote = async () => {
        if(!analysisMode || quoteItems.length === 0) return;
        const success = await sendPrescriptionQuote(analysisMode.id, pharmacyId, "Sua Farmácia", quoteItems, deliveryFee, notes || "Orçamento FarmoLink");
        if(success) { 
            playSound('success');
            setAnalysisMode(null); 
            onRefresh(); 
        }
    };

    const handleReject = async (reason: string) => {
        if(!analysisMode) return;
        const success = await rejectPrescription(analysisMode.id, pharmacyId, "Sua Farmácia", reason);
        if(success) { 
            playSound('click');
            setAnalysisMode(null); 
            onRefresh(); 
        }
    };

    const stockSuggestions = useMemo(() => {
        if (!newItem.name || newItem.name.length < 2) return [];
        return myStock.filter(p => 
            normalizeText(p.name).includes(normalizeText(newItem.name))
        ).slice(0, 5);
    }, [myStock, newItem.name]);

    const selectFromStock = (product: Product) => {
        setNewItem({
            name: formatProductNameForCustomer(product.name),
            price: product.price,
            qty: 1
        });
        setShowSuggestions(false);
        playSound('success');
    };

    const addItemToQuote = () => {
        if(!newItem.name || newItem.price <= 0) return;
        setQuoteItems([...quoteItems, { 
            name: newItem.name, 
            quantity: newItem.qty, 
            price: newItem.price, 
            available: true 
        }]);
        setNewItem({name:'', qty:1, price:0});
        setShowSuggestions(false);
        playSound('click');
    };

    const pendingRequests = requests.filter(r => 
        r.status !== 'COMPLETED' && 
        !r.quotes?.some(q => q.pharmacyId === pharmacyId)
    );

    const answeredRequests = requests.filter(r => 
        r.quotes?.some(q => q.pharmacyId === pharmacyId)
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Cotações de Receitas</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gerencie solicitações de clientes</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setViewMode('PENDING'); playSound('click'); }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-sm ${viewMode === 'PENDING' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        <ListFilter size={18}/>
                        Pendentes 
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${viewMode === 'PENDING' ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                            {pendingRequests.length}
                        </span>
                    </button>
                    <button 
                        onClick={() => { setViewMode('ANSWERED'); playSound('click'); }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-sm ${viewMode === 'ANSWERED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        <History size={18}/>
                        Respondidas
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${viewMode === 'ANSWERED' ? 'bg-white text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                            {answeredRequests.length}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(viewMode === 'PENDING' ? pendingRequests : answeredRequests).length === 0 ? (
                    <div className="col-span-full bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center flex flex-col items-center">
                        <FileText className="text-gray-100 mb-4" size={80}/>
                        <h3 className="font-black text-gray-300 uppercase tracking-widest text-sm">Nenhuma receita nesta lista</h3>
                    </div>
                ) : (
                    (viewMode === 'PENDING' ? pendingRequests : answeredRequests).map(req => {
                        const myQuote = req.quotes?.find(q => q.pharmacyId === pharmacyId);
                        const lostToCompetition = myQuote?.status === 'REJECTED' && myQuote.rejectionReason?.includes('concorrente');

                        return (
                            <Card key={req.id} className="p-0 overflow-hidden hover:shadow-xl transition-all border-gray-100 group">
                                <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                    <img src={req.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-5">
                                        {viewMode === 'PENDING' ? (
                                            <Badge color="yellow" className="w-fit mb-2">AGUARDANDO COTAÇÃO</Badge>
                                        ) : (
                                            <Badge color={myQuote?.status === 'ACCEPTED' ? 'green' : (myQuote?.status === 'REJECTED' ? 'red' : 'blue')} className="w-fit mb-2">
                                                {myQuote?.status === 'ACCEPTED' ? 'ORÇAMENTO ACEITO' : (myQuote?.status === 'REJECTED' ? 'ORÇAMENTO PERDIDO' : 'AGUARDANDO CLIENTE')}
                                            </Badge>
                                        )}
                                        <p className="text-white font-black text-xs uppercase tracking-tighter flex items-center gap-2"><Clock size={12}/> {req.date}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    {lostToCompetition ? (
                                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-600 uppercase mb-1 flex items-center gap-1"><TrendingDown size={14}/> Feedback do Sistema</p>
                                            <p className="text-xs text-red-800 font-medium leading-relaxed">
                                                O cliente optou por outra farmácia concorrente. Tente ser mais rápido ou oferecer preços melhores no próximo!
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 line-clamp-2 italic">"{req.notes || 'Sem observações do cliente.'}"</p>
                                    )}
                                    
                                    {viewMode === 'PENDING' ? (
                                        <Button onClick={() => handleOpenAnalysis(req)} className="w-full py-4 font-black shadow-lg">Analisar & Cotar</Button>
                                    ) : (
                                        <div className="pt-4 border-t">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Total</span>
                                                <span className="text-lg font-black text-emerald-600">Kz {myQuote?.totalPrice.toLocaleString()}</span>
                                            </div>
                                            <Button variant="outline" onClick={() => handleOpenAnalysis(req)} className="w-full py-2 text-xs font-bold border-gray-200">Ver Itens Enviados</Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {analysisMode && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-fade-in">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Análise de Receita Digital</h3>
                            <Badge color="blue">ID: {analysisMode.id.slice(0,8)}</Badge>
                        </div>
                        <button onClick={() => setAnalysisMode(null)} className="p-3 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="md:w-1/2 bg-gray-900 flex items-center justify-center p-4 relative group">
                            <img src={analysisMode.imageUrl} className="max-h-full max-w-full object-contain shadow-2xl" />
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto bg-white border-l custom-scrollbar">
                            {viewMode === 'ANSWERED' ? (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100">
                                        <h4 className="text-xl font-black text-emerald-800 mb-6 flex items-center gap-2"><History/> Orçamento Enviado</h4>
                                        {(() => {
                                            const q = analysisMode.quotes?.find(quote => quote.pharmacyId === pharmacyId);
                                            return (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        {q?.items.map((it, idx) => (
                                                            <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-emerald-50">
                                                                <span className="font-bold text-gray-700">{it.quantity}x {it.name}</span>
                                                                <span className="font-black text-emerald-600">Kz {(it.price * it.quantity).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="pt-4 border-t border-emerald-200 flex justify-between items-center">
                                                        <span className="font-black text-emerald-800 uppercase text-xs">Taxa Entrega</span>
                                                        <span className="font-bold">Kz {q?.deliveryFee.toLocaleString()}</span>
                                                    </div>
                                                    <div className="pt-4 border-t border-emerald-200 flex justify-between items-center">
                                                        <span className="text-xl font-black text-emerald-800">Total Geral</span>
                                                        <span className="text-3xl font-black text-emerald-600">Kz {q?.totalPrice.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <Button variant="outline" onClick={() => setAnalysisMode(null)} className="w-full py-4 font-black">Fechar Visualização</Button>
                                </div>
                            ) : (
                                <>
                                    {analysisStep === 'DECISION' && (
                                        <div className="max-w-md mx-auto space-y-8 pt-10">
                                            <div className="text-center">
                                                <h4 className="text-2xl font-black text-gray-800">O que você identificou?</h4>
                                            </div>
                                            <div className="space-y-4">
                                                <button onClick={() => setAnalysisStep('LEGIBLE')} className="w-full p-8 border-2 border-emerald-100 rounded-[32px] flex items-center gap-6 bg-emerald-50 text-emerald-800 font-black hover:border-emerald-500 transition-all group shadow-sm">
                                                    <div className="p-4 bg-emerald-600 text-white rounded-2xl group-hover:scale-110 transition-transform"><Check size={32}/></div>
                                                    <div className="text-left">
                                                        <p className="text-lg">Imagem Legível</p>
                                                        <p className="text-xs opacity-60 font-medium">Prosseguir para cotação.</p>
                                                    </div>
                                                </button>
                                                <button onClick={() => handleReject('Imagem ilegível')} className="w-full p-8 border-2 border-red-100 rounded-[32px] flex items-center gap-6 bg-red-50 text-red-800 font-black hover:border-red-500 transition-all group shadow-sm">
                                                    <div className="p-4 bg-red-600 text-white rounded-2xl group-hover:scale-110 transition-transform"><AlertTriangle size={32}/></div>
                                                    <div className="text-left">
                                                        <p className="text-lg">Ilegível / Inválida</p>
                                                        <p className="text-xs opacity-60 font-medium">Recusar solicitação.</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {analysisStep === 'LEGIBLE' && (
                                        <div className="space-y-8 animate-fade-in">
                                            <div>
                                                <h4 className="text-xl font-black text-gray-800">Montar Orçamento</h4>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronizado com o Stock da Loja</p>
                                            </div>

                                            <div className="bg-gray-50 p-6 rounded-3xl border space-y-4">
                                                <div className="grid grid-cols-12 gap-3 relative">
                                                    <div className="col-span-6">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome do Medicamento</label>
                                                        <div className="relative">
                                                            <input 
                                                                className="w-full p-3 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                                                                placeholder="Busque no stock..." 
                                                                value={newItem.name} 
                                                                onFocus={() => setShowSuggestions(true)}
                                                                onChange={e => {
                                                                    setNewItem({...newItem, name: e.target.value});
                                                                    setShowSuggestions(true);
                                                                }}
                                                            />
                                                            {showSuggestions && stockSuggestions.length > 0 && (
                                                                <div className="absolute top-full left-0 w-full bg-white border border-emerald-200 rounded-2xl shadow-2xl mt-1 z-[250] overflow-hidden">
                                                                    {stockSuggestions.map(s => (
                                                                        <div key={s.id} onClick={() => selectFromStock(s)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-0 flex justify-between items-center group">
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-bold text-gray-800">{formatProductNameForCustomer(s.name)}</p>
                                                                                <p className="text-[10px] text-gray-400">Em stock: {s.stock}</p>
                                                                            </div>
                                                                            <p className="text-sm font-black text-emerald-600">Kz {s.price.toLocaleString()}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Qtd</label>
                                                        <input type="number" className="w-full p-3 border rounded-xl font-bold text-sm text-center" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})}/>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Preço (Kz)</label>
                                                        <input type="number" className="w-full p-3 border rounded-xl font-black text-sm text-emerald-600" value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}/>
                                                    </div>
                                                    <div className="col-span-1 flex items-end">
                                                        <button onClick={addItemToQuote} className="w-full h-[46px] bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"><Plus size={24}/></button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-4">
                                                    {quoteItems.map((it, idx) => (
                                                        <div key={idx} className="flex justify-between items-center p-4 bg-white border rounded-2xl shadow-sm animate-scale-in">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-xs">{it.quantity}x</span>
                                                                <span className="font-bold text-gray-700">{it.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-black text-emerald-600">Kz {(it.price * it.quantity).toLocaleString()}</span>
                                                                <button onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">Taxa de Entrega (Kz)</label>
                                                    <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-blue-600" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))}/>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">Notas Adicionais</label>
                                                    <input className="w-full p-4 bg-gray-50 border rounded-2xl text-sm" placeholder="Ex: Disponível genérico..." value={notes} onChange={e => setNotes(e.target.value)}/>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Total Estimado</p>
                                                    <p className="text-3xl font-black text-emerald-600">Kz {(quoteItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + deliveryFee).toLocaleString()}</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button variant="outline" onClick={() => setAnalysisStep('DECISION')} className="px-8 font-bold h-14">Voltar</Button>
                                                    <Button onClick={handleSendQuote} disabled={quoteItems.length === 0} className="px-12 h-14 font-black text-lg bg-emerald-600 shadow-xl shadow-emerald-100 flex items-center gap-2">
                                                        <Send size={20}/> Enviar Orçamento
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
