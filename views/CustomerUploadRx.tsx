
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, BrainCircuit, Sparkles, ShieldCheck, ChevronRight, ArrowLeft, Loader2, X, Check, MessageSquare, AlertTriangle, Truck, Store, MapPin, Activity, Info, Image as ImageIcon } from 'lucide-react';
import { Pharmacy, User, Product } from '../types';
import { Button, Card } from '../components/UI';
import { createPrescriptionRequest } from '../services/orderService';
import { analyzePrescriptionVision } from '../services/geminiService';
import { playSound } from '../services/soundService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

const MedicalDisclaimer = ({ method }: { method: 'MANUAL' | 'AI' | null }) => {
    if (method === 'AI') {
        return (
            <div className="mt-8 p-6 bg-blue-50 rounded-[32px] border border-blue-100 animate-fade-in">
                <div className="flex gap-4 items-start">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg"><BrainCircuit size={20} /></div>
                    <div className="space-y-2">
                        <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">Assistente de Receitas IA <Sparkles size={12} className="text-blue-500"/></p>
                        <p className="text-[10px] text-blue-700 leading-relaxed font-medium">A IA ajuda na leitura, mas a <strong>validação final é sempre do farmacêutico.</strong></p>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="mt-8 p-6 bg-gray-50 rounded-[32px] border border-gray-200">
            <div className="flex gap-4 items-start">
                <div className="p-2 bg-gray-400 text-white rounded-xl"><ShieldCheck size={20} /></div>
                <div className="space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Procedimento Seguro</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">Deves apresentar a receita física original no ato da entrega ou levantamento. O FarmoLink reserva o stock para ti.</p>
                </div>
            </div>
        </div>
    );
};

export const PrescriptionUploadView = ({ pharmacies, user, onNavigate }: any) => {
  const [method, setMethod] = useState<'MANUAL' | 'AI' | null>(null);
  const [step, setStep] = useState<'CHOOSE' | 'UPLOAD' | 'PROCESSING' | 'CONFIRM'>('CHOOSE');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedPharmacies, setSelectedPharmacies] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [userNotes, setUserNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'CONFIRM' && selectedPharmacies.length === 0) {
        const auto = pharmacies.filter(p => p.status === 'APPROVED' && p.isAvailable).sort((a, b) => (b.review_score || 0) - (a.review_score || 0)).slice(0, 5).map(p => p.id);
        if (auto.length > 0) setSelectedPharmacies(auto);
    }
  }, [step, pharmacies]);

  const processFile = async (file: File) => {
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    setStep('PROCESSING');
    playSound('click');
    try {
        const url = await uploadImageToCloudinary(file as any);
        if (!url) throw new Error("Falhou");
        setRemoteUrl(url);
        if (method === 'AI') setAiAnalysis(await analyzePrescriptionVision(url));
        setStep('CONFIRM');
        playSound('success');
    } catch (err) { alert("Erro ao carregar imagem. Tente de novo."); setStep('UPLOAD'); }
  };

  const handleFinalSend = async () => {
      let targets = [...selectedPharmacies];
      if (targets.length === 0) targets = pharmacies.filter(p => p.status === 'APPROVED' && p.isAvailable).slice(0, 5).map(p => p.id);
      if (!remoteUrl) return alert("Imagem inválida.");
      setIsSending(true);
      const deliveryTag = deliveryType === 'DELIVERY' ? "[ENTREGA]" : "[LEVANTAMENTO]";
      const ok = await createPrescriptionRequest(user.id, remoteUrl, targets, `${deliveryTag} ${userNotes}`, aiAnalysis);
      if (ok.success) onNavigate('prescriptions');
      else alert(ok.error);
      setIsSending(false);
  };

  const togglePharmacy = (id: string) => {
      setSelectedPharmacies(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
      playSound('click');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4">
      {step === 'CHOOSE' && (
          <div className="space-y-10 py-10 animate-fade-in">
              <div className="text-center space-y-4">
                  <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Escolha o modo de envio</h1>
                  <p className="text-gray-500 font-medium">A forma mais rápida de comparar preços nas farmácias.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div onClick={() => { setMethod('MANUAL'); setStep('UPLOAD'); }} className="bg-white p-8 rounded-[48px] border-4 border-transparent hover:border-emerald-500 shadow-xl cursor-pointer transition-all hover:scale-105 group relative overflow-hidden h-full flex flex-col">
                      <div className="absolute top-6 right-6 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Seguro</div>
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Camera size={40} /></div>
                      <h3 className="text-2xl font-black text-gray-800 mb-2">Envio Direto</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">Envia para as farmácias e elas respondem com orçamentos.</p>
                      <div className="mt-auto pt-8 flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">Prosseguir <ChevronRight size={16}/></div>
                  </div>
                  <div onClick={() => { setMethod('AI'); setStep('UPLOAD'); }} className="bg-white p-8 rounded-[48px] border-4 border-transparent hover:border-blue-500 shadow-xl cursor-pointer transition-all hover:scale-105 group relative overflow-hidden h-full flex flex-col">
                      <div className="absolute top-6 right-6 bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Rápido</div>
                      <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[28px] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors"><BrainCircuit size={40} /></div>
                      <h3 className="text-2xl font-black text-gray-800 mb-2">Assistente IA</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">A IA lê a receita e ajuda as farmácias a responderem mais rápido.</p>
                      <div className="mt-auto pt-8 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">Testar IA <Sparkles size={16}/></div>
                  </div>
              </div>
          </div>
      )}

      {step === 'UPLOAD' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <button onClick={() => setStep('CHOOSE')} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase hover:text-emerald-600 transition-colors"><ArrowLeft size={16}/> Voltar</button>
             
             {/* --- FIX 6: OPÇÕES EXPLÍCITAS DE CÂMERA OU GALERIA --- */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-8 text-center border-emerald-100 hover:border-emerald-500 cursor-pointer transition-all shadow-lg active:scale-95 group" onClick={() => cameraInputRef.current?.click()}>
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Camera size={32}/></div>
                    <h3 className="font-black text-gray-800 uppercase text-xs">Abrir Câmera</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Tirar foto agora</p>
                    <input type="file" ref={cameraInputRef} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} accept="image/*" capture="environment" className="hidden" />
                </Card>

                <Card className="p-8 text-center border-blue-100 hover:border-blue-500 cursor-pointer transition-all shadow-lg active:scale-95 group" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all"><ImageIcon size={32}/></div>
                    <h3 className="font-black text-gray-800 uppercase text-xs">Galeria</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Escolher do arquivo</p>
                    <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} accept="image/*" className="hidden" />
                </Card>
             </div>
          </div>
      )}

      {step === 'PROCESSING' && (
          <div className="text-center py-32 animate-fade-in space-y-6">
              <div className={`w-24 h-24 border-8 rounded-full animate-spin mx-auto ${method === 'AI' ? 'border-blue-100 border-t-blue-600' : 'border-emerald-100 border-t-emerald-600'}`}></div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Sincronizando Dados...</h2>
          </div>
      )}

      {step === 'CONFIRM' && (
          <div className="grid lg:grid-cols-12 gap-8 animate-scale-in">
              <div className="lg:col-span-5 space-y-4">
                  <Card className="p-0 overflow-hidden rounded-[48px] shadow-2xl border-none bg-black relative aspect-[3/4] flex items-center justify-center">
                      <img src={localPreview || remoteUrl || ''} className="w-full h-full object-contain opacity-90" alt="Receita" />
                      <button onClick={() => setStep('UPLOAD')} className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-all"><X/></button>
                  </Card>
              </div>

              <div className="lg:col-span-7 space-y-6">
                  {method === 'AI' && aiAnalysis && (
                      <div className="bg-blue-600 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden animate-slide-in-right">
                          <h4 className="text-xl font-black flex items-center gap-2 mb-4"><BrainCircuit/> Resultados da IA:</h4>
                          <div className="space-y-2 mb-4">
                              {aiAnalysis.suggested_items?.map((it: any, i: number) => (
                                  <div key={i} className="bg-white/10 p-3 rounded-xl flex justify-between border border-white/10 font-bold uppercase text-xs"><span>{it.name}</span><span className="opacity-60">{it.quantity}un</span></div>
                              ))}
                          </div>
                          <div className="p-3 bg-yellow-400 text-yellow-900 rounded-xl flex items-start gap-2 border border-yellow-300">
                                <Info size={16} className="shrink-0 mt-0.5"/><p className="text-[10px] font-black leading-tight uppercase">A IA pode errar. O farmacêutico validará os nomes finais antes de vender.</p>
                          </div>
                          <Sparkles className="absolute -right-6 -bottom-6 text-white/5 w-32 h-32" />
                      </div>
                  )}

                  <Card className="p-8 rounded-[40px] shadow-sm space-y-8 border-gray-100">
                      <div>
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Truck size={14} className="text-emerald-500"/> Preferência de Atendimento</h5>
                          <div className="flex gap-3">
                              <button onClick={() => setDeliveryType('DELIVERY')} className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-black uppercase text-[10px] ${deliveryType === 'DELIVERY' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-100 text-gray-400'}`}><Truck size={24}/> Domicílio</button>
                              <button onClick={() => setDeliveryType('PICKUP')} className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-black uppercase text-[10px] ${deliveryType === 'PICKUP' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-100 text-gray-400'}`}><Store size={24}/> Na Farmácia</button>
                          </div>
                      </div>

                      <div>
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Store size={14}/> Destinos do Pedido</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                              {pharmacies.filter(p => p.status === 'APPROVED' && p.isAvailable).map(p => (
                                  <div key={p.id} onClick={() => togglePharmacy(p.id)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${selectedPharmacies.includes(p.id) ? 'border-emerald-500 bg-emerald-50' : 'bg-white border-gray-100 opacity-70'}`}>
                                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedPharmacies.includes(p.id) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{p.name.charAt(0)}</div><span className="text-[11px] font-black text-gray-800 truncate">{p.name}</span></div>
                                      {selectedPharmacies.includes(p.id) && <Check size={14} className="text-emerald-600"/>}
                                  </div>
                              ))}
                          </div>
                      </div>

                      <textarea className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-sm h-24" placeholder="Notas adicionais (Ex: Apenas marcas específicas)..." value={userNotes} onChange={e => setUserNotes(e.target.value)} />
                      
                      <Button onClick={handleFinalSend} disabled={isSending} className={`w-full py-6 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all text-white ${method === 'AI' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                          {isSending ? <Loader2 className="animate-spin" /> : "PEDIR ORÇAMENTOS"}
                      </Button>
                  </Card>
              </div>
          </div>
      )}
      <MedicalDisclaimer method={method} />
    </div>
  );
};
