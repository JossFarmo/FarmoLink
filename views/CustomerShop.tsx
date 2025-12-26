
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Plus, Store, Upload, Star, ArrowLeft, Pill, ChevronRight, Bike, Clock, ShoppingCart, X, Loader2 } from 'lucide-react';
import { Product, Pharmacy, PRODUCT_CATEGORIES, CartItem } from '../types';
import { Button, Badge, Card } from '../components/UI';
import { playSound } from '../services/soundService';
import { formatProductNameForCustomer } from '../services/geminiService';

const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const HomeView = ({ products, pharmacies, onAddToCart, onNavigate, onViewPharmacy }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
        const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
        const matchSearch = !searchTerm || normalizeText(p.name).includes(normalizeText(searchTerm));
        return matchCat && matchSearch;
    });
  }, [products, searchTerm, activeCategory]);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    return products
      .filter((p: Product) => normalizeText(p.name).includes(normalizeText(searchTerm)))
      .slice(0, 6);
  }, [products, searchTerm]);

  return (
    <div className="space-y-8 pb-32 animate-fade-in"> 
      <div className="bg-emerald-600 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
              <h1 className="text-4xl font-black mb-2">Saúde ao seu alcance.</h1>
              <p className="text-emerald-100 opacity-80 mb-8">Compare preços e receba em casa com segurança.</p>
              <div className="flex gap-4">
                  <button onClick={() => onNavigate('upload-rx')} className="bg-white text-emerald-800 px-6 py-4 rounded-3xl font-black flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"><Upload size={20}/> Enviar Receita</button>
                  <button onClick={() => onNavigate('pharmacies-list')} className="bg-emerald-50 text-white px-6 py-4 rounded-3xl font-black flex items-center gap-3 hover:bg-emerald-400 transition-colors"><Store size={20}/> Ver Farmácias</button>
              </div>
          </div>
          <Pill className="absolute -bottom-10 -right-10 text-white opacity-10 w-64 h-64 rotate-45" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['Todos', ...PRODUCT_CATEGORIES.slice(0, 10)].map(c => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeCategory === c ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border text-gray-400 hover:border-emerald-300'}`}>{c}</button>
          ))}
      </div>

      <div className="space-y-4">
          <div ref={searchRef} className="relative z-[60]">
            <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3">
                <Search className="text-gray-300 ml-4" size={20}/>
                <input 
                    placeholder="Procurar medicamento..." 
                    className="w-full py-4 outline-none font-bold text-gray-700" 
                    value={searchTerm} 
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="p-2 text-gray-300 hover:text-gray-500 mr-2">
                        <X size={20}/>
                    </button>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-scale-in origin-top">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sugestões de Medicamentos</span>
                        <Badge color="green">{suggestions.length} encontrados</Badge>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {suggestions.map((s: Product) => (
                            <div 
                                key={s.id} 
                                onClick={() => { onAddToCart(s); setShowSuggestions(false); }}
                                className="p-4 hover:bg-emerald-50 cursor-pointer flex items-center justify-between group transition-colors border-b last:border-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center p-2 border group-hover:border-emerald-200">
                                        <img src={s.image} className="max-h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{formatProductNameForCustomer(s.name)}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{s.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-emerald-600 text-sm">Kz {s.price.toLocaleString()}</span>
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                        <Plus size={16}/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.slice(0, 15).map((p: Product) => (
                  <div 
                    key={p.id} 
                    onClick={() => onAddToCart(p)}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col cursor-pointer active:scale-95"
                  >
                      <div className="aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center p-4 border border-gray-50">
                          <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform" alt={p.name}/>
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

export const AllPharmaciesView = ({ pharmacies, onViewPharmacy }: any) => {
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        return pharmacies.filter((p: Pharmacy) => normalizeText(p.name).includes(normalizeText(q)));
    }, [pharmacies, q]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div>
                <h1 className="text-3xl font-black text-gray-800">Rede de Parceiros</h1>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Encontre a farmácia mais próxima de você</p>
            </div>

            <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3 max-w-xl">
                <Search className="text-gray-300 ml-4" size={20}/>
                <input placeholder="Pesquisar farmácia pelo nome..." className="w-full py-4 outline-none font-bold text-gray-700" value={q} onChange={e => setQ(e.target.value)}/>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p: Pharmacy) => (
                    <div key={p.id} onClick={() => onViewPharmacy(p.id)} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl cursor-pointer transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl font-black border border-emerald-100">{p.name.charAt(0)}</div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge color={p.isAvailable ? 'green' : 'gray'}>{p.isAvailable ? 'ABERTA' : 'FECHADA'}</Badge>
                                {p.deliveryFee > 0 && <Badge color="blue" className="flex items-center gap-1"><Bike size={10}/> Entrega</Badge>}
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">{p.name}</h3>
                        <p className="text-xs text-gray-400 font-bold flex items-center gap-2 mb-8"><MapPin size={14} className="text-emerald-500"/> {p.address}</p>
                        <div className="flex justify-between items-center pt-6 border-t font-black">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase">Taxa de Serviço</span>
                                <span className="text-emerald-600">Kz {p.deliveryFee.toLocaleString()}</span>
                            </div>
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white transition-all"><ChevronRight/></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PharmacyDetailsView = ({ pharmacy, products, onAddToCart, onBack }: any) => {
    const [q, setQ] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = useMemo(() => {
        return products.filter((p: any) => normalizeText(p.name).includes(normalizeText(q)));
    }, [products, q]);

    const suggestions = useMemo(() => {
        if (!q || q.length < 2) return [];
        return products
          .filter((p: any) => normalizeText(p.name).includes(normalizeText(q)))
          .slice(0, 5);
    }, [products, q]);

    if(!pharmacy) return null;

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <button onClick={onBack} className="text-gray-400 font-black text-xs uppercase flex items-center gap-2 hover:text-emerald-600"><ArrowLeft size={16}/> Voltar</button>
            
            <div className="bg-white p-10 rounded-[40px] border shadow-sm flex flex-col md:flex-row gap-10 items-center">
                <div className="w-32 h-32 bg-emerald-50 text-emerald-700 rounded-[40px] flex items-center justify-center text-5xl font-black border-4 border-white shadow-xl">{pharmacy.name.charAt(0)}</div>
                <div className="text-center md:text-left flex-1 space-y-2">
                    <h1 className="text-4xl font-black text-gray-800">{pharmacy.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-gray-400 uppercase">
                        <span className="flex items-center gap-1"><MapPin size={14} className="text-emerald-500"/> {pharmacy.address}</span>
                        <span className="flex items-center gap-1"><Clock size={14} className="text-blue-500"/> {pharmacy.minTime}</span>
                        <span className="flex items-center gap-1 text-yellow-500"><Star fill="currentColor" size={14}/> {pharmacy.rating}</span>
                    </div>
                </div>

                {/* BUSCA INTERNA COM SUGESTÕES */}
                <div ref={searchRef} className="w-full md:w-80 relative">
                    <div className="bg-gray-50 p-1 rounded-2xl border flex items-center gap-2">
                        <Search className="text-gray-300 ml-3" size={18}/>
                        <input 
                            placeholder="Buscar no estoque..." 
                            className="bg-transparent w-full py-3 outline-none font-bold text-sm text-gray-700" 
                            value={q} 
                            onFocus={() => setShowSuggestions(true)}
                            onChange={e => { setQ(e.target.value); setShowSuggestions(true); }}
                        />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[70] animate-scale-in origin-top">
                            {suggestions.map((s: any) => (
                                <div 
                                    key={s.id} 
                                    onClick={() => { onAddToCart(s); setShowSuggestions(false); setQ(''); }}
                                    className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center gap-3 transition-colors border-b last:border-0"
                                >
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center p-1 border">
                                        <img src={s.image} className="max-h-full object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-[11px] truncate">{formatProductNameForCustomer(s.name)}</p>
                                        <p className="text-[9px] text-emerald-600 font-black">Kz {s.price.toLocaleString()}</p>
                                    </div>
                                    <Plus size={14} className="text-emerald-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">
                        Nenhum medicamento encontrado para "{q}"
                    </div>
                ) : (
                    filtered.map((p: any) => (
                        <div 
                            key={p.id} 
                            onClick={() => onAddToCart(p)}
                            className="bg-white p-4 rounded-3xl border shadow-sm flex flex-col cursor-pointer hover:shadow-xl transition-all active:scale-95 group"
                        >
                            <div className="aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center p-4">
                                <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform" alt={p.name} />
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm flex-1">{formatProductNameForCustomer(p.name)}</h4>
                            <div className="flex justify-between items-center pt-3 border-t mt-3">
                                <span className="font-black text-emerald-600">Kz {p.price.toLocaleString()}</span>
                                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Plus size={18}/>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export const CartView = ({ items, pharmacies, updateQuantity, onCheckout, userAddress, onBack }: any) => {
    const [type, setType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
    const [isProcessing, setIsProcessing] = useState(false);
    const sub = items.reduce((a: any, b: any) => a + (b.price * b.quantity), 0);
    const pharm = items.length > 0 ? pharmacies.find((p:any) => p.id === items[0].pharmacyId) : null;
    const fee = type === 'DELIVERY' ? (pharm?.deliveryFee || 0) : 0;
    const total = sub + fee;

    const handleConfirmCheckout = async () => {
        if (isProcessing) return; // BLOQUEIO FÍSICO CONTRA DUPLICAÇÃO
        setIsProcessing(true);
        try {
            await onCheckout(type, userAddress, total);
        } catch (err) {
            console.error(err);
            setIsProcessing(false); // Só reseta se der erro, permitindo tentar de novo
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 animate-fade-in pb-32">
            <button onClick={onBack} className="text-gray-400 font-black text-xs uppercase mb-6 flex items-center gap-2 hover:text-emerald-600" disabled={isProcessing}><ArrowLeft size={16}/> Continuar Compras</button>
            <h2 className="text-3xl font-black text-gray-800 mb-8">Seu Carrinho</h2>
            {items.length === 0 ? (
                <div className="bg-white p-20 rounded-[40px] border border-dashed text-center flex flex-col items-center">
                    <Store className="text-gray-100 mb-4" size={80}/>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">O carrinho está vazio</p>
                    <button onClick={onBack} className="mt-4 text-emerald-600 font-bold underline">Voltar ao shopping</button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100 mb-4">
                            <Store className="text-emerald-600" size={20}/>
                            <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Pedido em: {pharm?.name}</span>
                        </div>
                        {items.map((it: any) => (
                            <div key={it.id} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm animate-scale-in">
                                <img src={it.image} className="w-16 h-16 object-contain rounded-xl bg-gray-50 p-2"/>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm">{formatProductNameForCustomer(it.name)}</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-emerald-600 font-black">Kz {(it.price * it.quantity).toLocaleString()}</p>
                                        {it.quantity > 1 && <span className="text-[10px] text-gray-400 font-bold">(Kz {it.price.toLocaleString()} un.)</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border">
                                    <button disabled={isProcessing} onClick={() => updateQuantity(it.id, -1)} className="w-8 h-8 bg-white rounded-xl shadow-sm font-black text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all">-</button>
                                    <span className="font-black text-gray-800 min-w-[20px] text-center">{it.quantity}</span>
                                    <button disabled={isProcessing} onClick={() => updateQuantity(it.id, 1)} className="w-8 h-8 bg-white rounded-xl shadow-sm font-black text-gray-600 hover:bg-emerald-50 hover:text-emerald-500 transition-all">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-emerald-900 text-white p-8 rounded-[40px] shadow-2xl space-y-6 h-fit sticky top-24">
                        <h3 className="font-black text-xl border-b border-white/10 pb-4 uppercase tracking-tighter">Finalizar</h3>
                        <div className="flex gap-2">
                            <button disabled={isProcessing} onClick={() => setType('DELIVERY')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${type === 'DELIVERY' ? 'bg-white text-emerald-900 border-white shadow-lg' : 'bg-transparent text-white border-white/20'}`}>Entrega</button>
                            <button disabled={isProcessing} onClick={() => setType('PICKUP')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${type === 'PICKUP' ? 'bg-white text-emerald-900 border-white shadow-lg' : 'bg-transparent text-white border-white/20'}`}>Retirada</button>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <div className="flex justify-between text-emerald-200 font-bold text-xs uppercase tracking-widest"><span>Subtotal</span><span>Kz {sub.toLocaleString()}</span></div>
                            <div className="flex justify-between text-emerald-200 font-bold text-xs uppercase tracking-widest"><span>Taxa {type === 'DELIVERY' ? 'Entrega' : ''}</span><span>Kz {fee.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center pt-4 text-3xl font-black"><span>Total</span><span>Kz {total.toLocaleString()}</span></div>
                        </div>
                        <Button 
                            onClick={handleConfirmCheckout} 
                            disabled={isProcessing} 
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 font-black text-lg rounded-3xl shadow-xl shadow-emerald-950 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : "Confirmar Compra"}
                        </Button>
                        <p className="text-[9px] text-center text-emerald-300 opacity-60 font-medium">Pagamento via TPA ou Dinheiro na entrega.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
