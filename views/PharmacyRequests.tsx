import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { PrescriptionRequest, QuotedItem, Product } from '../types';
import { fetchPrescriptionRequests, sendPrescriptionQuote, rejectPrescription, fetchProducts } from '../services/dataService';
import { Eye, X, Check, Plus, Trash2, AlertTriangle, ChevronRight, FileText, Clock, User as UserIcon, Send, Search, PackageCheck, History, ListFilter, TrendingDown, Loader2 } from 'lucide-react';
import { playSound } from '../services/soundService';
import { formatProductNameForCustomer } from '../services/geminiService';

const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const PharmacyRequestsModule = ({ pharmacyId, requests, onRefresh }: { pharmacyId: string, requests: PrescriptionRequest[], onRefresh: () => void }) => {
    const [viewMode, setViewMode] = useState<'PENDING' | 'ANSWERED'>('PENDING');
    const [analysisMode, setAnalysisMode] = useState<PrescriptionRequest | null>(null);
    const [isOpening, setIsOpening] = useState(false);
    const [analysisStep, setAnalysisStep] = useState<'DECISION' | 'LEGIBLE' | 'ILLEGIBLE' | 'INVALID'>('DECISION');
    const [quoteItems, setQuoteItems] = useState<QuotedItem[]>([]);
    const [newItem, setNewItem] = useState({ name: '', qty: 1, price: 0 });
    const [deliveryFee, setDeliveryFee] = useState(600);
    const [notes, setNotes] = useState('');
    const [isSending, setIsSending] = useState(false);

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
        setIsOpening(true);
        playSound('click');
        // Pequeno delay para garantir que a UI troque antes de carregar a imagem pesada
        setTimeout(() => {
            setAnalysisMode(req);
            setAnalysisStep('DECISION');
            setQuoteItems([]);
            setNewItem({ name: '', qty: 1, price: 0 });
            setIsOpening(false);
        }, 50);
    };

    const handleSendQuote = async () => {
        if(!analysisMode || quoteItems.length === 0) return;
        setIsSending(true);
        const success = await sendPrescriptionQuote(analysisMode.id, pharmacyId, "Sua Farmácia", quoteItems, deliveryFee, notes || "Orçamento FarmoLink");
        setIsSending(false);
        if(success) { 
            playSound('success');
            setAnalysisMode(null); 
            onRefresh(); 
        }
    };

    const handleReject = async (reason: string) => {
        if(!analysisMode) return;
        setIsSending(true);
        const success = await rejectPrescription(analysisMode.id, pharmacyId, "Sua Farmácia", reason);
        setIsSending(false);
        if(success) { 
            playSound('click');
            setAnalysisMode(null); 
            onRefresh(); 
        }
    };

    const stockSuggestions = useMemo(() => {
        if (!newItem.name || newItem.name.length < 2) return [];
        return myStock.filter(p => normalizeText(p.name).includes(normalizeText(newItem.name))).slice(0, 5);
    }, [myStock, newItem.name]);

    const selectFromStock = (product: Product) => {
        setNewItem({ name: formatProductNameForCustomer(product.name), price: product.price, qty: 1 });
        setShowSuggestions(false);
        playSound('success');
    };

    const addItemToQuote = () => {
        if(!newItem.name || newItem.price <= 0) return;
        setQuoteItems([...quoteItems, { name: newItem.name, quantity: newItem.qty, price: newItem.price, available: true }]);
        setNewItem({name:'', qty:1, price:0});
        setShowSuggestions(false);
        playSound('click');
    };

    const pendingRequests = requests.filter(r => r.status !== 'COMPLETED' && !r.quotes?.some(q => q.pharmacyId === pharmacyId));
    const answeredRequests = requests.filter(r => r.quotes?.some(q => q.pharmacyId === pharmacyId));

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {isOpening && (
                <div className="fixed inset-0 z-[300] bg-white/50 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-600" size={48} />
                </div>
            )}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-[32px] border shadow-sm gap-4">
                <div className="min-w-0">
                    <h2 className="text-2xl font-black text-gray-800 truncate">Cotações de Receitas</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gerencie solicitações de clientes</p>
                </div>
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar scroll-smooth p-1">
                    <button 
                        onClick={() => { setViewMode('PENDING'); playSound('click'); }}
                        className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-xs sm:text-sm whitespace-nowrap min-w-fit ${viewMode === 'PENDING' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        Pendentes <Badge color={viewMode === 'PENDING' ? 'blue' : 'gray'} className="!bg-white/20 !text-white border-none">{pendingRequests.length}</Badge>
                    </button>
                    <button 
                        onClick={() => { setViewMode('ANSWERED'); playSound('click'); }}
                        className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-xs sm:text-sm whitespace-nowrap min-w-fit ${viewMode === 'ANSWERED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        Respondidas <Badge color={viewMode === 'ANSWERED' ? 'green' : 'gray'} className="!bg-white/20 !text-white border-none">{answeredRequests.length}</Badge>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(viewMode === 'PENDING' ? pendingRequests : answeredRequests).map(req => {
                    const myQuote = req.quotes?.find(q => q.pharmacyId === pharmacyId);
                    return (
                        <Card key={req.id} className="p-0 overflow-hidden hover:shadow-xl transition-all border-gray-100 group">
                            <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                <img src={req.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-5">
                                    <Badge color={viewMode === 'PENDING' ? 'yellow' : (myQuote?.status === 'ACCEPTED' ? 'green' : 'blue')} className="w-fit mb-2">
                                        {viewMode === 'PENDING' ? 'AGUARDANDO' : myQuote?.status}
                                    </Badge>
                                    <p className="text-white font-black text-xs uppercase flex items-center gap-2"><Clock size={12}/> {req.date}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-500 line-clamp-2 italic mb-4">"{req.notes || 'Sem observações.'}"</p>
                                <Button onClick={() => handleOpenAnalysis(req)} className="w-full py-4 font-black shadow-lg">Analisar & Cotar</Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {analysisMode && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-fade-in">
                    <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                        <div className="flex items-center gap-4 min-w-0">
                            <h3 className="font-black text-base sm:text-xl text-gray-800 uppercase tracking-tight truncate">Análise de Receita Digital</h3>
                        </div>
                        <button onClick={() => setAnalysisMode(null)} className="p-2 sm:p-3 hover:bg-gray-200 rounded-full transition-colors shrink-0" disabled={isSending}><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="md:w-1/2 bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
                            <img src={analysisMode.imageUrl} className="max-h-full max-w-full object-contain shadow-2xl animate-scale-in" />
                        </div>

                        <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-white border-l custom-scrollbar">
                            {analysisStep === 'DECISION' && (
                                <div className="max-w-md mx-auto space-y-8 pt-10">
                                    <h4 className="text-xl sm:text-2xl font-black text-gray-800 text-center">O que você identificou?</h4>
                                    <div className="space-y-4">
                                        <button onClick={() => setAnalysisStep('LEGIBLE')} className="w-full p-6 sm:p-8 border-2 border-emerald-100 rounded-[32px] flex items-center gap-6 bg-emerald-50 text-emerald-800 font-black hover:border-emerald-500 transition-all group shadow-sm">
                                            <div className="p-4 bg-emerald-600 text-white rounded-2xl group-hover:scale-110 transition-transform"><Check size={28}/></div>
                                            <div className="text-left"><p className="text-lg">Imagem Legível</p><p className="text-xs opacity-60 font-medium">Prosseguir para cotação.</p></div>
                                        </button>
                                        <button onClick={() => handleReject('Imagem ilegível')} className="w-full p-6 sm:p-8 border-2 border-red-100 rounded-[32px] flex items-center gap-6 bg-red-50 text-red-800 font-black hover:border-red-500 transition-all group shadow-sm">
                                            <div className="p-4 bg-red-600 text-white rounded-2xl group-hover:scale-110 transition-transform"><AlertTriangle size={28}/></div>
                                            <div className="text-left"><p className="text-lg">Ilegível / Inválida</p><p className="text-xs opacity-60 font-medium">Recusar solicitação.</p></div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {analysisStep === 'LEGIBLE' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-gray-50 p-6 rounded-3xl border space-y-4">
                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-12 sm:col-span-6">
                                                <div className="relative">
                                                    <input className="w-full p-3 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Busque no stock..." value={newItem.name} onFocus={() => setShowSuggestions(true)} onChange={e => { setNewItem({...newItem, name: e.target.value}); setShowSuggestions(true); }} />
                                                    {showSuggestions && stockSuggestions.length > 0 && (
                                                        <div className="absolute top-full left-0 w-full bg-white border border-emerald-200 rounded-2xl shadow-2xl mt-1 z-[250] overflow-hidden animate-scale-in">
                                                            {stockSuggestions.map(s => (
                                                                <div key={s.id} onClick={() => selectFromStock(s)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-0 flex justify-between items-center group">
                                                                    <div className="flex-1"><p className="text-sm font-bold text-gray-800">{formatProductNameForCustomer(s.name)}</p></div>
                                                                    <p className="text-sm font-black text-emerald-600">Kz {s.price.toLocaleString()}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-span-4 sm:col-span-2">
                                                <input type="number" className="w-full p-3 border rounded-xl font-bold text-sm text-center" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})}/>
                                            </div>
                                            <div className="col-span-8 sm:col-span-3">
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-sm text-emerald-600" value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}/>
                                            </div>
                                            <div className="col-span-12 sm:col-span-1">
                                                <button onClick={addItemToQuote} className="w-full h-[46px] bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors"><Plus size={24}/></button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            {quoteItems.map((it, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-4 bg-white border rounded-2xl shadow-sm">
                                                    <span className="font-bold text-gray-700 text-sm">{it.quantity}x {it.name}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-black text-emerald-600 text-sm">Kz {(it.price * it.quantity).toLocaleString()}</span>
                                                        <button onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
                                        <div className="text-center sm:text-left">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Total do Orçamento</p>
                                            <p className="text-3xl font-black text-emerald-600">Kz {(quoteItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + deliveryFee).toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" onClick={() => setAnalysisStep('DECISION')} className="flex-1 px-8 font-bold" disabled={isSending}>Voltar</Button>
                                            <Button onClick={handleSendQuote} disabled={quoteItems.length === 0 || isSending} className="flex-[2] px-12 font-black text-lg bg-emerald-600 shadow-xl">
                                                {isSending ? <Loader2 className="animate-spin" /> : <Send size={20}/>} {isSending ? 'Enviando...' : 'Enviar'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};