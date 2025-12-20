
import { Search, Plus, Save, Database, Trash2, XCircle, Edit2, Download, UploadCloud, FileText, X, ArrowRight, CheckCircle2, AlertCircle, Loader2, Info, ImageIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Toast } from '../components/UI';
import { GlobalProduct, PRODUCT_CATEGORIES } from '../types';
import { fetchGlobalCatalog, addGlobalProduct, updateGlobalProduct, bulkDeleteGlobalProducts, bulkAddGlobalProducts, deleteGlobalProduct } from '../services/productService';
import { processBulkImportForMasterData, ProcessedImportItem } from '../services/geminiService';
import { playSound } from '../services/soundService';

export const AdminCatalogView = () => {
    const [products, setProducts] = useState<GlobalProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkText, setBulkText] = useState('');
    const [processedItems, setProcessedItems] = useState<ProcessedImportItem[]>([]);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    const [fields, setFields] = useState({
        name: '',
        category: PRODUCT_CATEGORIES[0],
        description: '',
        referencePrice: 0,
        image: ''
    });

    useEffect(() => { loadCatalog(); }, [searchTerm]);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const data = await fetchGlobalCatalog(searchTerm);
            setProducts(data);
        } catch (e) {
            console.error("Erro ao carregar catálogo:", e);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async () => {
        if(!fields.name) return setToast({msg: "Nome é obrigatório", type: 'error'});

        setLoading(true);
        const payload = {
            name: fields.name,
            description: fields.description || fields.name,
            category: fields.category,
            image: fields.image || 'https://cdn-icons-png.flaticon.com/512/883/883407.png',
            common: true,
            referencePrice: fields.referencePrice
        };

        const result = editingId ? await updateGlobalProduct(editingId, payload) : await addGlobalProduct(payload);
        setLoading(false);
        
        if(result.success) {
            playSound('save');
            setToast({msg: "Catálogo Atualizado!", type: 'success'});
            cancelEdit();
            loadCatalog();
        } else {
            playSound('error');
            setToast({msg: `Erro: ${result.error}`, type: 'error'});
        }
    }

    const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!window.confirm("ATENÇÃO: Deseja excluir este item permanentemente do catálogo mestre?")) {
            return;
        }
        
        setLoading(true);
        try {
            const result = await deleteGlobalProduct(id);
            if (result.success) {
                playSound('trash');
                setToast({msg: "Produto removido!", type: 'success'});
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                await loadCatalog();
            } else {
                playSound('error');
                const isForeignKeyError = result.error?.includes('foreign key');
                setToast({
                    msg: isForeignKeyError 
                        ? "Este produto está em uso por farmácias e não pode ser removido." 
                        : "Erro ao excluir: " + result.error,
                    type: 'error'
                });
            }
        } catch (err: any) {
            console.error("Erro fatal na exclusão:", err);
        } finally {
            setLoading(false);
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`ATENÇÃO: Deseja excluir permanentemente os ${selectedIds.size} produtos selecionados do catálogo mestre?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await bulkDeleteGlobalProducts(Array.from(selectedIds));
            
            if (result.success) {
                playSound('trash');
                setToast({ msg: `${selectedIds.size} produtos removidos com sucesso!`, type: 'success' });
                setSelectedIds(new Set());
                await loadCatalog();
            } else {
                playSound('error');
                const isForeignKeyError = result.error?.includes('foreign key');
                setToast({
                    msg: isForeignKeyError 
                        ? "Alguns produtos selecionados estão vinculados a farmácias e não puderam ser excluídos." 
                        : "Erro na exclusão em massa: " + result.error,
                    type: 'error'
                });
                await loadCatalog();
            }
        } catch (err) {
            setToast({ msg: "Erro de conexão ao processar exclusão.", type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    const startEdit = (e: React.MouseEvent, p: GlobalProduct) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingId(p.id);
        setIsAdding(true);
        setFields({
            name: p.name,
            category: p.category,
            description: p.description,
            referencePrice: p.referencePrice || 0,
            image: p.image || ''
        });
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    }

    const cancelEdit = () => {
        setEditingId(null); 
        setIsAdding(false); 
        setIsBulkAdding(false);
        setProcessedItems([]);
        setBulkText('');
        setFields({ name: '', category: PRODUCT_CATEGORIES[0], description: '', referencePrice: 0, image: '' });
    }

    const handleAnalyzeBulk = async () => {
        if (!bulkText.trim()) return;
        setLoading(true);
        const items = await processBulkImportForMasterData(bulkText);
        setProcessedItems(items);
        setLoading(false);
        playSound('click');
    }

    const handleSaveBulk = async () => {
        if (processedItems.length === 0) return;
        setLoading(true);
        const productsToAdd = processedItems.map(item => ({
            name: item.name,
            description: item.description,
            category: item.category,
            image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png',
            common: true,
            referencePrice: item.referencePrice || 0
        }));

        const success = await bulkAddGlobalProducts(productsToAdd);
        setLoading(false);

        if (success) {
            playSound('success');
            setToast({msg: `${processedItems.length} produtos importados!`, type: 'success'});
            cancelEdit();
            loadCatalog();
        } else {
            playSound('error');
            setToast({msg: "Erro na importação em massa", type: 'error'});
        }
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                        <Database size={24}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800">Catálogo Global (Master Data)</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Base de dados unificada. Use o registro rápido para volume.</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input 
                            placeholder="Pesquisar catálogo..." 
                            className="pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm w-full lg:w-64 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden lg:block"></div>

                    <Button variant="outline" onClick={() => setIsBulkAdding(true)} className="text-xs h-10 border-emerald-600 text-emerald-600">
                        <UploadCloud size={16} className="mr-2"/> Importar Texto
                    </Button>
                    
                    <Button onClick={() => setIsAdding(true)} className="text-xs h-10 bg-emerald-600 hover:bg-emerald-700">
                        <Plus size={16} className="mr-2"/> Novo
                    </Button>

                    {selectedIds.size > 0 && (
                        <Button variant="danger" onClick={handleBulkDelete} disabled={loading} className="text-xs h-10 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100">
                            {loading ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16} className="mr-2"/>}
                            Excluir Selecionados ({selectedIds.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* FORMULÁRIO INDIVIDUAL COM SUPORTE A IMAGEM */}
            {isAdding && (
                <Card className="border-2 border-emerald-500 shadow-xl p-8 animate-scale-in">
                    <div className="flex justify-between items-center mb-8 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Plus className="text-emerald-500"/>
                            <h3 className="font-black text-2xl text-gray-800">{editingId ? 'Editar Produto Mestre' : 'Novo Produto Individual'}</h3>
                        </div>
                        <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-red-500 p-2"><X size={24}/></button>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        {/* PRÉ-VISUALIZAÇÃO DE IMAGEM */}
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Capa do Produto</label>
                            <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden group relative">
                                {fields.image ? (
                                    <>
                                        <img src={fields.image} className="w-full h-full object-contain p-4" />
                                        <button type="button" onClick={() => setFields({...fields, image: ''})} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={12}/>
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="text-gray-200" size={60}/>
                                )}
                            </div>
                            <input 
                                className="w-full p-2 mt-4 border rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-emerald-500" 
                                placeholder="Link da imagem (URL)..."
                                value={fields.image}
                                onChange={e => setFields({...fields, image: e.target.value})}
                            />
                        </div>

                        <div className="md:col-span-3 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nome Comercial (Identificador)</label>
                                        <input 
                                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" 
                                            value={fields.name} 
                                            placeholder="Ex: Panadol (Paracetamol), 500mg, Comp..."
                                            onChange={e => setFields({...fields, name: e.target.value})} 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Categoria</label>
                                            <select className="w-full p-3 border rounded-xl text-sm" value={fields.category} onChange={e => setFields({...fields, category: e.target.value})}>
                                                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Preço de Ref. (Kz)</label>
                                            <input type="number" className="w-full p-3 border rounded-xl font-bold" value={fields.referencePrice} onChange={e => setFields({...fields, referencePrice: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ficha Técnica / Detalhes</label>
                                    <textarea className="w-full p-3 border rounded-xl h-40 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={fields.description} onChange={e => setFields({...fields, description: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={cancelEdit} className="px-8 font-bold">Cancelar</Button>
                        <Button onClick={handleSave} disabled={loading} className="px-12 font-black bg-emerald-600"><Save size={18} className="mr-2"/> Gravar no Catálogo</Button>
                    </div>
                </Card>
            )}

            {/* TABELA DE RESULTADOS COM MINIATURAS */}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.size === products.length && products.length > 0} 
                            onChange={toggleSelectAll} 
                            className="w-5 h-5 rounded text-emerald-600 cursor-pointer" 
                        />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Selecionar Tudo</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{products.length} itens no total</span>
                </div>
                
                <table className="w-full text-left">
                    <thead className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                        <tr>
                            <th className="p-6 w-10"></th>
                            <th className="p-6">Medicamento</th>
                            <th className="p-6">Categoria</th>
                            <th className="p-6 text-right">Preço Ref.</th>
                            <th className="p-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {loading && products.length === 0 ? (
                            <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500"/></td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={5} className="p-20 text-center text-gray-400 italic">Nenhum produto encontrado.</td></tr>
                        ) : (
                            products.map(p => (
                                <tr key={p.id} className={`hover:bg-gray-50 transition-all group ${selectedIds.has(p.id) ? 'bg-emerald-50' : ''}`}>
                                    <td className="p-6">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(p.id)} 
                                            onChange={() => toggleSelect(p.id)} 
                                            className="w-5 h-5 rounded text-emerald-600 cursor-pointer" 
                                        />
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center p-1 border shadow-inner">
                                                <img src={p.image} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                                                <span className="text-[10px] text-gray-400 truncate max-w-xs">{p.description}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6"><Badge color="blue">{p.category}</Badge></td>
                                    <td className="p-6 text-right font-mono font-bold text-gray-500">Kz {p.referencePrice?.toLocaleString() || '0'}</td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 relative z-50">
                                            <button 
                                                type="button"
                                                onClick={(e) => startEdit(e, p)} 
                                                className="p-3 text-blue-500 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm"
                                                title="Editar Informações"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteSingle(e, p.id)} 
                                                className="p-3 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm"
                                                title="Excluir Permanentemente"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
