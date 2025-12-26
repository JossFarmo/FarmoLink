
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button, Toast } from '../components/UI';
import { Product, PRODUCT_CATEGORIES, GlobalProduct } from '../types';
import { Plus, XCircle, Edit2, Trash2, Search, Save, AlertTriangle, FileText, UploadCloud, ArrowRight, CheckCircle2, Loader2, X, ImageIcon, Link2 } from 'lucide-react';
import { addProduct, updateProduct, bulkDeletePharmacyProducts, fetchGlobalCatalog, bulkAddPharmacyProducts } from '../services/productService';
import { processBulkImportForPharmacy, ProcessedImportItem } from '../services/geminiService';
import { playSound } from '../services/soundService';

const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const PharmacyProductsView = ({ products, pharmacyId, onRefresh }: { products: Product[], pharmacyId: string, onRefresh?: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [bulkText, setBulkText] = useState('');
  const [processedItems, setProcessedItems] = useState<ProcessedImportItem[]>([]);
  
  const [fields, setFields] = useState({
      name: '', price: 0, stock: 10, category: PRODUCT_CATEGORIES[0], description: '', requiresPrescription: false, globalId: '', image: ''
  });

  const [catalogMatches, setCatalogMatches] = useState<GlobalProduct[]>([]);
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!fields.name || fields.price <= 0) {
        setToast({msg: "Nome e preço são obrigatórios", type: 'error'});
        return;
    }
    setLoading(true);
    const payload = {
        name: fields.name, description: fields.description || fields.name, price: fields.price, stock: fields.stock,
        requiresPrescription: fields.requiresPrescription, category: fields.category, pharmacyId: pharmacyId,
        image: fields.image || 'https://cdn-icons-png.flaticon.com/512/883/883407.png', globalProductId: fields.globalId || undefined
    };
    const result = editingId ? await updateProduct(editingId, payload) : await addProduct(payload);
    setLoading(false);
    if (result.success) { 
        playSound('save'); 
        setToast({msg: "Stock atualizado!", type: 'success'}); 
        reset(); 
        if(onRefresh) onRefresh(); 
    }
  };

  const handleNameChange = async (val: string) => {
      setFields({...fields, name: val});
      if (val.length > 2) {
          const matches = await fetchGlobalCatalog(val);
          setCatalogMatches(matches.slice(0, 5));
          setShowCatalogSuggestions(true);
      } else { setShowCatalogSuggestions(false); }
  };

  const applyCatalogMatch = (item: GlobalProduct) => {
      setFields({ ...fields, name: item.name, category: item.category, description: item.description, image: item.image, globalId: item.id });
      setShowCatalogSuggestions(false);
      playSound('success');
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setLoading(true);
    const globalData = await fetchGlobalCatalog();
    const items = await processBulkImportForPharmacy(bulkText, globalData);
    setProcessedItems(items);
    setLoading(false);
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    const toAdd = processedItems.map(it => ({
        name: it.name, description: it.description, price: it.price, stock: it.stock,
        requiresPrescription: false, category: it.category, pharmacyId: pharmacyId,
        image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', globalProductId: it.matchId
    }));
    const success = await bulkAddPharmacyProducts(toAdd);
    setLoading(false);
    if(success) {
        playSound('success');
        setToast({msg: "Importação concluída!", type: 'success'});
        reset();
        onRefresh?.();
    }
  };

  const reset = () => {
      setIsAdding(false); setIsBulkAdding(false); setEditingId(null); setBulkText(''); setProcessedItems([]); setShowCatalogSuggestions(false);
      setFields({ name: '', price: 0, stock: 10, category: PRODUCT_CATEGORIES[0], description: '', requiresPrescription: false, globalId: '', image: '' });
  }

  const filteredProducts = products.filter(p => normalizeText(p.name).includes(normalizeText(searchTerm)));

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Inventário (Stock)</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Controle total de produtos e preços</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkAdding(true)} className="text-xs h-10 border-blue-600 text-blue-600"><UploadCloud size={16} className="mr-1"/> Importar Lista</Button>
            <Button onClick={() => { reset(); setIsAdding(true); }} className="text-xs h-10"><Plus size={16} className="mr-1"/> Novo Item</Button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3">
          <Search className="text-gray-300 ml-4" size={20}/>
          <input placeholder="Filtrar seu stock por nome..." className="w-full py-4 outline-none font-bold text-gray-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed">
                  <PackageCheck size={48} className="mx-auto text-gray-200 mb-2"/>
                  <p className="text-gray-400 font-bold">Nenhum produto no stock com este nome.</p>
              </div>
          ) : (
            filteredProducts.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border shadow-inner">
                            <img src={p.image} className="w-full h-full object-contain" alt={p.name} />
                        </div>
                        <Badge color={p.stock > 0 ? 'green' : 'red'}>{p.stock > 0 ? `Stock: ${p.stock}` : 'Esgotado'}</Badge>
                    </div>
                    <h3 className="font-bold text-gray-800 text-base mb-1 line-clamp-2 min-h-[3rem]">{p.name}</h3>
                    <p className="font-black text-2xl text-emerald-600 mb-4">Kz {p.price.toLocaleString()}</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { 
                                setEditingId(p.id); 
                                setFields({
                                    name: p.name, price: p.price, stock: p.stock, 
                                    category: p.category || PRODUCT_CATEGORIES[0], 
                                    description: p.description, requiresPrescription: p.requiresPrescription, 
                                    globalId: p.globalProductId || '', image: p.image
                                }); 
                                setIsAdding(true); 
                            }} 
                            className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all"
                        >
                            Editar Item
                        </button>
                        <button onClick={async () => { if(confirm("Remover permanentemente do seu stock?")) { await bulkDeletePharmacyProducts([p.id]); onRefresh?.(); } }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                    </div>
                </div>
            ))
          )}
      </div>

      {/* MODAL DE ADIÇÃO / EDIÇÃO */}
      {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <Card className="w-full max-w-2xl p-8 shadow-2xl border-t-4 border-emerald-500 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-8 border-b pb-4">
                      <h3 className="font-black text-2xl text-gray-800 flex items-center gap-2">
                          {editingId ? <Edit2 className="text-blue-500"/> : <Plus className="text-emerald-500"/>}
                          {editingId ? 'Editar Produto' : 'Adicionar ao Stock'}
                      </h3>
                      <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="relative">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome Comercial do Medicamento</label>
                          <div className="relative">
                            <input 
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all" 
                                placeholder="Busque ou digite o nome..."
                                value={fields.name}
                                onChange={e => handleNameChange(e.target.value)}
                                autoComplete="off"
                            />
                            {showCatalogSuggestions && catalogMatches.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-white border border-emerald-100 rounded-2xl shadow-2xl mt-1 z-[250] overflow-hidden animate-slide-in-top">
                                    <div className="p-2 bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b">Sugestões do Catálogo Global</div>
                                    {catalogMatches.map(match => (
                                        <div key={match.id} onClick={() => applyCatalogMatch(match)} className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center gap-3 transition-colors border-b last:border-0 group">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border group-hover:border-emerald-200"><img src={match.image} className="max-h-full object-contain p-1" /></div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-800">{match.name}</p>
                                                <p className="text-[8px] text-gray-400 uppercase">{match.category}</p>
                                            </div>
                                            <Link2 size={14} className="text-gray-300 group-hover:text-emerald-500"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Preço de Venda (Kz)</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300">Kz</span>
                                  <input type="number" className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-600" value={fields.price} onChange={e => setFields({...fields, price: Number(e.target.value)})}/>
                              </div>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Quantidade em Stock</label>
                              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={fields.stock} onChange={e => setFields({...fields, stock: Number(e.target.value)})}/>
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Categoria do Medicamento</label>
                          <select className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" value={fields.category} onChange={e => setFields({...fields, category: e.target.value})}>
                              {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                      </div>

                      <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <input 
                            type="checkbox" 
                            id="rx-needed" 
                            className="w-5 h-5 rounded text-blue-600" 
                            checked={fields.requiresPrescription} 
                            onChange={e => setFields({...fields, requiresPrescription: e.target.checked})}
                          />
                          <label htmlFor="rx-needed" className="text-xs font-black text-blue-800 uppercase tracking-tight cursor-pointer">Requer Receita Médica para Venda</label>
                      </div>

                      <div className="flex gap-3 pt-6 border-t">
                          <Button variant="outline" type="button" onClick={reset} className="flex-1 py-4 font-bold">Cancelar</Button>
                          <Button type="submit" disabled={loading} className="flex-[2] py-4 font-black text-lg shadow-xl shadow-emerald-100">
                              {loading ? <Loader2 className="animate-spin"/> : <Save size={20} className="mr-2"/>}
                              {editingId ? 'Gravar Alterações' : 'Adicionar ao Stock'}
                          </Button>
                      </div>
                  </form>
              </Card>
          </div>
      )}

      {/* MODAL DE IMPORTAÇÃO EM MASSA */}
      {isBulkAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <Card className="w-full max-w-4xl p-8 shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-8 border-b pb-4">
                      <h3 className="font-black text-2xl text-gray-800 flex items-center gap-2"><UploadCloud className="text-blue-500"/> Importar Lista Industrial</h3>
                      <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                  </div>

                  {processedItems.length === 0 ? (
                      <div className="space-y-6">
                          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                              <h4 className="font-black text-blue-800 text-sm uppercase mb-2 flex items-center gap-2"><Info size={16}/> Como importar?</h4>
                              <p className="text-xs text-blue-700 leading-relaxed">
                                Cole abaixo sua lista de produtos. O sistema tentará identificar nomes, laboratórios e preços automaticamente.
                                <br/><br/>
                                <strong>Dica de Formato:</strong> Nome do Produto (DCI), Dosagem, Forma, Qtd, Lab, Kz Valor
                              </p>
                          </div>
                          <textarea 
                            className="w-full p-6 border rounded-[32px] h-64 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 shadow-inner" 
                            placeholder="Ex: Panadol (Paracetamol), 500mg, Comp, 20 un, GSK, Kz 1500"
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                          />
                          <Button onClick={handleBulkImport} disabled={loading || !bulkText} className="w-full py-5 bg-blue-600 hover:bg-blue-700 font-black text-lg rounded-[32px] shadow-xl shadow-blue-100">
                              {loading ? <Loader2 className="animate-spin mr-2"/> : <Search className="mr-2"/>} Analisar Lista
                          </Button>
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div className="max-h-[50vh] overflow-y-auto border rounded-3xl custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="sticky top-0 bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                      <tr><th className="p-4">Medicamento Identificado</th><th className="p-4">Categoria</th><th className="p-4 text-right">Preço</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {processedItems.map((it, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50">
                                              <td className="p-4"><p className="text-xs font-bold text-gray-700">{it.name}</p></td>
                                              <td className="p-4"><Badge color="blue">{it.category}</Badge></td>
                                              <td className="p-4 text-right font-black text-emerald-600">Kz {it.price.toLocaleString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          <div className="flex gap-3">
                              <Button variant="outline" onClick={() => setProcessedItems([])} className="flex-1 font-bold">Voltar / Corrigir</Button>
                              <Button onClick={handleSaveBulk} disabled={loading} className="flex-[2] py-5 font-black text-lg bg-emerald-600 shadow-xl shadow-emerald-100">
                                  {loading ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle2 className="mr-2"/>} Confirmar {processedItems.length} Itens
                              </Button>
                          </div>
                      </div>
                  )}
              </Card>
          </div>
      )}
    </div>
  );
};

const PackageCheck = ({ size, className }: any) => <FileText size={size} className={className}/>;
const Info = ({ size, className }: any) => <AlertTriangle size={size} className={className}/>;
