
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { GlobalProduct, PRODUCT_CATEGORIES } from '../types';
import { fetchGlobalCatalog, addGlobalProduct, seedGlobalCatalog, clearGlobalCatalog, fetchFullGlobalCatalog, bulkUpsertGlobalProducts, restoreGlobalCatalogFromBackup } from '../services/dataService';
import { Search, Plus, Save, Database, Loader2, Tag, Trash2, AlertTriangle, RefreshCw, XCircle, ArrowRight, Download, UploadCloud, FileText } from 'lucide-react';
import { playSound } from '../services/soundService';
import { ProcessedImportItem, processBulkImportForMasterData } from '../services/geminiService';

export const AdminCatalogView = () => {
    const [products, setProducts] = useState<GlobalProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    
    // Bulk State
    const [bulkText, setBulkText] = useState('');
    const [previewItems, setPreviewItems] = useState<ProcessedImportItem[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);

    // Backup Restore State
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newProduct, setNewProduct] = useState({
        name: '', description: '', category: PRODUCT_CATEGORIES[0], image: '', common: true
    });

    useEffect(() => {
        loadCatalog();
    }, [searchTerm]);

    const loadCatalog = async () => {
        setLoading(true);
        const data = await fetchGlobalCatalog(searchTerm);
        setProducts(data);
        setLoading(false);
    }

    const resetForms = () => {
        setIsAdding(false);
        setIsBulkMode(false);
        setIsReviewing(false);
        setPreviewItems([]);
        setBulkText('');
        setNewProduct({ name: '', description: '', category: PRODUCT_CATEGORIES[0], image: '', common: true });
    }

    const handleAdd = async () => {
        if(!newProduct.name) return alert("Nome é obrigatório");
        setLoading(true);
        const success = await addGlobalProduct(newProduct);
        if(success) {
            playSound('save');
            resetForms();
            loadCatalog();
        } else {
            playSound('error');
            alert("Erro ao adicionar");
        }
        setLoading(false);
    }

    // --- BACKUP & RESTORE ---
    const handleExportBackup = async () => {
        setLoading(true);
        try {
            const allData = await fetchFullGlobalCatalog();
            const jsonString = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `farmolink_global_catalog_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            playSound('success');
            alert(`Backup gerado com sucesso! ${allData.length} itens exportados.`);
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar backup.");
        }
        setLoading(false);
    }

    const handleImportBackupClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;

        if(!confirm("Tem certeza? Isso irá restaurar/adicionar produtos do arquivo selecionado ao banco de dados.")) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if(Array.isArray(json)) {
                    setLoading(true);
                    const success = await restoreGlobalCatalogFromBackup(json);
                    if(success) {
                        playSound('success');
                        alert("Catálogo restaurado com sucesso!");
                        loadCatalog();
                    } else {
                        alert("Erro ao restaurar catálogo. Verifique o console.");
                    }
                    setLoading(false);
                } else {
                    alert("Arquivo inválido. O formato deve ser um array JSON de produtos.");
                }
            } catch (err) {
                alert("Erro ao ler arquivo JSON.");
            }
        };
        reader.readAsText(file);
        // Reset input value to allow selecting same file again
        e.target.value = '';
    }


    // --- BULK OPERATIONS ---
    const handleAnalyzeBulk = async () => {
        if(!bulkText.trim()) return;
        setLoading(true);
        // Busca catálogo inteiro para comparação
        const allCatalog = await fetchFullGlobalCatalog();
        const analyzed = await processBulkImportForMasterData(bulkText, allCatalog);
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
        newItems[index].action = newItems[index].action === 'CREATE' ? 'IGNORE' : 'CREATE';
        setPreviewItems(newItems);
    }

    const removePreviewItem = (index: number) => {
        const newItems = previewItems.filter((_, i) => i !== index);
        setPreviewItems(newItems);
    }

    const handleConfirmImport = async () => {
        const itemsToSync = previewItems.filter(i => i.action === 'CREATE');
        if(itemsToSync.length === 0) {
            alert("Nenhum item novo para adicionar.");
            return;
        }
        setLoading(true);
        const success = await bulkUpsertGlobalProducts(itemsToSync);
        setLoading(false);
        if(success) {
            playSound('success');
            alert(`Sucesso! ${itemsToSync.length} novos itens adicionados ao Mestre.`);
            resetForms();
            loadCatalog();
        } else {
            playSound('error');
            alert("Erro ao importar produtos.");
        }
    }

    const handleSeed = async () => {
        if(confirm("Isso irá adicionar centenas de medicamentos padrão ao banco de dados. Continuar?")) {
            setLoading(true);
            const msg = await seedGlobalCatalog();
            alert(msg);
            loadCatalog();
            setLoading(false);
        }
    }

    const handleClear = async () => {
        const confirm1 = confirm("PERIGO: Você tem certeza que deseja APAGAR TODO O CATÁLOGO GLOBAL?");
        if (confirm1) {
            const verification = prompt("Para confirmar, digite a palavra DELETAR abaixo:");
            if (verification === 'DELETAR') {
                setLoading(true);
                const success = await clearGlobalCatalog();
                if(success) {
                    playSound('trash');
                    alert("Catálogo limpo com sucesso.");
                    loadCatalog();
                } else {
                    alert("Erro ao limpar catálogo.");
                }
                setLoading(false);
            } else {
                alert("Ação cancelada. A palavra de verificação estava incorreta.");
            }
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
             {/* Hidden file input for restore */}
             <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleFileChange} />

             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Database className="text-emerald-600"/> Catálogo Global (Master Data)</h2>
                    <p className="text-sm text-gray-500">Base de dados unificada. Use o backup regularmente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="danger" onClick={handleClear} title="Apagar tudo (Requer Senha)" className="!p-2 bg-red-100 text-red-600 border border-red-200 hover:bg-red-200">
                         <Trash2 size={16}/>
                    </Button>
                    <div className="w-px h-8 bg-gray-300 mx-1"></div>
                    <Button variant="secondary" onClick={handleExportBackup} title="Baixar Backup (JSON)" className="!p-2 flex items-center gap-2">
                         <Download size={16}/> <span className="hidden md:inline">Backup</span>
                    </Button>
                    <Button variant="secondary" onClick={handleImportBackupClick} title="Restaurar Backup" className="!p-2 flex items-center gap-2">
                         <UploadCloud size={16}/> <span className="hidden md:inline">Restaurar</span>
                    </Button>
                    <div className="w-px h-8 bg-gray-300 mx-1"></div>
                    <Button variant="outline" onClick={() => { resetForms(); setIsBulkMode(true); }} className="text-xs">
                        <FileText size={16} className="mr-1"/> Importar Texto
                    </Button>
                    <Button onClick={() => { resetForms(); setIsAdding(true); }} className="text-xs">
                        <Plus size={16} className="mr-1"/> Novo
                    </Button>
                </div>
             </div>

             {/* MODO IMPORTAÇÃO EM MASSA (CÓPIA DA FARMÁCIA) */}
             {isBulkMode && (
                <Card className="border-t-4 border-indigo-500 animate-fade-in bg-indigo-50">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-indigo-900">Registro Rápido (Master Data)</h3>
                            <p className="text-sm text-indigo-700">Cole a lista de medicamentos. O sistema irá inferir as categorias.</p>
                        </div>
                        <button onClick={resetForms}><XCircle className="text-indigo-300 hover:text-indigo-500"/></button>
                    </div>
                    
                    {!isReviewing ? (
                        <>
                            <textarea 
                                className="w-full p-4 rounded-lg border border-indigo-200 h-48 focus:ring-2 focus:ring-indigo-400 font-mono text-sm"
                                placeholder={`Exemplo:\nParacetamol 500mg\nAmoxicilina 500mg\nDipirona Gotas`}
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="secondary" onClick={handleSeed} title="Auto-Popular">
                                     Usar Dados de Exemplo (Seed)
                                </Button>
                                <Button onClick={handleAnalyzeBulk} disabled={loading} className="!bg-indigo-600 hover:!bg-indigo-700">
                                    {loading ? 'Processando...' : 'Analisar Lista'} <ArrowRight size={16} className="ml-2"/>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 font-bold text-gray-600 w-1/3">Nome Padronizado</th>
                                            <th className="p-3 font-bold text-gray-600 w-1/3">Categoria Inferida</th>
                                            <th className="p-3 font-bold text-gray-600">Status</th>
                                            <th className="p-3 font-bold text-gray-600 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewItems.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${item.action === 'IGNORE' ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                                <td className="p-2">
                                                    <input type="text" className="w-full p-1 border rounded" value={item.rawName} onChange={e => updatePreviewItem(idx, 'rawName', e.target.value)}/>
                                                </td>
                                                <td className="p-2">
                                                    <select className="w-full p-1 border rounded text-xs" value={item.category} onChange={e => updatePreviewItem(idx, 'category', e.target.value)}>
                                                        {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-2 cursor-pointer select-none" onClick={() => toggleAction(idx)}>
                                                    {item.action === 'CREATE' ? <Badge color="green">Novo</Badge> : <Badge color="gray">Já Existe</Badge>}
                                                </td>
                                                <td className="p-2"><button onClick={() => removePreviewItem(idx)}><Trash2 size={16} className="text-red-400"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setIsReviewing(false)}>Voltar</Button>
                                <Button onClick={handleConfirmImport} disabled={loading} className="!bg-indigo-600">Salvar no Mestre</Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

             {/* Formulário de Adição Individual */}
             {isAdding && (
                 <Card className="bg-emerald-50 border-emerald-100 p-4">
                     <h3 className="font-bold text-emerald-800 mb-4">Adicionar Item Manualmente</h3>
                     <div className="grid md:grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-bold text-gray-500">Nome do Medicamento</label>
                             <input className="w-full p-2 rounded border" placeholder="Ex: Paracetamol 500mg" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-gray-500">Categoria</label>
                             <select className="w-full p-2 rounded border" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                                 {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                         </div>
                         <div className="col-span-2">
                             <label className="text-xs font-bold text-gray-500">Descrição Padrão</label>
                             <input className="w-full p-2 rounded border" placeholder="Descrição genérica..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                         </div>
                         <div className="col-span-2 flex justify-end gap-2">
                             <Button variant="secondary" onClick={() => setIsAdding(false)}>Cancelar</Button>
                             <Button onClick={handleAdd}>Salvar</Button>
                         </div>
                     </div>
                 </Card>
             )}

             {/* Busca */}
             {!isAdding && !isBulkMode && (
                <div className="bg-white p-2 rounded-lg border flex items-center gap-2 shadow-sm">
                    <Search className="text-gray-400 ml-2"/>
                    <input 
                        className="w-full outline-none" 
                        placeholder="Pesquisar no catálogo global..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
             )}

             {/* Lista */}
             {!isAdding && !isBulkMode && (
                loading ? <div className="text-center p-10"><Loader2 className="animate-spin inline text-emerald-600"/></div> : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Nome</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-800">{p.name}</td>
                                        <td className="p-3 text-sm text-gray-600"><Tag size={12} className="inline mr-1"/> {p.category}</td>
                                        <td className="p-3"><Badge color="green">Mestre</Badge></td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
             )}
        </div>
    );
}
