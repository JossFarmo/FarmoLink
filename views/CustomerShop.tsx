
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Plus, Store, Upload, Star, ArrowLeft, Pill, ChevronRight, Bike, Clock, ShoppingBag, X, Loader2, AlertCircle, AlertTriangle, FileText, MessageCircle, Send, Sparkles, CheckCircle, Wallet, Trash2 } from 'lucide-react';
import { Product, Pharmacy, PRODUCT_CATEGORIES, Order } from '../types';
import { Button, Card } from '../components/UI';
import { playSound } from '../services/soundService';
import { formatProductNameForCustomer } from '../services/geminiService';

const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const HomeView = ({ products, pharmacies, onAddToCart, onNavigate, onViewPharmacy, cartPharmacyId, orders = [] }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showAI, setShowAI] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const lastOrder = useMemo(() => {
    return [...orders].filter((o: Order) => o.status === 'Concluído').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [orders]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
        const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
        const matchSearch = !searchTerm || normalizeText(p.name).includes(normalizeText(searchTerm));
        return matchCat && matchSearch;
    });
  }, [products, searchTerm, activeCategory]);

  return (
    <div className="space-y-8 pb-32 animate-fade-in"> 
      <div className="bg-emerald-600 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
              <h1 className="text-4xl font-black mb-2 tracking-tighter">Saúde ao seu alcance.</h1>
              <p className="text-emerald-100 opacity-80 mb-8 max-w-sm">O maior shopping de farmácias de Angola. Entrega segura em minutos.</p>
              <div className="flex flex-wrap gap-4">
                  <button onClick={() => onNavigate('upload-rx')} className="bg-white text-emerald-800 px-6 py-4 rounded-3xl font-black flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"><Upload size={20}/> Enviar Receita</button>
                  <button onClick={() => onNavigate('pharmacies-list')} className="bg-emerald-50 text-white px-6 py-4 rounded-3xl font-black flex items-center gap-3 hover:bg-emerald-400 transition-colors border border-white/20"><Store size={20}/> Ver Farmácias</button>
              </div>
          </div>
          <Pill className="absolute -bottom-10 -right-10 text-white opacity-10 w-64 h-64 rotate-45" />
      </div>

      {/* BOTÃO ASSISTENTE IA */}
      <button 
        onClick={() => { setShowAI(true); playSound('click'); }}
        className="fixed bottom-24 right-6 z-[100] bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all border-4 border-white animate-bounce"
      >
        <Sparkles size={28}/>
      </button>

      {showAI && <HealthAssistantModal onClose={() => setShowAI(false)} products={products} />}

      {/* RE-COMPRA RÁPIDA */}
      {lastOrder && (
          <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center justify-between gap-4 animate-slide-in-top">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <ShoppingBag size={24}/>
                  </div>
                  <div>
                      <h4 className="font-black text-gray-800 text-sm">Comprar novamente?</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Último pedido na {pharmacies.find((p:any)=>p.id===lastOrder.pharmacyId)?.name}</p>
                  </div>
              </div>
              <button 
                onClick={() => {
                    lastOrder.items.forEach((item: any) => onAddToCart(item));
                    onNavigate('cart');
                }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-600 rounded-xl text-[10px] font-black uppercase transition-all"
              >
                  Adicionar Tudo
              </button>
          </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['Todos', ...PRODUCT_CATEGORIES.slice(0, 10)].map(c => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeCategory === c ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border text-gray-400 hover:border-emerald-300'}`}>{c}</button>
          ))}
      </div>

      <div className="space-y-4">
          <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3">
              <Search className="text-gray-300 ml-4" size={20}/>
              <input 
                  placeholder="O que você precisa hoje?" 
                  className="w-full py-4 outline-none font-bold text-gray-700" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.slice(0, 15).map((p: Product) => (
                  <div 
                    key={p.id} 
                    onClick={() => onAddToCart(p)}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col cursor-pointer active:scale-95"
                  >
                      <div className="aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center p-4">
                          <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1">
                          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">{p.category}</p>
                          <h4 className="font-bold text-gray-800 text-sm leading-tight mb-4">{formatProductNameForCustomer(p.name)}</h4>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                          <span className="font-black text-emerald-600">Kz {p.price.toLocaleString()}</span>
                          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <Plus size={20}/>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

// --- COMPONENTE ASSISTENTE IA (UI CORRIGIDA) ---
const HealthAssistantModal = ({ onClose, products }: { onClose: () => void, products: Product[] }) => {
    const [msg, setMsg] = useState('');
    const [chat, setChat] = useState<{role: 'ai' | 'user', text: string}[]>(() => {
        const saved = sessionStorage.getItem('farmobot_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Efeito para manter o scroll no fundo e salvar histórico
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        sessionStorage.setItem('farmobot_history', JSON.stringify(chat));
    }, [chat, loading]);

    const handleAsk = async () => {
        if (!msg.trim() || loading) return;
        const userMsg = msg;
        setMsg('');
        setChat(prev => [...prev, {role: 'user', text: userMsg}]);
        setLoading(true);

        try {
            const res = await fetch('/api/genai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, products: products.slice(0, 40) }),
            });
            const data = await res.json();
            setChat(prev => [...prev, {role: 'ai', text: data?.text || "Lamento, tive uma falha de conexão. Verifique sua rede e tente novamente."}]);
        } catch (e) {
            setChat(prev => [...prev, {role: 'ai', text: "Lamento, tive uma falha de conexão. Verifique sua rede e tente novamente."}]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        if(confirm("Deseja apagar o histórico desta conversa?")) {
            setChat([]);
            sessionStorage.removeItem('farmobot_history');
            playSound('click');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-emerald-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            {/* Modal Container - Altura controlada para não vazar */}
            <div className="bg-white w-full max-w-lg h-[100dvh] sm:h-[80vh] flex flex-col sm:rounded-[40px] shadow-2xl overflow-hidden border-none animate-scale-in">
                
                {/* CABEÇALHO - FIXO (Nunca some) */}
                <div className="flex-shrink-0 p-6 bg-emerald-600 text-white flex justify-between items-center shadow-lg relative z-[210]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl shadow-inner"><Sparkles size={20}/></div>
                        <div>
                            <h3 className="font-black uppercase text-sm tracking-widest leading-none">FarmoBot IA</h3>
                            <p className="text-[10px] opacity-80 font-bold mt-1 uppercase">Assistente FarmoLink</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {chat.length > 0 && (
                            <button onClick={clearChat} className="p-3 hover:bg-white/20 rounded-full transition-colors text-emerald-200" title="Limpar conversa">
                                <Trash2 size={20}/>
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="p-3 bg-white/10 hover:bg-white/30 rounded-full transition-all active:scale-90"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>

                {/* AREA DE MENSAGENS - SCROLLÁVEL (Ocupa o espaço central) */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 custom-scrollbar relative"
                >
                    {chat.length === 0 && (
                        <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mb-4 animate-pulse">
                                <MessageCircle size={40}/>
                            </div>
                            <h4 className="font-black text-gray-800 text-lg uppercase tracking-tighter">Olá! Como posso ajudar?</h4>
                            <p className="text-xs font-bold text-gray-400 mt-2 max-w-[200px]">Tire dúvidas sobre remédios, preços ou como usar o app.</p>
                        </div>
                    )}
                    
                    {chat.map((c, i) => (
                        <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
                                c.role === 'user' 
                                ? 'bg-emerald-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                            }`}>
                                {c.text}
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex gap-2">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RODAPÉ - INPUT FIXO (Sempre visível no fundo) */}
                <div className="flex-shrink-0 p-6 bg-white border-t border-gray-100 z-[210]">
                    <div className="flex gap-3 bg-gray-50 p-2 rounded-[28px] border-2 border-gray-100 focus-within:border-emerald-500 focus-within:bg-white transition-all shadow-inner">
                        <input 
                            className="flex-1 px-4 py-3 bg-transparent outline-none font-bold text-sm text-gray-700 disabled:opacity-50"
                            placeholder={loading ? "FarmoBot está pensando..." : "Escreva sua dúvida..."}
                            value={msg}
                            onChange={e => setMsg(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAsk()}
                            disabled={loading}
                        />
                        <button 
                            onClick={handleAsk} 
                            disabled={loading || !msg.trim()} 
                            className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 shadow-xl disabled:bg-gray-200 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center shrink-0"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                        </button>
                    </div>
                    <p className="text-[8px] text-center text-gray-400 font-black uppercase tracking-widest mt-4">Tecnologia FarmoLink AI integrada</p>
                </div>
            </div>
        </div>
    );
};

// --- CART VIEW ---
export const CartView = ({ items, pharmacies, updateQuantity, onCheckout, userAddress, onBack }: any) => {
    const [type, setType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
    const [isProcessing, setIsProcessing] = useState(false);

    const sub = items.reduce((a: any, b: any) => a + (b.price * b.quantity), 0);
    const pharm = items.length > 0 ? pharmacies.find((p:any) => p.id === items[0].pharmacyId) : null;
    const fee = type === 'DELIVERY' ? (pharm?.deliveryFee || 0) : 0;
    const total = sub + fee;

    const handleConfirmCheckout = async () => {
        setIsProcessing(true);
        try {
            await onCheckout(type, userAddress, total);
        } catch (err) {
            setIsProcessing(false); 
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 animate-fade-in pb-32">
            <button onClick={onBack} className="text-gray-400 font-black text-xs uppercase mb-6 flex items-center gap-2 hover:text-emerald-600"><ArrowLeft size={16}/> Voltar ao Shopping</button>
            
            <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center font-black text-3xl shadow-inner">
                            {pharm?.name?.charAt(0)}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Farmácia Responsável</p>
                            <h3 className="text-2xl font-black text-gray-800 leading-none">{pharm?.name}</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {items.map((it: any) => (
                            <div key={it.id} className="bg-white p-5 rounded-3xl border flex items-center gap-4 shadow-sm animate-scale-in group">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border group-hover:border-emerald-200 transition-colors">
                                    <img src={it.image} className="max-h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 text-sm truncate">{formatProductNameForCustomer(it.name)}</h4>
                                    <p className="text-emerald-600 font-black text-xs mt-1">Kz {it.price.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border">
                                    <button onClick={() => updateQuantity(it.id, -1)} className="w-8 h-8 bg-white rounded-xl font-black shadow-sm hover:text-red-500 transition-colors">-</button>
                                    <span className="font-black text-sm w-4 text-center">{it.quantity}</span>
                                    <button onClick={() => updateQuantity(it.id, 1)} className="w-8 h-8 bg-white rounded-xl font-black shadow-sm hover:text-emerald-600 transition-colors">+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[40px] space-y-4">
                        <div className="flex items-center gap-4 text-blue-800">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Wallet size={24}/></div>
                            <div>
                                <h4 className="font-black uppercase text-sm tracking-tight">Pagamento Presencial</h4>
                                <p className="text-xs font-medium opacity-80">Recebemos no ato da entrega ou retirada.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="bg-white/60 p-4 rounded-2xl border border-blue-200 flex items-center gap-3">
                                <CheckCircle size={18} className="text-blue-600"/>
                                <span className="text-[11px] font-black text-blue-900 uppercase">TPA (Multicaixa)</span>
                            </div>
                            <div className="bg-white/60 p-4 rounded-2xl border border-blue-200 flex items-center gap-3">
                                <CheckCircle size={18} className="text-blue-600"/>
                                <span className="text-[11px] font-black text-blue-900 uppercase">Dinheiro Vivo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-emerald-900 text-white p-8 rounded-[40px] shadow-2xl space-y-6 sticky top-24">
                        <h3 className="font-black text-xl uppercase tracking-tighter border-b border-white/10 pb-4">Resumo da Compra</h3>
                        
                        <div className="flex bg-white/10 p-1 rounded-2xl mb-6">
                            <button onClick={() => setType('DELIVERY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === 'DELIVERY' ? 'bg-white text-emerald-900 shadow-lg' : 'text-white/60'}`}>Entrega</button>
                            <button onClick={() => setType('PICKUP')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === 'PICKUP' ? 'bg-white text-emerald-900 shadow-lg' : 'text-white/60'}`}>Retirada</button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between text-emerald-200 font-bold text-xs uppercase"><span>Subtotal</span><span>Kz {sub.toLocaleString()}</span></div>
                            <div className="flex justify-between text-emerald-200 font-bold text-xs uppercase"><span>Taxa Logística</span><span>Kz {fee.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center pt-6 text-3xl font-black border-t border-white/10"><span>Total</span><span>Kz {total.toLocaleString()}</span></div>
                        </div>

                        <Button 
                            onClick={handleConfirmCheckout} 
                            disabled={isProcessing || items.length === 0} 
                            className="w-full py-6 bg-emerald-500 hover:bg-emerald-400 font-black text-xl rounded-[28px] shadow-2xl shadow-emerald-950 flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={28} /> : <>FINALIZAR PEDIDO <ChevronRight size={24}/></>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AllPharmaciesView = ({ pharmacies, onViewPharmacy }: any) => {
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        return pharmacies.filter((p: Pharmacy) => normalizeText(p.name).includes(normalizeText(q)));
    }, [pharmacies, q]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <h1 className="text-3xl font-black text-gray-800">Rede de Parceiros</h1>
            <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3 max-w-xl">
                <Search className="text-gray-300 ml-4" size={20}/>
                <input placeholder="Procurar farmácia..." className="w-full py-4 outline-none font-bold text-gray-700" value={q} onChange={e => setQ(e.target.value)}/>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p: Pharmacy) => (
                    <div key={p.id} onClick={() => onViewPharmacy(p.id)} className="bg-white p-6 rounded-[32px] border hover:shadow-2xl cursor-pointer transition-all group">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl font-black mb-6">{p.name.charAt(0)}</div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">{p.name}</h3>
                        <p className="text-xs text-gray-400 font-bold mb-8">{p.address}</p>
                        <div className="flex justify-between items-center pt-6 border-t font-black">
                            <span className="text-emerald-600">Kz {p.deliveryFee.toLocaleString()}</span>
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white transition-all"><ChevronRight/></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PharmacyDetailsView = ({ pharmacy, products, onAddToCart, onBack, cartPharmacyId }: any) => {
    const [q, setQ] = useState('');
    if(!pharmacy) return null;
    const filtered = products.filter((p: any) => normalizeText(p.name).includes(normalizeText(q)));
    const isDifferentPharmacy = cartPharmacyId && cartPharmacyId !== pharmacy.id;

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <button onClick={onBack} className="text-gray-400 font-black text-xs uppercase flex items-center gap-2 hover:text-emerald-600"><ArrowLeft size={16}/> Voltar</button>
            <div className="bg-white p-10 rounded-[40px] border shadow-sm flex flex-col md:flex-row gap-10 items-center">
                <div className="w-32 h-32 bg-emerald-50 text-emerald-700 rounded-[40px] flex items-center justify-center text-5xl font-black">{pharmacy.name.charAt(0)}</div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-4xl font-black text-gray-800">{pharmacy.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-gray-400 mt-2">
                        <span className="flex items-center gap-1"><MapPin size={14}/> {pharmacy.address}</span>
                        <span className="flex items-center gap-1"><Star size={14} className="fill-yellow-400 text-yellow-400"/> {pharmacy.rating}</span>
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-2xl border flex items-center gap-3 w-full md:w-64">
                    <Search className="text-gray-300 ml-2" size={18}/>
                    <input className="bg-transparent py-2 outline-none font-bold text-sm" placeholder="Buscar no stock..." value={q} onChange={e => setQ(e.target.value)}/>
                </div>
            </div>

            {isDifferentPharmacy && (
                <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[32px] flex items-center gap-6 text-orange-900 animate-slide-in-top">
                    <AlertTriangle size={32}/>
                    <div>
                        <p className="font-black text-lg">Trocar de Loja?</p>
                        <p className="text-sm">Ao adicionar um item aqui, seu carrinho anterior será esvaziado.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map((p: any) => (
                    <div key={p.id} onClick={() => onAddToCart(p)} className="bg-white p-4 rounded-3xl border shadow-sm cursor-pointer hover:shadow-xl transition-all group">
                        <div className="aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center p-4">
                            <img src={p.image} className="max-h-full object-contain" />
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm flex-1">{formatProductNameForCustomer(p.name)}</h4>
                        <div className="flex justify-between items-center pt-3 border-t mt-3">
                            <span className="font-black text-emerald-600">Kz {p.price.toLocaleString()}</span>
                            <div className="bg-emerald-50 p-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><Plus size={18}/></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
