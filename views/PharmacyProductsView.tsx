
import React, { useState, useMemo } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { Product, PRODUCT_CATEGORIES, GlobalProduct } from '../types';
import { RefreshCw, Plus, XCircle, ArrowRight, Save, Edit2, Trash2, Unplug, Search, List, Filter, Tag } from 'lucide-react';
import { addProduct, updateProduct, deleteProduct, deleteAllProducts, bulkUpsertProducts, fetchGlobalCatalog, fetchFullGlobalCatalog } from '../services/dataService';
import { processBulkImportWithMatching, ProcessedImportItem } from '../services/geminiService';
import { playSound } from '../services/soundService';

export const PharmacyProductsView = ({ products, pharmacyId, onRefresh }: { products: Product[], pharmacyId: string, onRefresh?: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Filtros de visualização
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para Sugestões do Catálogo Global
  const [catalogSuggestions, setCatalogSuggestions] = useState<GlobalProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estado para o processo de importação inteligente
  const [bulkText, setBulkText] = useState('');
  const [previewItems, setPreviewItems] = useState<ProcessedImportItem[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 10,
    requiresPrescription: false,
    category: PRODUCT_CATEGORIES[0],
    globalProductId: undefined as string | undefined
  });

  // Agrupamento de produtos
  const groupedProducts = useMemo(() => {
      let filtered = products;
      
      if (searchTerm) {
          filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      if (categoryFilter !== 'Todos') {
          filtered = filtered.filter(p => p.category === categoryFilter);
      }

      // Agrupar por categoria
      const groups: { [key: string]: Product[] } = {};
      filtered.forEach(p => {
          const cat = p.category || 'Outros / Uso Especial'; // Fallback seguro
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(p);
      });

      return groups;
  }, [products, searchTerm, categoryFilter]);

  // Lista de categorias ordenadas que possuem produtos
  const sortedGroupKeys = useMemo(() => {
      // Usa a ordem de PRODUCT_CATEGORIES para garantir a ordem correta, mais quaisquer categorias extras que possam existir
      const keys = Object.keys(groupedProducts);
      return PRODUCT_CATEGORIES.filter(c => keys.includes(c))
             .concat(keys.filter(k => !PRODUCT_CATEGORIES.includes(k)).sort());
  }, [groupedProducts]);

  const resetForms = () => {
      setNewProduct({ name: '', description: '', price: 0, stock: 10, requiresPrescription: false, category: PRODUCT_CATEGORIES[0], globalProductId: undefined });
      setEditingProduct(null);
      setIsAdding(false);
      setIsBulkMode(false);
      setIsReviewing(false);
      setPreviewItems([]);
      setBulkText('');
      setCatalogSuggestions([]);
  }

  const handleEditClick = (product: Product) => {
      setEditingProduct(product);
      setNewProduct({
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          requiresPrescription: product.requiresPrescription,
          category: product.category || PRODUCT_CATEGORIES[0],
          globalProductId: product.globalProductId
      });
      setIsAdding(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Busca sugestões no catálogo global enquanto digita
  const handleNameChange = async (val: string) => {
      setNewProduct({ ...newProduct, name: val });
      if (val.length > 2) {
          const suggestions = await fetchGlobalCatalog(val);
          setCatalogSuggestions(suggestions);
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  }

  const selectCatalogItem = (item: GlobalProduct) => {
      setNewProduct({
          ...newProduct,
          name: item.name,
          description: item.description,
          category: item.category,
          globalProductId: item.id
      });
      setShowSuggestions(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let success = false;

    const payload = {
        ...newProduct,
        pharmacyId: pharmacyId,
        image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png' 
    };

    if (editingProduct) {
        success = await updateProduct(editingProduct.id, payload);
    } else {
        success = await addProduct(payload);
    }

    setLoading(false);
    if (success) {
      playSound('save'); // Som de Salvar
      alert(editingProduct ? 'Produto atualizado!' : 'Medicamento cadastrado!');
      resetForms();
      if (onRefresh) onRefresh(); else window.location.reload(); 
    } else {
      playSound('error');
      alert('Erro ao salvar.');
    }
  };

  // --- ANÁLISE DE IMPORTAÇÃO (COM MATCHING GLOBAL) ---
  const handleAnalyzeBulk = async () => {
      if(!bulkText.trim()) return;
      setLoading(true);
      
      // 1. Busca todo o catálogo global para usar como referência
      const globalCatalog = await fetchFullGlobalCatalog();
      
      // 2. Analisa o texto: tenta achar match no Global, depois no Local
      const analyzed = await processBulkImportWithMatching(bulkText, products, globalCatalog);
      
      setPreviewItems(analyzed);
      setIsReviewing(true);
      setLoading(false);
  }

  const updatePreviewItem = (index: number, field: keyof ProcessedImportItem, value: any) => {
      const newItems = [...previewItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setPreviewItems(newItems);
  }

  const toggleAction = (index: number) => {
      const newItems = [...previewItems];
      const current = newItems[index].action;
      if (current === 'CREATE') {
          newItems[index].action = newItems[index].matchId ? 'UPDATE' : 'IGNORE'; 
      } else if (current === 'UPDATE') {
          newItems[index].action = 'IGNORE';
      } else {
          newItems[index].action = 'CREATE';
      }
      setPreviewItems(newItems);
  }

  const removePreviewItem = (index: number) => {
      if(confirm('Remover esta linha da importação?')) {
          const newItems = previewItems.filter((_, i) => i !== index);
          setPreviewItems(newItems);
      }
  }

  const handleConfirmImport = async () => {
      const itemsToSync = previewItems.filter(i => i.action !== 'IGNORE');
      if(itemsToSync.length === 0) {
          alert("Nenhuma alteração detectada para sincronizar.");
          return;
      }
      setLoading(true);
      const success = await bulkUpsertProducts(pharmacyId, itemsToSync);
      setLoading(false);
      if(success) {
          playSound('success');
          alert("Sincronização concluída com sucesso!");
          resetForms();
          if (onRefresh) onRefresh();
      } else {
          playSound('error');
          alert("Erro ao sincronizar produtos.");
      }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      await deleteProduct(id);
      playSound('trash'); // Som de lixeira
      if (onRefresh) onRefresh(); else window.location.reload();
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('ATENÇÃO: Tem certeza que deseja APAGAR TODOS os produtos do seu estoque?\n\nEsta ação é irreversível e limpará completamente seu inventário.')) {
        setLoading(true);
        const success = await deleteAllProducts(pharmacyId);
        setLoading(false);
        if (success) {
            playSound('trash'); // Som de lixeira
            alert("Estoque limpo com sucesso.");
            if (onRefresh) onRefresh(); else window.location.reload();
        } else {
            alert("Erro ao limpar estoque.");
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Meus Produtos ({products.length})</h1>
        <div className="flex gap-2">
            {products.length > 0 && (
                <Button variant="danger" onClick={handleDeleteAll} title="Apagar todos os produtos" className="px-3">
                    <Trash2 size={18}/>
                </Button>
            )}
            <Button variant="outline" onClick={() => { setIsBulkMode(true); setIsAdding(false); }}>
                <RefreshCw size={18} className="mr-2"/> Sincronizar Estoque (POS)
            </Button>
            <Button onClick={() => { setIsAdding(true); setIsBulkMode(false); setEditingProduct(null); resetForms(); }}>
                <Plus size={18} className="mr-2"/> Novo Produto
            </Button>
        </div>
      </div>

      {/* ÁREA DE FILTROS E BUSCA */}
      {!isAdding && !isBulkMode && (
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row gap-4 items-center shadow-sm">
              <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={18} className="text-gray-500"/>
                  <select 
                    className="p-2 border rounded-lg bg-gray-50 text-gray-700 w-full"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                      <option value="Todos">Todas as Categorias</option>
                      {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
          </div>
      )}

      {/* MODO IMPORTAÇÃO */}
      {isBulkMode && (
          <Card className="border-t-4 border-blue-500 animate-fade-in bg-blue-50">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="font-bold text-lg text-blue-900">Sincronização com POS</h3>
                      <p className="text-sm text-blue-700">O sistema irá corrigir nomes e categorias baseados no Catálogo Global.</p>
                  </div>
                  <button onClick={resetForms}><XCircle className="text-blue-300 hover:text-blue-500"/></button>
              </div>
              
              {!isReviewing ? (
                  <>
                      <textarea 
                        className="w-full p-4 rounded-lg border border-blue-200 h-48 focus:ring-2 focus:ring-blue-400 font-mono text-sm"
                        placeholder={`Exemplo do seu POS:\nParacetamol 500mg\t50\t500\nBen-u-ron (Paracetamol)\t10\t1200\nAmoxicilina 500mg | 20 | 2000`}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                      />
                      <div className="mt-4 flex justify-end">
                          <Button onClick={handleAnalyzeBulk} disabled={loading} className="!bg-blue-600 hover:!bg-blue-700">
                              {loading ? 'Analisando...' : 'Analisar e Padronizar'} <ArrowRight size={16} className="ml-2"/>
                          </Button>
                      </div>
                  </>
              ) : (
                  <div className="space-y-4">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto shadow-sm">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                  <tr>
                                      <th className="p-3 font-bold text-gray-600 w-1/4">Produto</th>
                                      <th className="p-3 font-bold text-gray-600 w-1/4">Categoria</th>
                                      <th className="p-3 font-bold text-gray-600">Ação</th>
                                      <th className="p-3 font-bold text-gray-600 w-20">Preço</th>
                                      <th className="p-3 font-bold text-gray-600 w-16">Qtd.</th>
                                      <th className="p-3 font-bold text-gray-600 w-10"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {previewItems.map((item, idx) => (
                                      <tr key={idx} className={`hover:bg-gray-50 transition-colors ${item.action === 'IGNORE' ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                          <td className="p-2">
                                              <input type="text" className="w-full p-1 border rounded" value={item.rawName} onChange={e => updatePreviewItem(idx, 'rawName', e.target.value)}/>
                                              {item.matchId && !item.matchName && <div className="text-[10px] text-green-600 flex items-center gap-1"><Tag size={10}/> Padronizado pelo Mestre</div>}
                                              {item.matchName && <div className="text-[10px] text-blue-600">Atualiza: {item.matchName}</div>}
                                          </td>
                                          <td className="p-2">
                                              <select className="w-full p-1 border rounded text-xs" value={item.category} onChange={e => updatePreviewItem(idx, 'category', e.target.value)}>
                                                  {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                              </select>
                                          </td>
                                          <td className="p-2 cursor-pointer select-none" onClick={() => toggleAction(idx)}>
                                              {item.action === 'CREATE' && <Badge color="green">Novo</Badge>}
                                              {item.action === 'UPDATE' && <Badge color="blue">Atualizar</Badge>}
                                              {item.action === 'IGNORE' && <Badge color="gray">Ignorar</Badge>}
                                          </td>
                                          <td className="p-2">
                                              <input type="number" className="w-full p-1 border rounded text-right" value={item.price} onChange={e => updatePreviewItem(idx, 'price', Number(e.target.value))} />
                                          </td>
                                          <td className="p-2">
                                              <input type="number" className="w-full p-1 border rounded text-center" value={item.stock} onChange={e => updatePreviewItem(idx, 'stock', Number(e.target.value))} />
                                          </td>
                                          <td className="p-2"><button onClick={() => removePreviewItem(idx)}><Trash2 size={16} className="text-red-400"/></button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setIsReviewing(false)}>Voltar</Button>
                          <Button onClick={handleConfirmImport} disabled={loading}>Salvar</Button>
                      </div>
                  </div>
              )}
          </Card>
      )}

      {/* MODO ADICIONAR / EDITAR (Mantido igual) */}
      {isAdding && (
        <Card className="border-t-4 border-emerald-500 animate-fade-in">
          {/* ... FORMULÁRIO DE ADIÇÃO MANTIDO ... */}
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">{editingProduct ? 'Editar Produto' : 'Novo Medicamento'}</h3>
              <button onClick={resetForms}><XCircle className="text-gray-400 hover:text-gray-600"/></button>
          </div>
          <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-4">
            <div className="col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700">Nome do Medicamento</label>
              <input required className="w-full p-2 border rounded" value={newProduct.name} onChange={e => handleNameChange(e.target.value)} />
              {showSuggestions && catalogSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-50 max-h-48 overflow-y-auto">
                      {catalogSuggestions.map(item => (
                          <div key={item.id} onClick={() => selectCatalogItem(item)} className="p-2 hover:bg-emerald-50 cursor-pointer">{item.name}</div>
                      ))}
                  </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
              <select className="w-full p-2 border rounded" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {PRODUCT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea className="w-full p-2 border rounded" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço</label>
              <input type="number" required className="w-full p-2 border rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estoque</label>
              <input type="number" required className="w-full p-2 border rounded" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}/>
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* LISTA DE PRODUTOS AGRUPADA */}
      <div className="space-y-8">
          {Object.keys(groupedProducts).length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500">Nenhum produto encontrado.</div>
          )}

          {sortedGroupKeys.map((category) => {
              const prods = groupedProducts[category];
              if(!prods || prods.length === 0) return null;

              return (
              <div key={category} className="space-y-3">
                  <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Tag size={18} className="text-emerald-500"/> {category} 
                      <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{prods.length}</span>
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {prods.map(p => (
                        <Card key={p.id} className="relative group hover:shadow-md transition-shadow !p-4">
                            <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{p.description && p.description.substring(0, 50)}...</p>
                                <div className="mt-2 font-bold text-emerald-600">Kz {p.price}</div>
                                <div className="text-xs text-gray-400 mt-1">Estoque: {p.stock}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => handleEditClick(p)} className="text-blue-400 hover:text-blue-600 p-1 bg-blue-50 rounded"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(p.id)} className="text-red-300 hover:text-red-500 p-1 bg-red-50 rounded"><Trash2 size={16}/></button>
                            </div>
                            </div>
                            {p.requiresPrescription && <Badge color="red">Receita</Badge>}
                            {p.globalProductId && <div className="absolute bottom-2 right-2 text-xs text-blue-300" title="Sincronizado"><Unplug size={12}/></div>}
                        </Card>
                      ))}
                  </div>
              </div>
              );
          })}
      </div>
    </div>
  );
};
