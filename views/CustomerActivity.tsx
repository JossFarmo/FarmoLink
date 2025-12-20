
import React, { useState, useRef, useEffect } from 'react';
import { Camera, XCircle, FileText, ChevronDown, Clock, Check, RefreshCw, Package, Store, MapPin, Phone, CreditCard, Info, CheckCircle, Mail, ThumbsUp, MessageCircle, Loader2, Bike, X, Calendar } from 'lucide-react';
import { Order, PrescriptionRequest, PrescriptionQuote, OrderStatus, User, Pharmacy } from '../types';
import { Button, Card, Badge } from '../components/UI';
import { updateOrderStatus, acceptQuote, createPrescriptionRequest, deletePrescriptionRequest, rejectCustomerQuote } from '../services/dataService';
import { playSound } from '../services/soundService';

export const CustomerOrdersView = ({ orders, pharmacies, onRefresh }: { orders: Order[], pharmacies?: Pharmacy[], onRefresh: () => void }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
        onRefresh();
        setCurrentTime(new Date()); 
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

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

  const getTimelineSteps = (status: OrderStatus, type: 'DELIVERY' | 'PICKUP') => {
      const steps = [
          { status: OrderStatus.PENDING, label: 'Enviado', icon: FileText, active: false, date: '' },
          { status: OrderStatus.PREPARING, label: 'Preparando', icon: Package, active: false, date: '' },
          { status: type === 'DELIVERY' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY_FOR_PICKUP, label: type === 'DELIVERY' ? 'Saiu p/ Entrega' : 'Pronto', icon: type === 'DELIVERY' ? Bike : Store, active: false, date: '' },
          { status: OrderStatus.COMPLETED, label: 'Concluído', icon: CheckCircle, active: false, date: '' }
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
        case OrderStatus.PENDING: return { text: "Pendente", color: 'blue' };
        case OrderStatus.PREPARING: return { text: "Em Preparação", color: 'yellow' };
        case OrderStatus.OUT_FOR_DELIVERY: return { text: "Saiu para Entrega", color: 'orange' };
        case OrderStatus.READY_FOR_PICKUP: return { text: "Pronto p/ Retirada", color: 'orange' };
        case OrderStatus.COMPLETED: return { text: "Concluído", color: 'green' };
        case OrderStatus.CANCELLED: return { text: "Cancelado", color: 'red' };
        case OrderStatus.REJECTED: return { text: "Recusado", color: 'red' };
        default: return { text: status, color: 'gray' };
      }
  }

  return (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Meus Pedidos</h1>
        <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw size={12} className="animate-spin" /> Atualizando...
        </div>
    </div>
    
    {orders.length === 0 && (
      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="text-gray-400"/></div>
         <h3 className="text-lg font-bold text-gray-700">Nenhum pedido ainda</h3>
         <p className="text-gray-500">Que tal buscar alguns medicamentos?</p>
      </div>
    )}

    {orders.map((o: Order) => {
      const timeline = getTimelineSteps(o.status, o.type);
      const friendly = getFriendlyStatus(o.status);
      const pharmacy = pharmacies?.find(p => p.id === o.pharmacyId);
      const isCancelled = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
      const canConfirm = o.status === OrderStatus.OUT_FOR_DELIVERY || o.status === OrderStatus.READY_FOR_PICKUP;

      return (
      <Card key={o.id} className="overflow-hidden transition-all hover:shadow-md">
         <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { playSound('click'); setExpandedId(expandedId === o.id ? null : o.id); }}>
           <div className="flex justify-between items-center mb-4">
             <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    Pedido #{o.id.slice(0,8)}
                    <Badge color={friendly.color as any}>{friendly.text}</Badge>
                </h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <Store size={12}/> {pharmacy ? pharmacy.name : 'Farmácia'} • {o.date.split(',')[0]}
                </p>
             </div>
             <div className="text-right">
                <p className="font-bold text-lg text-emerald-600">Kz {o.total}</p>
                <ChevronDown className={`inline transition-transform ${expandedId === o.id ? 'rotate-180' : ''}`} />
             </div>
           </div>
         </div>

         {expandedId === o.id && (
           <div className="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
              {!isCancelled && (
                  <div className="mb-8 px-2">
                    <div className="relative flex justify-between items-center">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-0"></div>
                        {timeline.map((step, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                                    step.active 
                                    ? 'bg-emerald-600 border-emerald-100 text-white' 
                                    : 'bg-white border-gray-200 text-gray-300'
                                }`}>
                                    <step.icon size={16} />
                                </div>
                                <span className={`text-xs font-bold mt-2 ${step.active ? 'text-emerald-800' : 'text-gray-400'}`}>{step.label}</span>
                            </div>
                        ))}
                    </div>
                  </div>
              )}

              <div className={`border p-4 rounded-xl mb-6 flex items-start gap-4 shadow-sm ${isCancelled ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                  <div className={`p-3 rounded-full ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isCancelled ? <XCircle size={24}/> : <Info size={24}/>}
                  </div>
                  <div className="flex-1">
                        <p className={`font-bold text-lg ${isCancelled ? 'text-red-800' : 'text-blue-800'}`}>{friendly.text}</p>
                        <p className="text-xs text-gray-400 mt-1">Última atualização: {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {o.status === OrderStatus.PENDING && (
                        <Button variant="danger" className="text-xs" onClick={() => handleCancelOrder(o.id)}>Cancelar</Button>
                    )}
                    {canConfirm && (
                        <Button onClick={() => handleConfirmReceipt(o.id)} className="text-xs flex gap-2 animate-pulse bg-emerald-600 hover:bg-emerald-700">
                           <ThumbsUp size={14} /> Confirmar Recebimento
                        </Button>
                    )}
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                     <h5 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><MapPin size={16} className="text-emerald-500"/> {o.type === 'PICKUP' ? 'Local de Retirada' : 'Entrega'}</h5>
                     <p className="text-sm text-gray-600 mb-4">{o.address || 'N/A'}</p>
                     {pharmacy && (
                         <div className="bg-gray-50 rounded-lg p-3">
                             <p className="text-xs text-gray-500 font-bold uppercase mb-2">Contatar Farmácia</p>
                             <div className="flex gap-2">
                                {pharmacy.phone ? (
                                    <>
                                        <a href={`tel:${pharmacy.phone}`} className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded text-xs flex items-center justify-center gap-2 hover:bg-gray-100 font-medium"><Phone size={14}/> Ligar</a>
                                        <a href={`https://wa.me/${pharmacy.phone.replace(/\D/g,'')}`} target="_blank" className="flex-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-xs flex items-center justify-center gap-2 hover:bg-green-100 font-medium"><MessageCircle size={14}/> WhatsApp</a>
                                    </>
                                ) : (
                                     <a href={`mailto:${pharmacy.ownerEmail}`} className="w-full py-2 bg-gray-100 text-gray-700 rounded text-xs flex items-center justify-center gap-2 hover:bg-gray-200"><Mail size={14}/> Enviar Email</a>
                                )}
                             </div>
                         </div>
                     )}
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                     <h5 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><Package size={16} className="text-blue-500"/> Itens do Pedido</h5>
                     <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {o.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                                <span className="font-medium text-gray-800">Kz {item.price * item.quantity}</span>
                            </div>
                        ))}
                     </div>
                     <div className="mt-4 pt-2 border-t border-gray-100 flex justify-between items-center">
                         <span className="text-sm font-bold text-gray-500">Total</span>
                         <span className="text-xl font-bold text-emerald-600">Kz {o.total}</span>
                     </div>
                  </div>
              </div>
           </div>
         )}
      </Card>
      );
    })}
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
    const success = await createPrescriptionRequest(user.id, image, selectedPharmacies, notes);
    setIsSending(false);
    if (success) {
      playSound('save');
      alert("Receita enviada com sucesso! Aguarde os orçamentos.");
      onNavigate('prescriptions');
    } else {
      playSound('error');
      alert("Erro ao enviar receita.");
    }
  };

  const togglePharmacy = (id: string) => {
    setSelectedPharmacies(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Enviar Receita Médica</h1>
        <p className="text-gray-500">Tire uma foto da sua receita e receba orçamentos de várias farmácias.</p>
      </div>

      <Card className="p-6">
         <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {image ? (
              <div className="relative">
                <img src={image} className="max-h-64 mx-auto rounded-lg shadow-sm" alt="Preview"/>
                <button className="absolute top-2 right-2 bg-white p-1 rounded-full shadow text-gray-600" onClick={(e) => { e.stopPropagation(); setImage(null); }}><XCircle/></button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                 <Camera size={48} />
                 <span className="font-medium">Toque para adicionar foto</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
         </div>
      </Card>

      <div className="space-y-4">
        <label className="block font-bold text-gray-700">Observações</label>
        <p className="text-sm text-gray-500">Digite abaixo os medicamentos que você precisa, caso a receita não esteja legível.</p>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-32" 
          placeholder="Ex: Paracetamol 500mg, Amoxicilina..." 
        />
      </div>

      <div>
        <label className="block font-bold text-gray-700 mb-2">Selecionar Farmácias ({selectedPharmacies.length})</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
          {pharmacies.map(ph => (
            <div key={ph.id} onClick={() => togglePharmacy(ph.id)} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${selectedPharmacies.includes(ph.id) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
               <span className="font-medium text-sm">{ph.name}</span>
               {selectedPharmacies.includes(ph.id) && <CheckCircle size={16} className="text-emerald-600"/>}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isSending} className="w-full py-4 text-lg shadow-lg">
        {isSending ? (
            <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Enviando...</span>
        ) : "Solicitar Orçamentos"}
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
        alert("Atenção: Para aceitar o orçamento, precisamos do seu número de telefone para entrega.\n\nPor favor, atualize seu perfil.");
        onNavigate('profile');
        return;
    }

    if (confirm(`Aceitar orçamento de Kz ${quote.totalPrice} da farmácia ${quote.pharmacyName}?`)) {
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
      } else {
          alert("Erro ao processar recusa.");
      }
  };

  const handleCancelRequest = async (requestId: string) => {
      if(confirm('Deseja cancelar esta solicitação? Todas os orçamentos recebidos serão perdidos.')) {
          const success = await deletePrescriptionRequest(requestId);
          if(success) {
              playSound('trash');
              window.location.reload();
          } else {
              alert("Erro ao cancelar.");
          }
      }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-800">Minhas Receitas</h1>
        <Badge color="blue" className="px-4 py-1">Histórico Digital</Badge>
      </div>
      
      {requests.length === 0 && (
         <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
           <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
           <p className="text-gray-500">Você ainda não enviou nenhuma receita.</p>
         </div>
      )}

      {requests.map(req => (
        <Card key={req.id} className="overflow-hidden border-gray-100 shadow-md">
           <div className="p-5 flex items-start gap-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { playSound('click'); setExpandedId(expandedId === req.id ? null : req.id); }}>
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                 <img src={req.imageUrl} className="w-full h-full object-cover" alt="Rx"/>
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-black text-gray-800 text-lg">Solicitação #{req.id.slice(0,6)}</h3>
                        <p className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1 mt-0.5">
                            <Calendar size={12}/> Enviado em {req.date}
                        </p>
                    </div>
                    <Badge color={req.status === 'COMPLETED' ? 'green' : 'yellow'}>
                        {req.status === 'COMPLETED' ? 'FINALIZADO' : 'EM ABERTO'}
                    </Badge>
                 </div>
                 <p className="text-sm text-gray-500 mt-3 line-clamp-1 italic">"{req.notes || "Sem observações adicionais"}"</p>
                 <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        <MessageCircle size={14}/> {req.quotes?.length || 0} Orçamentos
                    </div>
                    {expandedId !== req.id && <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1 animate-pulse">Clique para detalhes <ChevronDown size={14}/></span>}
                 </div>
              </div>
           </div>
           
           {expandedId === req.id && (
             <div className="bg-gray-50 border-t border-gray-100 p-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-gray-700 text-xs uppercase tracking-widest">Respostas das Farmácias</h4>
                    {req.status !== 'COMPLETED' && (
                        <button onClick={() => handleCancelRequest(req.id)} className="text-red-500 text-[10px] font-black uppercase hover:underline flex items-center gap-1">
                            <XCircle size={12}/> Cancelar Solicitação
                        </button>
                    )}
                </div>

                {(!req.quotes || req.quotes.length === 0) && (
                    <div className="bg-white p-10 rounded-3xl text-center border-2 border-dashed border-gray-200">
                        <Clock className="mx-auto text-gray-300 mb-2 animate-spin-slow" size={32}/>
                        <p className="text-sm text-gray-400 font-bold">Aguardando cotações das farmácias parceiras...</p>
                    </div>
                )}
                
                <div className="grid gap-4">
                    {req.quotes?.map(quote => (
                    <div key={quote.id} className={`bg-white p-5 rounded-[32px] border-2 shadow-sm relative overflow-hidden transition-all ${quote.status === 'ACCEPTED' ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-gray-100'} ${quote.status === 'REJECTED' ? 'opacity-60 grayscale' : ''}`}>
                        {quote.status === 'ACCEPTED' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] px-4 py-1.5 rounded-bl-2xl font-black uppercase">VENCEDORA</div>}
                        {quote.status === 'REJECTED' && <div className="absolute top-0 right-0 bg-gray-400 text-white text-[9px] px-4 py-1.5 rounded-bl-2xl font-black uppercase">FECHADA</div>}
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Store className="text-blue-500" size={16}/>
                                    <span className="font-black text-gray-800">{quote.pharmacyName}</span>
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <Clock size={10}/> Respondido em {new Date(quote.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                            {quote.status !== 'REJECTED' && <span className="text-xl font-black text-emerald-600">Kz {quote.totalPrice.toLocaleString()}</span>}
                        </div>

                        {quote.status === 'REJECTED' ? (
                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <p className="text-[10px] text-gray-500 font-bold italic">
                                    {quote.rejectionReason || "Este orçamento não está mais disponível."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 mb-4 bg-gray-50/50 p-4 rounded-2xl">
                                {quote.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className={item.available ? "text-gray-700 font-medium" : "text-red-400 line-through"}>{item.quantity}x {item.name}</span>
                                    <span className="text-gray-500 font-mono font-bold">{item.available ? `Kz ${item.price.toLocaleString()}` : 'Indisponível'}</span>
                                </div>
                                ))}
                                <div className="flex justify-between text-[10px] text-blue-600 border-t border-gray-100 pt-2 mt-2 font-black uppercase tracking-tighter">
                                    <span>Taxa de Entrega</span>
                                    <span>Kz {quote.deliveryFee.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        
                        {quote.notes && quote.status !== 'REJECTED' && (
                            <div className="mb-4 flex items-start gap-2 bg-yellow-50 p-3 rounded-2xl border border-yellow-100">
                                <Info size={14} className="text-yellow-600 shrink-0 mt-0.5"/>
                                <p className="text-[10px] text-yellow-800 font-medium leading-relaxed">{quote.notes}</p>
                            </div>
                        )}
                        
                        {req.status !== 'COMPLETED' && quote.status !== 'REJECTED' && (
                            <div className="flex gap-3">
                                <Button 
                                    onClick={() => handleAcceptQuote(quote)} 
                                    className="flex-[3] py-4 text-xs font-black shadow-lg shadow-emerald-100"
                                    disabled={!!processingQuoteId} 
                                >
                                    {processingQuoteId === quote.id ? <Loader2 className="animate-spin" size={16}/> : "ACEITAR ESTA OFERTA"}
                                </Button>
                                <Button 
                                    onClick={() => handleRejectQuote(quote.id)} 
                                    variant="danger"
                                    className="flex-1 py-4 text-xs font-black bg-red-50 !text-red-500 border-2 border-red-100 hover:!bg-red-500 hover:!text-white transition-all"
                                    disabled={!!processingQuoteId} 
                                    title="Negar"
                                >
                                    <X size={18}/>
                                </Button>
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
  );
};
