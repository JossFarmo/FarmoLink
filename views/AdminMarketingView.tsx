
import React, { useState, useEffect } from 'react';
import { Card, Button, Toast } from '../components/UI';
import { CarouselSlide, Partner } from '../types';
import { fetchLandingContent, updateCarouselSlide, addCarouselSlide, addPartner, deletePartner } from '../services/dataService';
import { Image as ImageIcon, Save, Plus, Globe, Trash2, Edit, X, Loader2, Link2 } from 'lucide-react';
import { playSound } from '../services/soundService';

export const AdminMarketingView = () => {
    const [slides, setSlides] = useState<CarouselSlide[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveLoadingId, setSaveLoadingId] = useState<string | null>(null);
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [newPartner, setNewPartner] = useState({ name: '', logoUrl: '' });
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const content = await fetchLandingContent();
        setSlides(content.slides);
        setPartners(content.partners);
        setLoading(false);
    };

    const handleSaveSlide = async (slide: CarouselSlide) => {
        setSaveLoadingId(slide.id);
        const res = await updateCarouselSlide(slide);
        setSaveLoadingId(null);
        if(res.success) {
            playSound('save');
            setToast({msg: "Banner atualizado no ecossistema!", type: 'success'});
            setEditingSlideId(null); 
            // Recarrega para garantir que os links Cloudinary apareçam
            load(); 
        } else {
            setToast({msg: "Falha ao sincronizar link.", type: 'error'});
        }
    };

    const handleAddSlide = async () => {
        setLoading(true);
        const success = await addCarouselSlide({
            title: "Novo Título do Banner",
            subtitle: "Descreva a oferta ou serviço aqui.",
            imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2d5f926?q=80&w=2079&auto=format&fit=crop",
            buttonText: "Ver Mais",
            order: slides.length + 1
        });
        if(success) load();
        else setLoading(false);
    };

    const handleAddPartner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPartner.name || !newPartner.logoUrl) return;
        setLoading(true);
        const success = await addPartner(newPartner.name, newPartner.logoUrl);
        setLoading(false);
        if (success) {
            playSound('success');
            setToast({msg: "Parceiro adicionado!", type: 'success'});
            setNewPartner({ name: '', logoUrl: '' });
            setShowPartnerModal(false);
            load();
        }
    };

    const handleDeletePartner = async (id: string) => {
        if (confirm("Remover este parceiro?")) {
            const success = await deletePartner(id);
            if (success) { playSound('trash'); load(); }
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <section className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><ImageIcon className="text-emerald-500"/> Gestor de Banners (Carrossel)</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Imagens da Landing Page</p>
                    </div>
                    <Button onClick={handleAddSlide} variant="secondary" className="font-bold" disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : <Plus size={18} className="mr-2"/>} Novo Banner</Button>
                </div>

                <div className="grid gap-4">
                    {slides.map(slide => {
                        const isEditing = editingSlideId === slide.id;
                        return (
                            <Card key={slide.id} className={`transition-all duration-300 border-l-8 border-emerald-500 shadow-sm bg-white p-0 overflow-hidden`}>
                                <div className="p-4 flex items-center justify-between group cursor-pointer hover:bg-gray-50" onClick={() => !isEditing && setEditingSlideId(slide.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden border">
                                            {slide.imageUrl ? (
                                                <img src={slide.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 uppercase text-xs">{slide.title}</h4>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[200px]">{slide.imageUrl || 'Sem Link'}</p>
                                        </div>
                                    </div>
                                    {!isEditing ? <Edit size={18} className="text-gray-300 group-hover:text-emerald-600"/> : <X size={18} className="text-red-400" onClick={(e) => { e.stopPropagation(); setEditingSlideId(null); }}/>}
                                </div>
                                {isEditing && (
                                    <div className="p-6 border-t bg-gray-50 animate-fade-in space-y-4">
                                        <div className="grid lg:grid-cols-4 gap-8">
                                            <div className="lg:col-span-1 space-y-3">
                                                <div className="aspect-video rounded-2xl border bg-white flex items-center justify-center overflow-hidden shadow-inner">
                                                    {slide.imageUrl ? <img src={slide.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-200" size={40}/>}
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><Link2 size={10}/> Link da Imagem (Cloudinary)</label>
                                                    <input 
                                                        className="w-full p-2 border rounded-xl text-[10px] font-mono outline-none focus:ring-2 focus:ring-emerald-500" 
                                                        value={slide.imageUrl} 
                                                        placeholder="https://res.cloudinary.com/..."
                                                        onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? {...s, imageUrl: e.target.value} : s))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="lg:col-span-3 space-y-4">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase">Título em Destaque</label>
                                                        <input className="w-full p-3 border rounded-xl font-bold text-sm uppercase" value={slide.title} onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? {...s, title: e.target.value} : s))}/>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase">Texto do Botão</label>
                                                        <input className="w-full p-3 border rounded-xl font-bold text-sm uppercase" value={slide.buttonText} onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? {...s, buttonText: e.target.value} : s))}/>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase">Subtítulo / Descrição</label>
                                                    <textarea className="w-full p-3 border rounded-xl h-20 text-sm" value={slide.subtitle} onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? {...s, subtitle: e.target.value} : s))}/>
                                                </div>
                                                <div className="flex justify-end gap-3 pt-2">
                                                    <Button variant="outline" onClick={() => setEditingSlideId(null)} className="px-6">Cancelar</Button>
                                                    <Button onClick={() => handleSaveSlide(slide)} disabled={saveLoadingId === slide.id} className="px-10 bg-emerald-600 shadow-lg shadow-emerald-100">
                                                        {saveLoadingId === slide.id ? <Loader2 className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>} 
                                                        Guardar Alterações
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Globe className="text-blue-500"/> Marcas Colaboradoras</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Exibidas no rodapé da Landing Page</p>
                    </div>
                    <Button onClick={() => setShowPartnerModal(true)} variant="outline" className="font-bold border-2"><Plus size={18} className="mr-2"/> Novo Parceiro</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {partners.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center group relative h-32 justify-center hover:border-blue-200 transition-all">
                            <button onClick={() => handleDeletePartner(p.id)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 hover:scale-110"><Trash2 size={14}/></button>
                            <img src={p.logoUrl} className="max-w-full max-h-16 object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                            <span className="text-[9px] font-black text-gray-300 uppercase mt-2">{p.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {showPartnerModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md p-8 animate-scale-in rounded-[40px]">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Novo Parceiro</h3><button onClick={() => setShowPartnerModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button></div>
                        <form onSubmit={handleAddPartner} className="space-y-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome da Instituição</label><input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} required/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">URL do Logotipo</label><input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-mono text-xs" value={newPartner.logoUrl} onChange={e => setNewPartner({...newPartner, logoUrl: e.target.value})} required/></div>
                            <Button type="submit" className="w-full py-5 bg-emerald-600 rounded-3xl font-black shadow-xl" disabled={loading}>Adicionar Marca</Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};
