
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Plus, Minus, XCircle, Store, Upload, Star, Clock, Truck, ShoppingBag, ArrowLeft, Pill, Filter, ArrowRight, RefreshCw, Loader2, Tag } from 'lucide-react';
import { Product, CartItem, Pharmacy, PRODUCT_CATEGORIES } from '../types';
import { Button, Card, Badge } from '../components/UI';
import { playSound } from '../services/soundService';

const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const smartSearch = (text: string, term: string) => {
    const normalizedText = normalizeText(text);
    const normalizedTerm = normalizeText(term);
    const terms = normalizedTerm.split(' ').filter(t => t.trim() !== '');
    return terms.every(t => normalizedText.includes(t));
};

// ... (HomeView e AllPharmaciesView mantidos iguais, copiados abaixo para integridade) ...
export const HomeView = ({ products, pharmacies, onAddToCart, onNavigate, onViewPharmacy }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const featuredPharmacies = pharmacies.slice(0, 4);
  const displayedProducts = products
    .filter((p: Product) => !selectedCategory || p.category === selectedCategory)
    .slice(0, 8);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 1) {
      const filtered = products.filter((p: Product) => smartSearch(p.name, term) || smartSearch(p.description || '', term)).slice(0, 5); 
      setSuggestions(filtered);
    } else { setSuggestions([]); }
  };

  const handleSelectSuggestion = (product: Product) => {
     onAddToCart(product);
     setSearchTerm('');
     setSuggestions([]);
  };

  return (
    <div className="space-y-12 pb-20">
      <section className="bg-gradient-to-br from-emerald-600 to-teal-500 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
         <div className="relative z-10">
           <h1 className="text-3xl font-bold mb-2">Saúde acessível, onde você estiver.</h1>
           <p className="text-emerald-100 mb-6">Compare preços, envie receitas e receba em casa.</p>
           <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => onNavigate('upload-rx')} className="bg-white text-emerald-800 rounded-2xl p-4 text-left shadow-lg hover:bg-gray-50 transition-all flex items-center gap-4 group">
                 <div className="bg-emerald-100 p-2 rounded-full group-hover:scale-110 transition-transform"><Upload className="h-6 w-6" /></div>
                 <div><h3 className="font-bold">Enviar Receita</h3><p className="text-xs text-gray-500">Orçamentos de múltiplas farmácias</p></div>
              </button>
              <button onClick={() => onNavigate('pharmacies-list')} className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-2xl p-4 text-left hover:bg-white/30 transition-all flex items-center gap-4 group">
                 <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform"><Store className="h-6 w-6" /></div>
                 <div><h3 className="font-bold">Encontrar Farmácias</h3><p className="text-xs text-emerald-50">Ver lista completa</p></div>
              </button>
           </div>
         </div>
      </section>
      <section>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              <button onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>Todos</button>
              {PRODUCT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>{cat}</button>
              ))}
          </div>
      </section>
      <div className="relative">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Search className="w-5 h-5"/> Buscar Remédios</h2>
        <div className="bg-white p-2 rounded-xl shadow-md flex items-center border border-gray-200 relative z-20 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
          <Search className="text-gray-400 ml-2" />
          <input type="text" placeholder="Digite o nome do medicamento..." className="w-full py-3 px-4 outline-none bg-transparent" value={searchTerm} onChange={handleSearchInput} />
          {searchTerm && <button onClick={() => { setSearchTerm(''); setSuggestions([]); }} className="p-2 text-gray-400 hover:text-gray-600"><XCircle size={18}/></button>}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 mt-2 z-30 overflow-hidden animate-fade-in">
             <div className="p-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">Sugestões</div>
             {suggestions.map(p => (
               <div key={p.id} onClick={() => handleSelectSuggestion(p)} className="p-3 border-b border-gray-50 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Pill size={16} className="text-emerald-500"/></div>
                     <div><div className="font-bold text-gray-800">{p.name}</div><div className="text-xs text-gray-500">{pharmacies.find((ph:any) => ph.id === p.pharmacyId)?.name}</div></div>
                  </div>
                  <div className="flex items-center gap-3"><span className="font-bold text-emerald-600">Kz {p.price}</span><Button variant="secondary" className="!p-1 !rounded-full"><Plus size={14}/></Button></div>
               </div>
             ))}
          </div>
        )}
      </div>
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{selectedCategory || 'Destaques da Semana'}</h2>
            {selectedCategory && <button onClick={() => setSelectedCategory(null)} className="text-sm text-emerald-600 hover:underline">Limpar Filtro</button>}
        </div>
        {displayedProducts.length === 0 ? (<div className="text-center py-10 bg-gray-50 rounded-xl"><p className="text-gray-500">Nenhum produto encontrado nesta categoria.</p></div>) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map(product => (
                <Card 
                  key={product.id} 
                  onClick={() => onAddToCart(product)} 
                  className="flex flex-col h-full hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer group active:scale-95"
                >
                <div className="flex-1 mb-4">
                    <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center"><img src={product.image} className="h-20 opacity-80 group-hover:scale-110 transition-transform duration-300" alt={product.name}/></div>
                    <div className="mb-1"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1 rounded">{product.category || 'Geral'}</span></div>
                    <h3 className="font-bold text-gray-800">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{pharmacies.find((ph:any) => ph.id === product.pharmacyId)?.name}</p>
                </div>
                <div className="flex justify-between items-center mt-auto">
                    <span className="font-bold text-emerald-600 text-lg">Kz {product.price}</span>
                    <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Plus size={20}/>
                    </div>
                </div>
                </Card>
            ))}
            </div>
        )}
      </section>
      <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
         <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Store className="w-5 h-5 text-emerald-600"/> Destaques & Próximas de Você</h2><p className="text-sm text-gray-500">As farmácias mais populares na sua região.</p></div><button onClick={() => onNavigate('pharmacies-list')} className="text-emerald-600 hover:underline text-sm font-medium">Ver todas</button></div>
         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredPharmacies.map((pharmacy: Pharmacy) => (
            <Card key={pharmacy.id} onClick={() => onViewPharmacy(pharmacy.id)} className="hover:shadow-lg transition-all cursor-pointer border border-gray-100 group">
                <div className="flex justify-between items-start mb-2"><div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold">{pharmacy.name.substring(0,2).toUpperCase()}</div><div className="bg-yellow-50 text-yellow-600 p-1 rounded-full"><Star size={12} fill="currentColor"/></div></div>
                <div><h3 className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">{pharmacy.name}</h3><div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><MapPin size={10} /> {pharmacy.distance || '1.2 km'} • ⭐ {pharmacy.rating}</div></div>
            </Card>
            ))}
         </div>
      </section>
    </div>
  );
};

export const AllPharmaciesView = ({ pharmacies, onViewPharmacy }: { pharmacies: Pharmacy[], onViewPharmacy: (id: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredList, setFilteredList] = useState(pharmacies);
    useEffect(() => {
        if(searchTerm.trim() === '') { setFilteredList(pharmacies); } else { setFilteredList(pharmacies.filter(p => smartSearch(p.name, searchTerm) || smartSearch(p.address, searchTerm))); }
    }, [searchTerm, pharmacies]);
    return (
        <div className="space-y-8 pb-20 animate-fade-in">
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center"><h1 className="text-3xl font-bold text-gray-800 mb-2">Encontrar Farmácias</h1><p className="text-gray-500 mb-6 max-w-lg mx-auto">Pesquise por nome ou localização.</p><div className="relative max-w-xl mx-auto"><input type="text" placeholder="Pesquisar farmácia..." className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none text-lg shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus /><Search className="w-6 h-6 text-gray-400 absolute left-4 top-4" /></div></div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredList.map((pharmacy) => (
                    <Card key={pharmacy.id} onClick={() => onViewPharmacy(pharmacy.id)} className="hover:shadow-lg transition-all cursor-pointer border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">{pharmacy.name.substring(0,2).toUpperCase()}</div><div><h3 className="font-bold text-gray-800 text-lg">{pharmacy.name}</h3><Badge color={pharmacy.isAvailable ? 'green' : 'gray'}>{pharmacy.isAvailable ? 'Aberta Agora' : 'Fechada'}</Badge></div></div></div>
                        <div className="space-y-3 text-sm text-gray-600 mt-2 flex-1"><p className="flex items-start gap-2"><MapPin size={16} className="shrink-0 mt-0.5 text-gray-400"/> {pharmacy.address}</p><div className="grid grid-cols-2 gap-2 mt-2"><div className="bg-gray-50 p-2 rounded border border-gray-100 flex items-center gap-2"><Clock size={14} className="text-emerald-600"/> <span className="font-medium">{pharmacy.minTime}</span></div><div className="bg-gray-50 p-2 rounded border border-gray-100 flex items-center gap-2"><Truck size={14} className="text-blue-600"/> <span className="font-medium">Kz {pharmacy.deliveryFee}</span></div></div></div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center"><div className="text-xs text-gray-400">Distância: {pharmacy.distance}</div><Button variant="outline" className="!py-1 !px-3 !text-xs">Ver Produtos</Button></div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// --- NOVA VIEW: Detalhes da Farmácia (Organizada por Categoria) ---
export const PharmacyDetailsView = ({ pharmacy, products, onAddToCart, onBack }: { pharmacy: Pharmacy, products: Product[], onAddToCart: (p: Product) => void, onBack: () => void }) => {
    if (!pharmacy) return <div className="p-8 text-center text-gray-500">Farmácia não encontrada. <Button onClick={onBack} className="mt-4">Voltar</Button></div>;

    // Agrupar produtos por categoria
    const groupedProducts = useMemo(() => {
        const groups: { [key: string]: Product[] } = {};
        products.forEach(p => {
            const cat = p.category || 'Outros / Uso Especial';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        return groups;
    }, [products]);

    // Lista de categorias ordenadas que possuem produtos
    const sortedGroupKeys = useMemo(() => {
        const keys = Object.keys(groupedProducts);
        return PRODUCT_CATEGORIES.filter(c => keys.includes(c))
                .concat(keys.filter(k => !PRODUCT_CATEGORIES.includes(k)).sort());
    }, [groupedProducts]);

    return (
        <div className="space-y-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-medium">
                <ArrowLeft size={18} /> Voltar para lista
            </button>

            {/* Banner Farmácia */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    <div className="w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-3xl border-2 border-blue-100 shadow-sm">
                        {pharmacy.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">{pharmacy.name}</h1>
                                <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={16}/> {pharmacy.address}</p>
                            </div>
                            <Badge color={pharmacy.isAvailable ? 'green' : 'gray'}>{pharmacy.isAvailable ? 'Aberta Agora' : 'Fechada'}</Badge>
                        </div>
                        
                        <div className="flex gap-4 mt-6">
                             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100"><Clock size={16} className="text-emerald-600"/> <span className="text-sm font-medium">{pharmacy.minTime}</span></div>
                             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100"><Truck size={16} className="text-blue-600"/> <span className="text-sm font-medium">Kz {pharmacy.deliveryFee}</span></div>
                             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100"><Star size={16} className="text-yellow-500 fill-current"/> <span className="text-sm font-medium">{pharmacy.rating}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Produtos da Farmácia (AGRUPADA E ORDENADA) */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Store className="text-emerald-600" size={20}/> Produtos Disponíveis</h2>
                
                {Object.keys(groupedProducts).length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl">Nenhum produto cadastrado nesta farmácia.</div>
                ) : (
                    <div className="space-y-8">
                        {sortedGroupKeys.map((category) => {
                            const catProducts = groupedProducts[category];
                            if(!catProducts) return null;
                            
                            return (
                            <div key={category}>
                                <h3 className="font-bold text-gray-700 text-lg mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Tag size={18} className="text-emerald-500"/> {category}
                                    <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{catProducts.length}</span>
                                </h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {catProducts.map(product => (
                                        <Card 
                                            key={product.id} 
                                            onClick={() => onAddToCart(product)}
                                            className="flex flex-col h-full hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer group active:scale-95"
                                        >
                                            <div className="flex-1 mb-4">
                                                <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                                                <img src={product.image} className="h-20 opacity-80 group-hover:scale-110 transition-transform duration-300" alt={product.name}/>
                                                </div>
                                                <h3 className="font-bold text-gray-800">{product.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                                            <span className="font-bold text-emerald-600 text-lg">Kz {product.price}</span>
                                            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                <Plus size={20}/>
                                            </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ... (CartView atualizado) ...
export const CartView = ({ items, updateQuantity, onCheckout, userAddress, pharmacies }: any) => {
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [address, setAddress] = useState(userAddress || '');
  const [isAddressEditing, setIsAddressEditing] = useState(!userAddress);
  const [isProcessing, setIsProcessing] = useState(false); 

  const itemsTotal = items.reduce((sum:number, item:any) => sum + (item.price * item.quantity), 0);
  const deliveryFee = items.length > 0 && items[0].pharmacyId ? (pharmacies.find((p:any) => p.id === items[0].pharmacyId)?.deliveryFee || 1000) : 1000;
  const finalTotal = itemsTotal + (deliveryType === 'DELIVERY' ? deliveryFee : 0);
  const pharmacyAddress = items.length > 0 ? pharmacies.find((p:any) => p.id === items[0].pharmacyId)?.address : 'Endereço da Farmácia';

  const handleFinish = async () => {
     if (deliveryType === 'DELIVERY' && !address.trim()) { 
         alert("Por favor, informe o endereço de entrega."); 
         playSound('error');
         return; 
     }
     
     setIsProcessing(true);
     // Agora onCheckout retorna um Promise<{success: boolean, error?: string}>
     const result = await onCheckout(deliveryType, address, finalTotal);
     
     if (result.success) {
         playSound('cash'); // Som de caixa registradora ao sucesso
         if (deliveryType === 'DELIVERY') {
            alert(`Pedido de Entrega confirmado!\nEndereço: ${address}`);
         } else {
            alert(`Reserva confirmada!\nDirija-se à farmácia para retirar.`);
         }
     } else {
         playSound('error');
         alert(result.error || "Erro ao processar pedido. Tente novamente.");
     }
     
     setIsProcessing(false);
  };

  if (items.length === 0) {
    return (
        <div className="text-center py-20 animate-fade-in"><div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><ShoppingBag className="w-10 h-10 text-gray-400" /></div><h2 className="text-2xl font-bold text-gray-800 mb-2">Seu carrinho está vazio</h2><p className="text-gray-500">Adicione medicamentos para continuar.</p></div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800">Finalizar Pedido</h1>
      <Card className="divide-y divide-gray-100">
          {items.map((item:any) => (
            <div key={item.id} className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center"><img src={item.image} className="h-8"/></div><div><h3 className="font-bold text-gray-800">{item.name}</h3><p className="text-sm text-gray-500">Kz {item.price}</p></div></div>
              <div className="flex gap-3 items-center bg-gray-50 rounded-lg p-1"><button onClick={() => updateQuantity(item.id, -1)} disabled={isProcessing} className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"><Minus size={14}/></button><span className="font-medium w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} disabled={isProcessing} className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"><Plus size={14}/></button></div>
            </div>
          ))}
      </Card>
      <Card title="Opções de Entrega">
          <div className="grid grid-cols-2 gap-4 mb-4">
              <button disabled={isProcessing} onClick={() => setDeliveryType('DELIVERY')} className={`p-4 rounded-xl border-2 text-center transition-all disabled:opacity-50 ${deliveryType === 'DELIVERY' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:border-emerald-200'}`}><Truck className="w-6 h-6 mx-auto mb-2" /><div className="font-bold text-sm">Entrega (Kz {deliveryFee})</div><div className="text-xs opacity-70">Receba em casa</div></button>
              <button disabled={isProcessing} onClick={() => setDeliveryType('PICKUP')} className={`p-4 rounded-xl border-2 text-center transition-all disabled:opacity-50 ${deliveryType === 'PICKUP' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:border-emerald-200'}`}><Store className="w-6 h-6 mx-auto mb-2" /><div className="font-bold text-sm">Reserva (Grátis)</div><div className="text-xs opacity-70">Busque na farmácia</div></button>
          </div>
          {deliveryType === 'DELIVERY' && (<div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in"><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> Endereço de Entrega</label><button disabled={isProcessing} onClick={() => setIsAddressEditing(!isAddressEditing)} className="text-xs text-blue-600 hover:underline disabled:opacity-50">{isAddressEditing ? 'Confirmar' : 'Alterar'}</button></div>{isAddressEditing ? (<input type="text" disabled={isProcessing} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border rounded text-sm focus:ring-2 ring-emerald-500 outline-none disabled:bg-gray-100" placeholder="Ex: Rua Direita do Camama, Casa 20..." autoFocus />) : (<p className="text-gray-800 font-medium">{address || 'Nenhum endereço definido.'}</p>)}</div>)}
          {deliveryType === 'PICKUP' && (<div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm flex gap-3 items-start animate-fade-in"><Store className="w-5 h-5 shrink-0 mt-0.5" /><div><p className="font-bold">Retirada na Loja</p><p>Sua encomenda será reservada. Dirija-se a:</p><p className="mt-1 font-medium bg-white/50 p-1 rounded inline-block">{pharmacyAddress}</p></div></div>)}
      </Card>
      <Card className="p-6 bg-gray-50">
          <div className="space-y-2 mb-4 text-sm text-gray-600"><div className="flex justify-between"><span>Subtotal</span><span>Kz {itemsTotal}</span></div><div className="flex justify-between"><span>Taxa de Entrega</span>{deliveryType === 'DELIVERY' ? <span>Kz {deliveryFee}</span> : <span className="text-emerald-600 font-bold">Grátis</span>}</div></div>
          <div className="flex justify-between items-center border-t border-gray-200 pt-4"><span className="font-bold text-lg text-gray-800">Total a Pagar</span><span className="font-bold text-2xl text-emerald-600">Kz {finalTotal}</span></div>
          <Button onClick={handleFinish} disabled={isProcessing} className={`w-full mt-6 py-4 text-lg shadow-lg group transition-all ${isProcessing ? 'opacity-80 cursor-not-allowed' : ''}`}>{isProcessing ? (<span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Processando...</span>) : (<>{deliveryType === 'DELIVERY' ? 'Confirmar Encomenda' : 'Reservar Agora'}<ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" /></>)}</Button>
      </Card>
    </div>
  );
};
