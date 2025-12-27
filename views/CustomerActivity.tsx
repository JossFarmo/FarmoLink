
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, XCircle, FileText, ChevronDown, Clock, Check, RefreshCw, Package, Store, MapPin, Phone, CreditCard, Info, CheckCircle, Mail, ThumbsUp, MessageCircle, Loader2, Bike, X, Calendar, Star, ShoppingBag, Plus, Eye } from 'lucide-react';
import { Order, PrescriptionRequest, PrescriptionQuote, OrderStatus, User, Pharmacy } from '../types';
import { Button, Card, Badge, Toast } from '../components/UI';
import { updateOrderStatus, acceptQuote, createPrescriptionRequest, deletePrescriptionRequest, rejectCustomerQuote, submitReview } from '../services/dataService';
import { playSound } from '../services/soundService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

export const CustomerOrdersView = ({ orders, pharmacies, onRefresh }: { orders: Order[], pharmacies?: Pharmacy[], onRefresh: () => void }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Agrupar pedidos por data para melhor navegação
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    orders.forEach(o => {
        const datePart = o.date.split(',')[0].trim();
        if (!groups[datePart]) groups[datePart] = [];
        groups[datePart].push(o);
    });
    return groups;
  }, [orders]);

  const handleCancelOrder = async (orderId: string) => {
      if(confirm('Tem certeza que deseja cancelar este pedido?')) {
          await updateOrderStatus(orderId, OrderStatus.CANCELLED);
          onRefresh();
      }
  };

  const handleConfirmReceipt = async (orderId: string) => {
     if(confirm('Confirma que recebeu os produtos corretamente?\nIsso finalizará o pedido.')) {
         playSound('success');
         await updateOrderStatus(orderId, OrderStatus.COMPLETED);
         onRefresh();
     }
  }

  const handleSendRating = async () => {
    if (!ratingOrder) return;
    setIsSubmittingRating(true);
    const success = await submitReview(
      ratingOrder.id, 
      ratingOrder.pharmacyId, 
      ratingOrder.customerName, 
      stars, 
      comment
    );
    setIsSubmittingRating(false);
    if (success) {
        playSound('success');
        setRatingOrder(null);
        setStars(5);
        setComment('');
        alert("Obrigado pela sua avaliação! Isso ajuda a melhorar a rede.");
    }
  };

  const getTimelineSteps = (status: OrderStatus, type: 'DELIVERY' | 'PICKUP') => {
      const steps = [
          { status: OrderStatus.PENDING, label: 'Enviado', icon: FileText, active: false, date: '' },
          { status: OrderStatus.PREPARING, label: 'Preparando', icon: Package, active: false, date: '' },
          { status: type === 'DELIVERY' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY_FOR_PICKUP, label: type === 'DELIVERY' ? 'A Caminho' : 'Pronto', icon: type === 'DELIVERY' ? Bike : Store, active: false, date: '' },
          { status: OrderStatus.COMPLETED, label: 'Entregue', icon: CheckCircle, active: false, date: '' }
      ];

      const statusOrder = [OrderStatus.PENDING, OrderStatus.PREPARING, type === 'DELIVERY' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED];
      const currentIdx = statusOrder.indexOf(status);

      return steps.map((s, idx) => ({
          ...s,
          active: idx <= currentIdx,
          current: idx === currentIdx
      }));
  }

  const getFriendlyStatus = (status: OrderStatus) => {
      switch(status) {
        case OrderStatus.PENDING: return { text: "Aguardando Farmácia", color: 'blue' };
        case OrderStatus.PREPARING: return { text: "Sendo Preparado", color: 'yellow' };
        case OrderStatus.OUT_FOR_DELIVERY: return { text: "Saiu para Entrega", color: 'orange' };
        case OrderStatus.READY_FOR_PICKUP: return { text: "Pronto para Retirada", color: 'orange' };
        case OrderStatus.COMPLETED: return { text: "Concluído", color: 'green' };
        case OrderStatus.CANCELLED: return { text: "Cancelado", color: 'red' };
        case OrderStatus.REJECTED: return { text: "Recusado pela Loja", color: 'red' };
        default: return { text: status, color: 'gray' };
      }
  }

  return (
  <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
    <div className="flex justify-between items-center px-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Meus Pedidos</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Histórico de compras e entregas</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all">
             <RefreshCw size={12}/> Sincronizar
        </button>
    </div>
    
    {orders.length === 0 && (
      <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
         <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Package size={40}/></div>
         <h3 className="text-lg font-black text-gray-700 uppercase">Sem pedidos ainda</h3>
         <p className="text-gray-400 text-sm">Suas compras no FarmoLink aparecerão aqui.</p>
      </div>
    )}

    {Object.entries(groupedOrders).map(([date, dayOrders]) => (
        <div key={date} className="space-y-4">
            <div className="flex items-center gap-4 px-4">
                <div className="h-[1px] bg-gray-200 flex-1"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Calendar size={12}/> {date}
                </span>
                <div className="h-[1px] bg-gray-200 flex-1"></div>
            </div>

            {/* Fix: Casting dayOrders to Order[] as TypeScript might infer it as unknown from Object.entries */}
            {(dayOrders as Order[]).map((o: Order) => {
              const timeline = getTimelineSteps(o.status, o.type);
              const friendly = getFriendlyStatus(o.status);
              const pharmacy = pharmacies?.find(p => p.id === o.pharmacyId);
              const isCancelled = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
              const canConfirm = o.status === OrderStatus.OUT_FOR_DELIVERY || o.status === OrderStatus.READY_FOR_PICKUP;
              const isCompleted = o.status === OrderStatus.COMPLETED;

              return (
              <Card key={o.id} className="p-0 overflow-hidden transition-all hover:shadow-xl rounded-[32px] border-gray-100 mb-4">
                 <div className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => { playSound('click'); setExpandedId(expandedId === o.id ? null : o.id); }}>
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isCompleted ? 'bg-emerald-50 text-emerald-600' : (isCancelled ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600')}`}>
                            <ShoppingBag size={28}/>
                        </div>
                        <div>
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                Pedido #{o.id.slice(0,8).toUpperCase()}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge color={friendly.color as any}>{friendly.text.toUpperCase()}</Badge>
                                <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Clock size={10}/> {o.date.split(',')[1]?.trim() || o.date}
                                </span>
                            </div>
                        </div>
                     </div>
                     <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{pharmacy?.name || 'Farmácia'}</p>
                        <p className="font-black text-xl text-emerald-600">Kz {o.total.toLocaleString()}</p>
                     </div>
                   </div>
                 </div>

                 {expandedId === o.id && (
                   <div className="border-t border-gray-100 bg-gray-50/50 p-6 sm:p-8 animate-fade-in">
                      {!isCancelled && (
                          <div className="mb-10 px-4">
                            <div className="relative flex justify-between items-center max-w-2xl mx-auto">
                                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -z-0 -translate-y-1/2"></div>
                                {timeline.map((step, idx) => (
                                    <div key={idx} className="relative z-10 flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                                            step.active 
                                            ? 'bg-emerald-600 border-emerald-100 text-white scale-110 shadow-lg' 
                                            : 'bg-white border-gray-100 text-gray-300'
                                        }`}>
                                            <step.icon size={16} />
                                        </div>
                                        <span className={`text-[9px] font-black mt-3 uppercase tracking-tighter ${step.active ? 'text-emerald-800' : 'text-gray-400'}`}>{step.label}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className={`p-5 rounded-3xl border flex items-start gap-4 shadow-sm bg-white ${isCancelled ? 'border-red-100' : 'border-emerald-100'}`}>
                                <div className={`p-3 rounded-2xl ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {isCancelled ? <XCircle size={24}/> : <CheckCircle size={24}/>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Detalhado</p>
                                    <p className={`font-black text-base ${isCancelled ? 'text-red-700' : 'text-emerald-800'}`}>{friendly.text}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Identificamos o fluxo de {o.type === 'DELIVERY' ? 'Entrega' : 'Retirada'}.</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                {o.status === OrderStatus.PENDING && (
                                    <Button variant="danger" className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-100" onClick={() => handleCancelOrder(o.id)}>Cancelar Pedido</Button>
                                )}
                                {canConfirm && (
                                    <Button onClick={() => handleConfirmReceipt(o.id)} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 flex gap-2 animate-pulse">
                                       <ThumbsUp size={16} /> Confirmar que Recebi
                                    </Button>
                                )}
                                {isCompleted && (
                                    <button 
                                        onClick={() => setRatingOrder(o)} 
                                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                       <Star size={16} className="fill-yellow-900"/> Avaliar Experiência
                                    </button>
                                )}
                            </div>
                          </div>

                          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                             <h5 className="font-black text-gray-800 text-xs uppercase mb-4 flex items-center gap-2 border-b pb-3 tracking-widest">
                                 <Package size={16} className="text-emerald-500"/> Detalhes do Carrinho
                             </h5>
                             <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {o.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-700">{item.quantity}x {item.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{item.category}</p>
                                        </div>
                                        <span className="font-black text-gray-600 text-xs">Kz {(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                 <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Pago</span>
                                 <span className="text-2xl font-black text-emerald-600">Kz {o.total.toLocaleString()}</span>
                             </div>
                          </div>
                      </div>
                   </div>
                 )}
              </Card>
              );
            })}
        </div>
    ))}

    {/* MODAL DE AVALIAÇÃO (RATING) */}
    {ratingOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-950/80 backdrop-blur-md p-4 animate-fade-in">
            <Card className="w-full max-w-md p-10 shadow-2xl animate-scale-in rounded-[40px] border-none text-center">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-left">
                        <h3 className="font-black text-2xl text-gray-800">Sua Opinião</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Ajude a Farmácia {pharmacies?.find(p=>p.id===ratingOrder.pharmacyId)?.name}</p>
                    </div>
                    <button onClick={() => setRatingOrder(null)} className="p-2 bg-gray-50 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"><X size={24}/></button>
                </div>

                <div className="flex justify-center gap-3 mb-10">
                    {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => { setStars(n); playSound('click'); }} className="transition-transform active:scale-90">
                            <Star size={44} className={n <= stars ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-100"} />
                        </button>
                    ))}
                </div>

                <textarea 
                    className="w-full p-6 border-2 border-gray-50 rounded-3xl h-32 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 bg-gray-50 mb-8 transition-all font-medium" 
                    placeholder="O que achou do atendimento e do tempo de entrega? (Opcional)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />

                <Button onClick={handleSendRating} disabled={isSubmittingRating} className="w-full py-5 font-black text-lg bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-900/20">
                    {isSubmittingRating ? <Loader2 className="animate-spin"/> : "Enviar Avaliação"}
                </Button>
                <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">Sua avaliação será pública para outros clientes.</p>
            </Card>
        </div>
    )}
  </div>
  );
};

export const PrescriptionUploadView = ({ pharmacies, user, onNavigate }: { pharmacies: Pharmacy[], user: User, onNavigate: (page: string) => void }) => {
  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedPharmacies, setSelectedPharmacies] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image || selectedPharmacies.length === 0) {
      playSound('error');
      alert("Selecione uma imagem e pelo menos uma farmácia.");
      return;
    }
    
    if (!user.phone || user.phone.length < 9) {
        playSound('error');
        alert("Adicione um número de telefone no perfil para enviar receitas.");
        onNavigate('profile');
        return;
    }

    setIsSending(true);
    const cloudinaryUrl = await uploadImageToCloudinary(image);
    
    if (!cloudinaryUrl) {
        setIsSending(false);
        playSound('error');
        alert("Erro ao processar imagem. Tente novamente ou use uma imagem menor.");
        return;
    }

    const success = await createPrescriptionRequest(user.id, cloudinaryUrl, selectedPharmacies, notes);
    setIsSending(false);
    if (success) {
      playSound('save');
      alert("Receita enviada com sucesso! Aguarde os orçamentos.");
      onNavigate('prescriptions');
    } else {
      playSound('error');
      alert("Erro ao enviar receita ao sistema.");
    }
  };

  const togglePharmacy = (id: string) => {
    setSelectedPharmacies(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-black text-gray-800">Enviar Receita Médica</h1>
        <p className="text-gray-500 mt-2">Nossas farmácias parceiras analisarão sua receita e enviarão orçamentos.</p>
      </div>

      <Card className="p-4 rounded-[40px] shadow-sm border-emerald-50">
         <div className="border-4 border-dashed border-emerald-50 rounded-[32px] p-10 text-center bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {image ? (
              <div className="relative">
                <img src={image} className="max-h-72 mx-auto rounded-3xl shadow-xl" alt="Preview"/>
                <button className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-xl text-red-500 hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); setImage(null); }}><XCircle size={32}/></button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-emerald-600 opacity-60">
                 <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-lg"><Camera size={48} /></div>
                 <span className="font-black text-sm uppercase tracking-widest">Tirar Foto ou Galeria</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
         </div>
      </Card>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mensagem para o Farmacêutico</label>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          className="w-full p-6 bg-white border border-gray-100 rounded-3xl focus:ring-4 focus:ring-emerald-100 outline-none h-32 font-medium text-sm transition-all" 
          placeholder="Ex: Preciso também de álcool gel, se tiverem em stock..." 
        />
      </div>

      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Escolher Farmácias ({selectedPharmacies.length})</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {pharmacies.map(ph => (
            <div key={ph.id} onClick={() => togglePharmacy(ph.id)} className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all group ${selectedPharmacies.includes(ph.id) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-gray-100 hover:border-emerald-200'}`}>
               <span className="font-bold text-sm">{ph.name}</span>
               {selectedPharmacies.includes(ph.id) ? <Check size={18} className="text-white"/> : <Plus size={18} className="text-emerald-200 group-hover:text-emerald-500"/>}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isSending} className="w-full py-5 rounded-3xl font-black text-lg shadow-xl shadow-emerald-100">
        {isSending ? (
            <span className="flex items-center gap-2 uppercase tracking-widest text-sm"><Loader2 className="animate-spin" /> Processando Imagem...</span>
        ) : <span className="uppercase tracking-widest">Solicitar Cotações</span>}
      </Button>
    </div>
  );
};

export const PrescriptionsListView = ({ requests, user, onNavigate }: { requests: PrescriptionRequest[], user: User, onNavigate: (page: string) => void }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingQuoteId, setProcessingQuoteId] = useState<string | null>(null);

  const handleAcceptQuote = async (quote: PrescriptionQuote) => {
    if (processingQuoteId) return;
    if (!user.phone || user.phone.length < 9) {
        playSound('error');
        alert("Atenção: Precisamos do seu número de telemóvel para entrega.\n\nPor favor, atualize seu perfil.");
        onNavigate('profile');
        return;
    }

    if (confirm(`Aceitar orçamento de Kz ${quote.totalPrice.toLocaleString()} da farmácia ${quote.pharmacyName}? Todas as outras ofertas para esta receita serão canceladas.`)) {
       setProcessingQuoteId(quote.id);
       const success = await acceptQuote(quote, user.name, user.address || '', user.phone);
       if (success) {
         playSound('cash');
         alert("Orçamento aceito! Um pedido foi gerado.");
         onNavigate('orders');
       } else {
         playSound('error');
         alert("Erro ao aceitar orçamento.");
       }
       setProcessingQuoteId(null);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
      if(!confirm('Deseja realmente recusar este orçamento?')) return;
      setProcessingQuoteId(quoteId);
      const success = await rejectCustomerQuote(quoteId);
      setProcessingQuoteId(null);
      if(success) {
          playSound('click');
          window.location.reload();
      }
  };

  const handleCancelRequest = async (requestId: string) => {
      if(confirm('Deseja cancelar esta solicitação?')) {
          const success = await deletePrescriptionRequest(requestId);
          if(success) {
              playSound('trash');
              window.location.reload();
          }
      }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800">Arquivo de Receitas</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Histórico de orçamentos e pedidos digitais</p>
        </div>
        <button onClick={() => onNavigate('upload-rx')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"><Plus size={16}/> Nova Receita</button>
      </div>
      
      {requests.length === 0 && (
         <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
           <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4"/>
           <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhuma receita enviada ainda</p>
         </div>
      )}

      <div className="grid gap-4">
        {requests.map(req => (
            <Card key={req.id} className="p-0 overflow-hidden border-gray-100 shadow-sm rounded-[32px] hover:shadow-xl transition-all">
            <div className="p-6 flex flex-col sm:flex-row items-center gap-6 cursor-pointer hover:bg-gray-50/50" onClick={() => { playSound('click'); setExpandedId(expandedId === req.id ? null : req.id); }}>
                <div className="w-24 h-24 bg-gray-50 rounded-3xl overflow-hidden border-2 border-white shadow-inner shrink-0 group relative">
                    <img src={req.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Rx"/>
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="text-white"/></div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
                        <div>
                            <h3 className="font-black text-gray-800 text-lg">Solicitação #{req.id.slice(0,6).toUpperCase()}</h3>
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Enviado em {req.date}</p>
                        </div>
                        <Badge color={req.status === 'COMPLETED' ? 'green' : 'yellow'}>
                            {req.status === 'COMPLETED' ? 'ATENDIDA' : 'EM ANÁLISE'}
                        </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                            <MessageCircle size={14}/> {req.quotes?.length || 0} Orçamentos
                        </div>
                        {expandedId !== req.id && <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1 animate-pulse">Detalhes <ChevronDown size={14}/></span>}
                    </div>
                </div>
            </div>
            
            {expandedId === req.id && (
                <div className="bg-gray-50 border-t border-gray-100 p-6 sm:p-10 space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Cotações Recebidas</h4>
                        {req.status !== 'COMPLETED' && (
                            <button onClick={() => handleCancelRequest(req.id)} className="text-red-500 text-[10px] font-black uppercase hover:underline flex items-center gap-1">
                                <XCircle size={12}/> Anular Pedido
                            </button>
                        )}
                    </div>

                    {(!req.quotes || req.quotes.length === 0) && (
                        <div className="bg-white p-12 rounded-[32px] text-center border-2 border-dashed border-gray-100">
                            <Clock className="mx-auto text-emerald-200 mb-4 animate-pulse" size={40}/>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aguardando Farmácias...</p>
                        </div>
                    )}
                    
                    <div className="grid gap-6">
                        {req.quotes?.map(quote => (
                        <div key={quote.id} className={`bg-white p-6 rounded-[40px] border-4 shadow-xl relative overflow-hidden transition-all ${quote.status === 'ACCEPTED' ? 'border-emerald-500' : 'border-white'} ${quote.status === 'REJECTED' ? 'opacity-40 grayscale' : ''}`}>
                            {quote.status === 'ACCEPTED' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] px-6 py-2 rounded-bl-3xl font-black uppercase tracking-widest">Oferta Vencedora</div>}
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Store size={24}/></div>
                                    <div>
                                        <span className="font-black text-gray-800 text-base">{quote.pharmacyName}</span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Há poucos minutos</p>
                                    </div>
                                </div>
                                {quote.status !== 'REJECTED' && <span className="text-2xl font-black text-emerald-600">Kz {quote.totalPrice.toLocaleString()}</span>}
                            </div>

                            <div className="space-y-3 mb-8 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                                {quote.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm font-bold">
                                    <span className={item.available ? "text-gray-700" : "text-gray-300 line-through"}>{item.quantity}x {item.name}</span>
                                    <span className="text-emerald-600 font-black">{item.available ? `Kz ${item.price.toLocaleString()}` : 'Esgotado'}</span>
                                </div>
                                ))}
                                <div className="flex justify-between text-[10px] text-blue-600 border-t border-gray-200 pt-4 mt-2 font-black uppercase tracking-widest">
                                    <span>Taxa de Serviço</span>
                                    <span>Kz {quote.deliveryFee.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {req.status !== 'COMPLETED' && quote.status !== 'REJECTED' && (
                                <div className="flex gap-4">
                                    <Button 
                                        onClick={() => handleAcceptQuote(quote)} 
                                        className="flex-[4] py-5 rounded-[24px] font-black text-sm tracking-widest shadow-2xl shadow-emerald-200"
                                        disabled={!!processingQuoteId} 
                                    >
                                        {processingQuoteId === quote.id ? <Loader2 className="animate-spin" /> : "ACEITAR ORÇAMENTO"}
                                    </Button>
                                    <button 
                                        onClick={() => handleRejectQuote(quote.id)} 
                                        className="flex-1 py-5 rounded-[24px] bg-red-50 text-red-500 font-black hover:bg-red-500 hover:text-white transition-all border border-red-100 flex items-center justify-center"
                                        disabled={!!processingQuoteId} 
                                    >
                                        <X size={24}/>
                                    </button>
                                </div>
                            )}
                        </div>
                        ))}
                    </div>
                </div>
            )}
            </Card>
        ))}
      </div>
    </div>
  );
};
