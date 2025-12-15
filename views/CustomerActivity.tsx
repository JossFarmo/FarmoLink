
import React, { useState, useRef, useEffect } from 'react';
import { Camera, XCircle, FileText, ChevronDown, Clock, Check, RefreshCw, Package, Store, MapPin, Phone, CreditCard, Info, CheckCircle, Mail, ThumbsUp, MessageCircle, Loader2 } from 'lucide-react';
import { Order, PrescriptionRequest, PrescriptionQuote, OrderStatus, User, Pharmacy } from '../types';
import { Button, Card, Badge } from '../components/UI';
import { updateOrderStatus, acceptQuote, createPrescriptionRequest, deletePrescriptionRequest } from '../services/dataService';
import { playSound } from '../services/soundService';

// --- CUSTOMER ORDERS VIEW (Pedidos em Tempo Real) ---
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

  const getStatusStep = (status: OrderStatus) => {
    switch(status) {
       case OrderStatus.PENDING: return 1;
       case OrderStatus.PREPARING: return 2;
       case OrderStatus.OUT_FOR_DELIVERY: return 3;
       case OrderStatus.READY_FOR_PICKUP: return 3;
       case OrderStatus.COMPLETED: return 4;
       case OrderStatus.CANCELLED: return 0;
       case OrderStatus.REJECTED: return 0;
       default: return 0;
    }
  }

  const getFriendlyStatus = (status: OrderStatus, type: 'DELIVERY' | 'PICKUP') => {
      switch(status) {
        case OrderStatus.PENDING: return { text: "Aguardando", desc: "A farmácia ainda não viu seu pedido", color: 'blue' };
        case OrderStatus.PREPARING: return { text: "Em Preparação", desc: "A farmácia está separando seus itens", color: 'yellow' };
        case OrderStatus.OUT_FOR_DELIVERY: return { text: "Saiu para Entrega", desc: "O motorista está a caminho. Confirme o recebimento abaixo.", color: 'orange' };
        case OrderStatus.READY_FOR_PICKUP: return { text: "Pronto para Retirada", desc: "Dirija-se à farmácia. Confirme o recebimento abaixo.", color: 'orange' };
        case OrderStatus.COMPLETED: return { text: "Concluído", desc: type === 'DELIVERY' ? "Entregue e Confirmado" : "Retirado e Confirmado", color: 'green' };
        case OrderStatus.CANCELLED: return { text: "Cancelado", desc: "Você cancelou este pedido", color: 'red' };
        case OrderStatus.REJECTED: return { text: "Não Aceite", desc: "A farmácia não pôde aceitar (ex: estoque)", color: 'red' };
        default: return { text: status, desc: "", color: 'gray' };
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
      const step = getStatusStep(o.status);
      const friendly = getFriendlyStatus(o.status, o.type);
      const pharmacy = pharmacies?.find(p => p.id === o.pharmacyId);
      const shortDate = o.date.split(',')[0] + ' • ' + (o.date.split(',')[1]?.trim() || '');
      const isCancelled = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
      const canConfirm = o.status === OrderStatus.OUT_FOR_DELIVERY || o.status === OrderStatus.READY_FOR_PICKUP;

      return (
      <Card key={o.id} className="overflow-hidden">
         <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { playSound('click'); setExpandedId(expandedId === o.id ? null : o.id); }}>
           <div className="flex justify-between items-center mb-4">
             <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    Pedido #{o.id.slice(0,8)}
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} /> {shortDate}
                    </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">{pharmacy ? pharmacy.name : 'Farmácia'}</p>
             </div>
             <Badge color={friendly.color as any}>{friendly.text}</Badge>
           </div>
           
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                 <Store className="w-4 h-4" />
                 <span>{o.type === 'PICKUP' ? 'Retirada na Loja' : 'Entrega em Casa'}</span>
              </div>
              <div className="text-right">
                 <p className="font-bold text-lg text-emerald-600">Kz {o.total}</p>
                 <p className="text-xs text-gray-400">{o.items.length} itens</p>
              </div>
           </div>
         </div>

         {expandedId === o.id && (
           <div className="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
              {!isCancelled && (
                  <div className="mb-8 relative mt-2">
                    <div className="h-1 bg-gray-200 w-full absolute top-3 left-0 z-0"></div>
                    <div className="h-1 bg-emerald-500 absolute top-3 left-0 z-0 transition-all duration-500" style={{ width: `${(Math.max(0, step - 1) / 3) * 100}%` }}></div>
                    
                    <div className="flex justify-between relative z-10 text-xs font-bold text-gray-500">
                        <div className="text-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>1</div>
                        Pendente
                        </div>
                        <div className="text-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>2</div>
                        Preparo
                        </div>
                        <div className="text-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>3</div>
                        {o.type === 'PICKUP' ? 'Pronto' : 'Entrega'}
                        </div>
                        <div className="text-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}><Check size={14}/></div>
                        Concluído
                        </div>
                    </div>
                  </div>
              )}

              <div className={`border p-4 rounded-lg mb-6 flex items-start gap-3 justify-between ${isCancelled ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex gap-3">
                    <Info className={`${isCancelled ? 'text-red-600' : 'text-blue-600'} w-5 h-5 shrink-0 mt-0.5`} />
                    <div>
                        <p className={`font-bold ${isCancelled ? 'text-red-800' : 'text-blue-800'}`}>{friendly.text}</p>
                        <p className={`text-sm ${isCancelled ? 'text-red-600' : 'text-blue-600'}`}>{friendly.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">Atualizado às {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (tempo real)</p>
                    </div>
                  </div>
                  
                  {o.status === OrderStatus.PENDING && (
                      <Button variant="danger" className="!py-1 !px-3 !text-xs" onClick={() => handleCancelOrder(o.id)}>Cancelar Pedido</Button>
                  )}
                  
                  {canConfirm && (
                      <Button onClick={() => handleConfirmReceipt(o.id)} className="!py-1 !px-3 !text-sm flex gap-2 animate-pulse">
                         <ThumbsUp size={16} /> Confirmar Recebimento
                      </Button>
                  )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                     <h5 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><MapPin size={16}/> {o.type === 'PICKUP' ? 'Local de Retirada' : 'Endereço de Entrega'}</h5>
                     <p className="text-sm text-gray-600">{o.address || 'N/A'}</p>
                     
                     {/* EXIBIÇÃO DO CONTATO DA FARMÁCIA (Se disponível) */}
                     {pharmacy && (pharmacy.phone || pharmacy.ownerEmail) && (
                         <div className="mt-4 pt-4 border-t border-gray-100">
                             <p className="text-xs text-gray-400 font-bold uppercase mb-2">Fale com a Farmácia</p>
                             <div className="flex gap-2 flex-wrap">
                                {/* Simulamos um número se não tiver, para fins de UI, ou usamos o email */}
                                {pharmacy.phone ? (
                                    <>
                                        <a href={`tel:${pharmacy.phone}`} className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm flex items-center gap-2 hover:bg-green-100"><Phone size={14}/> Ligar</a>
                                        <a href={`https://wa.me/${pharmacy.phone.replace(/\D/g,'')}`} target="_blank" className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm flex items-center gap-2 hover:bg-green-100"><MessageCircle size={14}/> WhatsApp</a>
                                    </>
                                ) : (
                                     <a href={`mailto:${pharmacy.ownerEmail}`} className="px-3 py-1 bg-gray-50 text-gray-700 rounded text-sm flex items-center gap-2 hover:bg-gray-100"><Mail size={14}/> {pharmacy.ownerEmail}</a>
                                )}
                             </div>
                         </div>
                     )}
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                     <h5 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><CreditCard size={16}/> Pagamento</h5>
                     <div className="text-right">
                         <p className="text-xs text-gray-500">Total a Pagar</p>
                         <p className="text-xl font-bold text-emerald-600">Kz {o.total}</p>
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

// ... Prescription views mantidos ...
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
    
    // Check telefone aqui também
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
  const [processingQuoteId, setProcessingQuoteId] = useState<string | null>(null); // NOVO: Estado de processamento individual

  const handleAcceptQuote = async (quote: PrescriptionQuote) => {
    // Evita duplo clique imediato
    if (processingQuoteId) return;

    // Verificação de segurança para garantir que temos o telefone
    if (!user.phone || user.phone.length < 9) {
        playSound('error');
        alert("Atenção: Para aceitar o orçamento, precisamos do seu número de telefone para entrega.\n\nPor favor, atualize seu perfil.");
        onNavigate('profile');
        return;
    }

    if (confirm(`Aceitar orçamento de Kz ${quote.totalPrice} da farmácia ${quote.pharmacyName}?`)) {
       setProcessingQuoteId(quote.id); // Bloqueia UI
       // --- CORREÇÃO ISSUE #2: Passando user.phone ---
       const success = await acceptQuote(quote, user.name, user.address || '', user.phone);
       
       if (success) {
         playSound('cash');
         alert("Orçamento aceito! Um pedido foi gerado.");
         onNavigate('orders');
       } else {
         playSound('error');
         alert("Erro ao aceitar orçamento.");
       }
       setProcessingQuoteId(null); // Libera UI (em caso de erro, pois sucesso navega para outra pagina)
    }
  };

  const handleCancelRequest = async (requestId: string) => {
      if(confirm('Deseja cancelar esta solicitação? Todas os orçamentos recebidos serão perdidos.')) {
          const success = await deletePrescriptionRequest(requestId);
          if(success) {
              playSound('trash');
              window.location.reload(); // Maneira mais simples de atualizar a lista sem prop de refresh
          } else {
              alert("Erro ao cancelar.");
          }
      }
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Minhas Receitas</h1>
      
      {requests.length === 0 && (
         <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
           <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
           <p className="text-gray-500">Você ainda não enviou nenhuma receita.</p>
         </div>
      )}

      {requests.map(req => (
        <Card key={req.id} className="overflow-hidden">
           <div className="p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { playSound('click'); setExpandedId(expandedId === req.id ? null : req.id); }}>
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                 <img src={req.imageUrl} className="w-full h-full object-cover" alt="Rx"/>
              </div>
              <div className="flex-1">
                 <div className="flex justify-between">
                    <h3 className="font-bold text-gray-800">Solicitação de Medicamentos</h3>
                    <Badge color={req.status === 'Concluído' ? 'green' : 'yellow'}>{req.status}</Badge>
                 </div>
                 <p className="text-xs text-gray-500 mt-1">{req.date}</p>
                 <p className="text-sm text-gray-600 mt-2 line-clamp-1">{req.notes || "Sem observações"}</p>
                 <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                    {req.quotes?.length || 0} Orçamentos Recebidos {expandedId !== req.id && <ChevronDown size={14}/>}
                 </div>
              </div>
           </div>
           
           {expandedId === req.id && (
             <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-700 text-sm uppercase">Orçamentos das Farmácias</h4>
                    {req.status !== 'Concluído' && (
                        <button onClick={() => handleCancelRequest(req.id)} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                            <XCircle size={12}/> Cancelar Solicitação
                        </button>
                    )}
                </div>

                {(!req.quotes || req.quotes.length === 0) && <p className="text-sm text-gray-500 italic">Aguardando respostas das farmácias...</p>}
                
                {req.quotes?.map(quote => (
                  <div key={quote.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                     {quote.status === 'ACCEPTED' && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">ACEITO</div>}
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-800">{quote.pharmacyName}</span>
                        <span className="font-bold text-lg text-emerald-600">Kz {quote.totalPrice}</span>
                     </div>
                     <div className="space-y-1 mb-3">
                        {quote.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                             <span className={item.available ? "text-gray-700" : "text-red-400 line-through"}>{item.name} (x{item.quantity})</span>
                             <span className="text-gray-500">{item.available ? `Kz ${item.price}` : 'Indisp.'}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-1 mt-1">
                           <span>Entrega</span>
                           <span>Kz {quote.deliveryFee}</span>
                        </div>
                     </div>
                     {quote.notes && <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded mb-3">{quote.notes}</div>}
                     
                     {req.status !== 'Concluído' && (
                        <Button 
                            onClick={() => handleAcceptQuote(quote)} 
                            className="w-full py-2 text-sm"
                            disabled={!!processingQuoteId} // Desabilita se qualquer um estiver processando
                        >
                            {processingQuoteId === quote.id ? (
                                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16}/> Processando...</span>
                            ) : "Aceitar Oferta"}
                        </Button>
                     )}
                  </div>
                ))}
             </div>
           )}
        </Card>
      ))}
    </div>
  );
};
