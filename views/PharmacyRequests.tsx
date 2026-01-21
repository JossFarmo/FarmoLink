
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { PrescriptionRequest, QuotedItem, Product } from '../types';
import { sendPrescriptionQuote, validatePrescriptionAI } from '../services/orderService';
import { fetchPharmacyInventory } from '../services/productService';
import { supabase } from '../services/supabaseClient';
import { X, Plus, Trash2, FileText, Send, Search, Loader2, BrainCircuit, Eye, RefreshCw, Sparkles, MessageSquare, Phone, User, CheckCircle2, Calculator, Ban, AlertTriangle, AlertOctagon } from 'lucide-react';
import { playSound } from '../services/soundService';
import { formatProductNameForCustomer } from '../services/geminiService';

const normalizeForSearch = (t: string) => 
    t.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .replace(/[^a-z0-9\s]/g, '')
     .trim();

// --- FIX 4: ALGORITMO FUZZY TOKENIZADO MELHORADO ---
const findBestStockMatch = (aiName: string, stock: Product[]): Product | null => {
    const cleanAi = normalizeForSearch(aiName);
    const aiTokens = cleanAi.split(' ').filter(t => t.length >= 2); 

    if (aiTokens.length === 0) return null;

    let bestMatch: Product | null = null;
    let maxScore = 0;

    for (const prod of stock) {
        const cleanStock = normalizeForSearch(prod.name);
        const stockTokens = cleanStock.split(' ');
        let score = 0;

        // Match Exato
        if (cleanStock === cleanAi) score += 50;
        
        // Todos os tokens da IA aparecem no stock (ordem livre)?
        const hasAllTokens = aiTokens.every(token => cleanStock.includes(token));
        if (hasAllTokens) score += 30;

        // Quantos tokens batem?
        const matchedTokensCount = aiTokens.filter(t => stockTokens.some(st => st.includes(t))).length;
        score += matchedTokensCount * 5;

        // Bônus para números (dosagens como 250mg, 500)
        const numbersInAi = aiName.match(/\d+/g);
        if (numbersInAi) {
            const allNumbersMatch = numbersInAi.every(n => cleanStock.includes(n));
            if (allNumbersMatch) score += 15;
        }

        if (score > maxScore && score >= 20) { 
            maxScore = score;
            bestMatch = prod;
        }
    }

    return bestMatch;
};

export const PharmacyRequestsModule = ({ pharmacyId, requests: initialRequests, onRefresh }: { pharmacyId: string, requests: PrescriptionRequest[], onRefresh: () => void }) => {
    const [viewMode, setViewMode] = useState<'PENDING' | 'REVIEWS' | 'ANSWERED'>('PENDING');
    const [analysisMode, setAnalysisMode] = useState<PrescriptionRequest | null>(null);
    const [quoteItems, setQuoteItems] = useState<(QuotedItem & { currentStock?: number })[]>([]);
    const [newItem, setNewItem] = useState({ name: '', qty: 1, price: '', unitType: 'Unidade', id: '', currentStock: 0 }); 
    const [isSending, setIsSending] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [myStock, setMyStock] = useState<Product[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [pharmacyName, setPharmacyName] = useState('Sua Farmácia');
    const [quoteNotes, setQuoteNotes] = useState('');
    const [customerContact, setCustomerContact] = useState<{name: string, phone: string} | null>(null);

    const pendingRequests = initialRequests.filter(r => r.status === 'WAITING_FOR_QUOTES' && !r.quotes?.some(q => q.pharmacyId === pharmacyId));
    const lowConfidenceRequests = initialRequests.filter(r => r.status === 'UNDER_REVIEW');
    const answeredRequests = initialRequests.filter(r => r.quotes?.some(q => q.pharmacyId === pharmacyId) || (r.status === 'ILLEGIBLE' && r.ai_metadata?.validated_by === pharmacyId));

    useEffect(() => {
        if(pharmacyId) {
            onRefresh();
            supabase.from('pharmacies').select('name').eq('id', pharmacyId).single()
                .then(({data}) => { if(data) setPharmacyName(data.name); });
        }
    }, [pharmacyId]);

    useEffect(() => { 
        const load = async () => {
            const data = await fetchPharmacyInventory(pharmacyId);
            setMyStock(data);
        };
        load();
    }, [pharmacyId]);

    const totalQuoteValue = useMemo(() => quoteItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity || 1)), 0), [quoteItems]);

    const handleSync = async () => {
        setIsSyncing(true);
        await onRefresh();
        const freshStock = await fetchPharmacyInventory(pharmacyId, true);
        setMyStock(freshStock);
        setTimeout(() => setIsSyncing(false), 800);
    };

    const handleOpenAnalysis = (req: PrescriptionRequest) => {
        setAnalysisMode(req);
        if (req.status === 'ILLEGIBLE' || req.quotes?.some(q => q.pharmacyId === pharmacyId)) {
            setQuoteItems([]);
            return;
        }

        if (req.ai_metadata?.suggested_items) {
            const matchedItems = req.ai_metadata.suggested_items.map(aiItem => {
                const stockMatch = findBestStockMatch(aiItem.name, myStock);
                return {
                    name: stockMatch ? formatProductNameForCustomer(stockMatch.name) : aiItem.name,
                    quantity: aiItem.quantity || 1, 
                    price: stockMatch ? stockMatch.price : 0,
                    available: true,
                    isMatched: !!stockMatch,
                    unitType: stockMatch?.unitType || 'Unidade',
                    productId: stockMatch?.id,
                    currentStock: stockMatch?.stock || 0
                };
            });
            setQuoteItems(matchedItems);
        } else { setQuoteItems([]); }
    };

    const handleMarkIllegible = async () => {
        if(!analysisMode) return;
        if(!confirm("Rejeitar esta receita por ser ilegível?")) return;
        setIsSending(true);
        const ok = await validatePrescriptionAI(analysisMode.id, pharmacyId, [], true, quoteNotes || "Receita Ilegível.");
        if(ok) { setAnalysisMode(null); onRefresh(); }
        setIsSending(false);
    };

    const handleValidateAndSend = async () => {
        if(!analysisMode || quoteItems.length === 0) return;
        setIsSending(true);
        if (analysisMode.status === 'UNDER_REVIEW') await validatePrescriptionAI(analysisMode.id, pharmacyId, quoteItems.map(i => ({ name: i.name, quantity: i.quantity })));
        const ok = await sendPrescriptionQuote(analysisMode.id, pharmacyId, pharmacyName, quoteItems, 0, quoteNotes);
        if (ok) { setAnalysisMode(null); onRefresh(); }
        setIsSending(false);
    };

    // --- FIX 5: SUGESTÕES DE STOCK TOKENIZADAS ---
    const stockSuggestions = useMemo(() => {
        const searchVal = normalizeForSearch(newItem.name);
        if (searchVal.length < 2) return [];
        const searchTokens = searchVal.split(' ').filter(t => t.length > 0);
        
        return myStock.filter(p => {
            const prodVal = normalizeForSearch(p.name);
            return searchTokens.every(t => prodVal.includes(t));
        }).slice(0, 8);
    }, [myStock, newItem.name]);

    const selectFromStock = (product: Product) => {
        setNewItem({ name: formatProductNameForCustomer(product.name), price: String(product.price), qty: 1, unitType: product.unitType || 'Unidade', id: product.id, currentStock: product.stock });
        setShowSuggestions(false);
    };

    const addItemToQuote = () => {
        if(!newItem.name) return;
        setQuoteItems([...quoteItems, { name: newItem.name, quantity: newItem.qty || 1, price: Number(newItem.price) || 0, available: true, unitType: newItem.unitType, productId: newItem.id || undefined, currentStock: newItem.currentStock }]);
        setNewItem({name: '', qty: 1, price: '', unitType: 'Unidade', id: '', currentStock: 0});
        setShowSuggestions(false);
    };

    const isReadOnly = analysisMode ? (analysisMode.status === 'ILLEGIBLE' || analysisMode.quotes?.some(q => q.pharmacyId === pharmacyId)) : false;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-[32px] border shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl relative"><FileText size={24}/>{pendingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></span>}</div>
                    <div><h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">RECEITAS & ORÇAMENTOS</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">SINCRONIZAÇÃO EM TEMPO REAL <button onClick={handleSync} className={`p-1.5 bg-gray-50 text-emerald-600 rounded-lg ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={14}/></button></p></div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar">
                    <button onClick={() => setViewMode('PENDING')} className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase whitespace-nowrap ${viewMode === 'PENDING' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>POR ATENDER ({pendingRequests.length})</button>
                    <button onClick={() => setViewMode('REVIEWS')} className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase whitespace-nowrap ${viewMode === 'REVIEWS' ? 'bg-orange-500 text-white shadow-lg' : 'bg-orange-50 text-orange-400'}`}>LETRA DIFÍCIL ({lowConfidenceRequests.length})</button>
                    <button onClick={() => setViewMode('ANSWERED')} className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase whitespace-nowrap ${viewMode === 'ANSWERED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>HISTÓRICO ({answeredRequests.length})</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(viewMode === 'PENDING' ? pendingRequests : (viewMode === 'REVIEWS' ? lowConfidenceRequests : answeredRequests)).map(req => (
                    <Card key={req.id} className="p-0 overflow-hidden hover:shadow-xl transition-all border-gray-100 group h-full flex flex-col">
                        <div className="aspect-video bg-gray-900 relative">
                            <img src={req.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" alt="Receita" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                <Badge color={req.status === 'ILLEGIBLE' ? 'red' : (req.quotes?.some(q => q.pharmacyId === pharmacyId) ? 'green' : (req.status === 'UNDER_REVIEW' ? 'yellow' : 'blue'))} className="mb-1 w-fit">
                                    {req.status === 'ILLEGIBLE' ? 'RECUSADA' : (req.quotes?.some(q => q.pharmacyId === pharmacyId) ? 'RESPONDIDA' : (req.status === 'UNDER_REVIEW' ? 'ANALISAR LETRA' : 'DAR PREÇOS'))}
                                </Badge>
                                <div className="text-white/70 text-[9px] font-black uppercase">{req.date}</div>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <p className="text-xs font-bold text-gray-700 mb-4 line-clamp-2 italic leading-relaxed">{req.notes && req.notes.includes('[') ? req.notes : (req.ai_metadata?.extracted_text || 'Análise Pendente...')}</p>
                            <Button onClick={() => handleOpenAnalysis(req)} className={`w-full py-3 font-black text-xs uppercase mt-auto ${req.status === 'UNDER_REVIEW' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>
                                {viewMode === 'ANSWERED' ? 'VER REGISTO' : (req.status === 'UNDER_REVIEW' ? 'CORRIGIR E VALIDAR' : 'VER E COTAR')}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {analysisMode && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-fade-in">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><Calculator size={18}/></div>
                             <div><h3 className="font-black text-sm text-gray-800 uppercase">Cotação de Receita</h3>{customerContact && <p className="text-[10px] text-gray-500 font-bold"><User size={10} className="inline mr-1"/> {customerContact.name}</p>}</div>
                        </div>
                        <button onClick={() => setAnalysisMode(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="md:w-1/2 bg-black flex items-center justify-center p-4 relative overflow-hidden group">
                            <img src={analysisMode.imageUrl} className="max-h-full max-w-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-[2.0]" alt="Receita" />
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                            {analysisMode.notes && <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl text-xs font-bold text-blue-800">Nota: {analysisMode.notes}</div>}

                            {!isReadOnly ? (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {quoteItems.map((it: any, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-3 bg-white border rounded-2xl shadow-sm ${it.productId ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase">Medicamento</label>
                                                        {it.productId ? <span className="text-[8px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={8}/> STOCK ({it.unitType?.toUpperCase()}) {it.currentStock < 5 && <span className="text-red-500">POUCO STOCK</span>}</span> : <span className="text-[8px] font-black text-orange-400 flex items-center gap-1"><AlertTriangle size={8}/> MANUAL (NÃO BAIXA STOCK)</span>}
                                                    </div>
                                                    <input className="w-full bg-transparent border-none outline-none font-bold text-gray-800 text-sm uppercase truncate" value={it.name} onChange={e => { const updated = [...quoteItems]; updated[idx].name = e.target.value; updated[idx].productId = undefined; setQuoteItems(updated); }} />
                                                </div>
                                                <div className="w-16">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase mb-0.5 text-center block">Qtd</label>
                                                    <input type="number" className="w-full p-2 bg-gray-50 border rounded-lg font-black text-center text-xs" value={it.quantity} onChange={e => { const updated = [...quoteItems]; updated[idx].quantity = Number(e.target.value); setQuoteItems(updated); }} />
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase mb-0.5 text-center block">Preço Unit.</label>
                                                    <input type="number" className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg font-black text-center text-emerald-700 text-xs" value={it.price} onChange={e => { const updated = [...quoteItems]; updated[idx].price = Number(e.target.value); setQuoteItems(updated); }} />
                                                </div>
                                                <button onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6 font-black uppercase text-xs">
                                        <div className="flex items-center gap-2 text-gray-500"><Calculator size={18}/> Total Cotação</div>
                                        <span className="text-xl text-emerald-600">Kz {totalQuoteValue.toLocaleString()}</span>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 mb-6">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16}/>
                                                <input className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm uppercase" placeholder="Procurar no seu stock..." value={newItem.name} onFocus={() => setShowSuggestions(true)} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                                {showSuggestions && stockSuggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-xl mt-1 z-50 max-h-56 overflow-y-auto">
                                                        {stockSuggestions.map(s => (
                                                            <div key={s.id} onClick={() => selectFromStock(s)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b flex justify-between items-center group">
                                                                <div><span className="text-xs font-bold block group-hover:text-emerald-700">{formatProductNameForCustomer(s.name)}</span><div className="flex gap-2"><span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">{s.unitType || 'Unidade'}</span>{s.stock < 10 && <span className="text-[9px] font-black text-red-500 uppercase">Fim de Stock ({s.stock})</span>}</div></div>
                                                                <span className="text-[10px] font-black text-emerald-600">Kz {s.price.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input type="number" className="w-16 py-3 px-1 bg-gray-50 rounded-xl outline-none font-black text-center text-sm" placeholder="Qtd" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})} />
                                            <input type="number" className="w-24 py-3 px-2 bg-gray-50 rounded-xl outline-none font-black text-center text-sm" placeholder="Preço" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                                            <button onClick={addItemToQuote} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 transition-transform"><Plus size={20}/></button>
                                        </div>
                                    </div>

                                    <textarea className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-sm h-20 mb-6 font-medium" placeholder="Notas para o utente (Ex: Temos genérico)..." value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} />

                                    <div className="flex gap-3">
                                        <button onClick={handleMarkIllegible} disabled={isSending} className="flex-1 py-4 bg-red-50 text-red-500 rounded-xl font-black text-xs uppercase hover:bg-red-500 hover:text-white transition-all border border-red-100">Rejeitar Ilegível</button>
                                        <Button onClick={handleValidateAndSend} disabled={quoteItems.length === 0 || isSending} className="flex-[2] py-4 bg-emerald-600 shadow-xl font-black text-sm rounded-xl uppercase text-white">
                                            {isSending ? <Loader2 className="animate-spin" /> : "Enviar Orçamento"}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-12 text-center border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-[40px]"><CheckCircle2 size={60} className="mx-auto mb-4 text-emerald-500"/><h4 className="font-black uppercase text-xl text-emerald-900">Processado com Sucesso</h4><p className="text-emerald-700 font-bold mt-2">O cliente já recebeu a sua resposta.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
