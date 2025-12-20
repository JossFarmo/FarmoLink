
import React, { useState, useEffect } from 'react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [bulkText, setBulkText] = useState('');
  const [processedItems, setProcessedItems] = useState<ProcessedImportItem[]>([]);
  
  const [fields, setFields] = useState({
      name: '', price: 0, stock: 10, category: PRODUCT_CATEGORIES[0], description: '', requiresPrescription: false, globalId: '', image: ''
  });

  const [catalogMatches, setCatalogMatches] = useState<GlobalProduct[]>([]);
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (result.success) { playSound('save'); setToast({msg: "Stock atualizado!", type: 'success'}); reset(); onRefresh?.(); }
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
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Controle total de produtos</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkAdding(true)} className="text-xs h-10 border-blue-600 text-blue-600"><UploadCloud size={16} className="mr-1"/> Importar Lista</Button>
            <Button onClick={() => setIsAdding(true)} className="text-xs h-10"><Plus size={16} className="mr-1"/> Novo Item</Button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3">
          <Search className="text-gray-300 ml-4" size={20}/>
          <input placeholder="Filtrar seu stock por nome..." className="w-full py-4 outline-none font-bold text-gray-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border shadow-inner"><img src={p.image} className="w-full h-full object-contain" /></div>
                      <Badge color={p.stock > 0 ? 'green' : 'red'}>{p.stock > 0 ? `Stock: ${p.stock}` : 'Esgotado'}</Badge>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base mb-1 line-clamp-2">{p.name}</h3>
                  <p className="font-black text-2xl text-emerald-600 mb-4">Kz {p.price.toLocaleString()}</p>
                  <div className="flex gap-2">
                      <button onClick={() => { setEditingId(p.id); setIsAdding(true); setFields({name:p.name, price:p.price, stock:p.stock, category:p.category||'', description:p.description, requiresPrescription:p.requiresPrescription, globalId:p.globalProductId||'', image:p.image}); }} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all">Editar</button>
                      <button onClick={async () => { if(confirm("Remover do stock?")) { await bulkDeletePharmacyProducts([p.id]); onRefresh?.(); } }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
