
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { DashboardStats, Order, PrescriptionRequest, QuotedItem, Product, User, PharmacyInput, OrderStatus } from '../types';
import { Package, DollarSign, Clock, Check, Eye, X, Plus, Trash2, Search, Store, Lock, PlayCircle, Truck, MapPin, XCircle, RefreshCw, Edit2, Phone, MessageCircle, UploadCloud, FileText, ArrowRight, AlertTriangle, Save, Unplug, Settings, HelpCircle, Power } from 'lucide-react';
import { sendPrescriptionQuote, rejectPrescription, updatePharmacyDetails, fetchPharmacyById, updateOrderStatus, updateUserPassword, togglePharmacyAvailability } from '../services/dataService';
import { PharmacyProductsView } from './PharmacyProductsView';
import { playSound } from '../services/soundService';

// --- CONFIGURAÇÃO INICIAL DA FARMÁCIA (STEP 2 do Self-Registration) ---
export const PharmacySetupView = ({ user, onComplete }: { user: User, onComplete: () => void }) => {
    // Reutilizando a view de Settings para o setup inicial, mas simplificada
    return <PharmacySettingsView user={user} onComplete={onComplete} isInitialSetup={true} />;
}

// --- VIEW DE CONFIGURAÇÕES (Perfil + Senha) ---
export const PharmacySettingsView = ({ user, onComplete, isInitialSetup = false }: { user: User, onComplete?: () => void, isInitialSetup?: boolean }) => {
    const [formData, setFormData] = useState<PharmacyInput>({
        name: '', nif: '', address: '', deliveryFee: 1000, minTime: '30-45 min', rating: 5.0, phone: user.phone || ''
    });
    const [loading, setLoading] = useState(false);
    
    // Senha
    const [passwordData, setPasswordData] = useState({ newPass: '', confirmPass: '' });
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        if (user.pharmacyId) {
            fetchPharmacyById(user.pharmacyId).then(p => {
                if(p) setFormData(prev => ({...prev, name: p.name, phone: p.phone || user.phone || '', nif: p.nif || '', address: p.address, deliveryFee: p.deliveryFee, minTime: p.minTime}));
            })
        }
    }, [user.pharmacyId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.pharmacyId) return;

        setLoading(true);
        const success = await updatePharmacyDetails(user.pharmacyId, formData);
        setLoading(false);
        if (success) {
            playSound('save');
            alert("Dados salvos com sucesso!");
            if(onComplete) onComplete();
        } else {
            playSound('error');
            alert("Erro ao salvar detalhes.");
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPass.length < 6) { playSound('error'); alert("Senha muito curta."); return; }
        if (passwordData.newPass !== passwordData.confirmPass) { playSound('error'); alert("Senhas não conferem."); return; }

        setPassLoading(true);
        const result = await updateUserPassword(passwordData.newPass);
        setPassLoading(false);

        if (result.success) {
            playSound('success');
            alert("Senha de acesso alterada com sucesso!");
            setPasswordData({ newPass: '', confirmPass: '' });
        } else {
            playSound('error');
            alert("Erro: " + result.error);
        }
    }

    return (
        <div className="max-w-2xl mx-auto mt-6 animate-fade-in space-y-6 pb-10">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Settings className="text-emerald-600"/> {isInitialSetup ? 'Configuração Inicial' : 'Configurações da Farmácia'}
            </h1>
            
            <Card className="p-6 border-t-4 border-emerald-600">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">Dados da Empresa</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Comercial</label>
                        <input required className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone Público</label>
                        <input required type="tel" className="w-full p-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">NIF</label>
                        <input required className="w-full p-2 border rounded-lg" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Endereço</label>
                        <input required className="w-full p-2 border rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Taxa Entrega (Kz)</label>
                            <input type="number" required className="w-full p-2 border rounded-lg" value={formData.deliveryFee} onChange={e => setFormData({...formData, deliveryFee: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tempo Médio</label>
                            <input required className="w-full p-2 border rounded-lg" value={formData.minTime} onChange={e => setFormData({...formData, minTime: e.target.value})} />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full mt-4">
                        {loading ? 'Salvando...' : 'Salvar Dados da Farmácia'}
                    </Button>
                </form>
            </Card>

            {!isInitialSetup && (
                <Card className="p-6 border-l-4 border-l-blue-500">
                    <h3 className="font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2"><Lock size={18}/> Segurança & Acesso</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                            <input type="password" className="w-full p-2 border rounded-lg" value={passwordData.newPass} onChange={e => setPasswordData({...passwordData, newPass: e.target.value})} placeholder="Mínimo 6 caracteres"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                            <input type="password" className="w-full p-2 border rounded-lg" value={passwordData.confirmPass} onChange={e => setPasswordData({...passwordData, confirmPass: e.target.value})} placeholder="Repita a nova senha"/>
                        </div>
                        <Button onClick={handleChangePassword} disabled={passLoading} className="w-full !bg-blue-600 hover:!bg-blue-700">
                            {passLoading ? 'Alterando...' : 'Atualizar Senha de Login'}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    )
}

// --- TELA DE ESPERA DE APROVAÇÃO ---
export const PharmacyPendingView = ({ onCheckAgain }: { onCheckAgain?: () => void }) => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 animate-fade-in">
            <div className="text-center max-w-md">
                <div className="bg-yellow-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-600 animate-pulse">
                    <Lock size={40} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Candidatura em Análise</h1>
                <p className="text-gray-600 mb-6">
                    Recebemos seu pedido de cadastro. Nossa equipe administrativa está validando suas informações.
                    <br/><br/>
                    Assim que aprovado, você poderá preencher os dados da farmácia e cadastrar seus produtos.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 border border-gray-200">
                    <p>Status: <strong>Pendente de Aprovação (Admin)</strong></p>
                    <button onClick={() => { playSound('click'); if(onCheckAgain) onCheckAgain(); else window.location.reload(); }} className="text-emerald-600 underline mt-2">Verificar Novamente</button>
                </div>
            </div>
        </div>
    );
};

// --- VIEWS EXISTENTES ---

export const PharmacyDashboard = ({ stats, pharmacyId, isAvailable, onRefresh, onNavigate }: { stats: DashboardStats, pharmacyId: string, isAvailable: boolean, onRefresh: () => void, onNavigate: (page: string) => void }) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
      setToggling(true);
      const newState = !isAvailable;
      const success = await togglePharmacyAvailability(pharmacyId, newState);
      setToggling(false);
      
      if(success) {
          playSound('success');
          onRefresh();
      } else {
          playSound('error');
          alert("Erro ao alterar status.");
      }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel da Farmácia</h1>
            <p className="text-gray-500 text-sm">Visão geral do seu negócio hoje</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <span className={`text-sm font-bold ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                  {isAvailable ? 'LOJA ABERTA (ONLINE)' : 'LOJA FECHADA (OFFLINE)'}
              </span>
              <button 
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isAvailable ? 'bg-emerald-600' : 'bg-gray-200'}`}
              >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
          </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-emerald-50 text-center py-6 border border-emerald-100">
           <h3 className="text-3xl font-bold text-emerald-700">{stats.pendingOrders}</h3>
           <p className="text-emerald-900 font-medium text-sm">Pedidos Pendentes</p>
        </Card>
        <Card className="bg-blue-50 text-center py-6 border border-blue-100">
           <h3 className="text-3xl font-bold text-blue-700">{stats.totalOrders}</h3>
           <p className="text-blue-900 font-medium text-sm">Concluídos Hoje</p>
        </Card>
        <Card className="bg-purple-50 text-center py-6 border border-purple-100">
           <h3 className="text-2xl font-bold text-purple-700">Kz {stats.revenue.toLocaleString()}</h3>
           <p className="text-purple-900 font-medium text-sm">Faturamento</p>
        </Card>
        <Card className="bg-orange-50 text-center py-6 border border-orange-100">
           <h3 className="text-3xl font-bold text-orange-700">{stats.productsCount}</h3>
           <p className="text-orange-900 font-medium text-sm">Produtos Ativos</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
          <Card title="Ações Rápidas">
              <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => window.location.hash = '#products'}>
                      <Package size={24}/> Gerir Estoque
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => window.location.hash = '#requests'}>
                      <FileText size={24}/> Ver Receitas
                  </Button>
              </div>
          </Card>
          
          {/* CARD DE SUPORTE CORRIGIDO MANTIDO */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg mb-2 text-white">Suporte Técnico</h3>
                <p className="text-gray-300 text-sm mb-4">Problemas com pedidos ou pagamentos? Nossa equipe está pronta para ajudar.</p>
              </div>
              <Button 
                onClick={() => onNavigate('support')} 
                className="w-full bg-white text-gray-900 hover:bg-gray-100 border-none font-bold shadow-none"
              >
                Falar com Suporte
              </Button>
          </Card>
      </div>
    </div>
  );
};

// AQUI ERA A PharmacyProductsView, AGORA IMPORTADA EXTERNAMENTE
export { PharmacyProductsView };

// --- FLUXO DE ORÇAMENTO (MARIA) ---
const QuoteForm = ({ request, pharmacyId, products, onCancel, onSuccess }: { request: PrescriptionRequest, pharmacyId: string, products: Product[], onCancel: () => void, onSuccess: () => void }) => {
  const [items, setItems] = useState<QuotedItem[]>([{ name: '', quantity: 1, price: 0, available: true }]);
  const [deliveryFee, setDeliveryFee] = useState(1000);
  const [notes, setNotes] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para controlar o dropdown de sugestão em cada linha
  const [openSuggestions, setOpenSuggestions] = useState<number | null>(null);
  const [suggestionList, setSuggestionList] = useState<Product[]>([]);

  // Buscar taxa de entrega configurada da farmácia ao montar
  useEffect(() => {
      const loadSettings = async () => {
          const pharm = await fetchPharmacyById(pharmacyId);
          if (pharm) {
              setDeliveryFee(pharm.deliveryFee || 1000);
          }
      };
      loadSettings();
  }, [pharmacyId]);

  const addItem = () => setItems([...items, { name: '', quantity: 1, price: 0, available: true }]);
  
  const updateItem = (index: number, field: keyof QuotedItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSearchProduct = (index: number, term: string) => {
      updateItem(index, 'name', term);
      if (term.length > 0) {
          const filtered = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
          setSuggestionList(filtered);
          setOpenSuggestions(index);
      } else {
          setOpenSuggestions(null);
      }
  }

  const selectProduct = (index: number, product: Product) => {
      const newItems = [...items];
      newItems[index] = {
          name: product.name,
          quantity: newItems[index].quantity || 1,
          price: product.price,
          available: true
      };
      setItems(newItems);
      setOpenSuggestions(null);
  }

  const removeItem = (index: number) => {
      playSound('trash');
      setItems(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((acc, i) => i.available ? acc + (Number(i.price) * Number(i.quantity)) : acc, 0) + deliveryFee;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let success = false;
    if (rejectMode) {
      success = await rejectPrescription(request.id, pharmacyId, "Minha Farmácia", notes);
      if(success) playSound('trash');
    } else {
      success = await sendPrescriptionQuote(request.id, pharmacyId, "Minha Farmácia", items, deliveryFee, notes);
      if(success) playSound('save');
    }
    
    setIsSubmitting(false);
    if(success) {
        onSuccess();
    } else {
        playSound('error');
        alert("Erro ao enviar orçamento. Tente novamente.");
    }
  };

  if (rejectMode) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-red-200 mt-4">
        <h4 className="font-bold text-red-600 mb-2">Rejeitar Receita</h4>
        <textarea className="w-full p-2 border rounded mb-2" placeholder="Motivo (ex: Receita ilegível, sem estoque...)" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Confirmar Rejeição'}</Button>
          <Button variant="secondary" onClick={() => setRejectMode(false)}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 mt-4 pt-4 animate-fade-in relative">
      <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-800">Criar Orçamento</h4>
      </div>
      
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-center relative">
           <div className="flex-1 relative">
                <input 
                    type="text" 
                    placeholder="Buscar produto no estoque..." 
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={item.name} 
                    onChange={e => handleSearchProduct(idx, e.target.value)} 
                    onFocus={() => handleSearchProduct(idx, item.name)}
                    onBlur={() => setTimeout(() => setOpenSuggestions(null), 200)}
                />
                {openSuggestions === idx && suggestionList.length > 0 && (
                    <div className="absolute z-50 top-full left-0 w-full bg-white shadow-lg border border-gray-200 rounded-b-lg max-h-40 overflow-y-auto">
                        {suggestionList.map(p => (
                            <div 
                                key={p.id} 
                                className="p-2 hover:bg-emerald-50 cursor-pointer text-sm flex justify-between"
                                onMouseDown={() => selectProduct(idx, p)}
                            >
                                <span>{p.name}</span>
                                <span className="font-bold text-emerald-600">Kz {p.price}</span>
                            </div>
                        ))}
                    </div>
                )}
           </div>
           
           <input type="number" placeholder="Qtd" className="w-16 p-2 border rounded text-sm text-center" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
           <input type="number" placeholder="Preço" className="w-24 p-2 border rounded text-sm text-right" value={item.price} onChange={e => updateItem(idx, 'price', Number(e.target.value))} />
           
           <button onClick={() => updateItem(idx, 'available', !item.available)} className={`px-2 py-1 rounded text-xs font-bold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {item.available ? 'Disp.' : 'Falta'}
           </button>
           <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
        </div>
      ))}
      
      <Button variant="secondary" onClick={addItem} className="w-full py-1 text-sm mb-4 border-dashed border-2 border-emerald-200">+ Adicionar Item Manualmente</Button>

      <div className="flex justify-between items-center bg-gray-50 p-3 rounded mb-4">
         <span className="text-sm font-medium">Taxa de Entrega:</span>
         <input type="number" className="w-24 p-1 border rounded text-right" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} />
      </div>

      <div className="flex justify-between items-center mb-4 font-bold text-lg">
        <span>Total Orçamento:</span>
        <span className="text-emerald-600">Kz {total}</span>
      </div>

      <textarea className="w-full p-2 border rounded mb-4 text-sm" placeholder="Observações para o cliente..." value={notes} onChange={e => setNotes(e.target.value)} />

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar Orçamento'}</Button>
        <Button variant="danger" onClick={() => setRejectMode(true)} disabled={isSubmitting}>Rejeitar</Button>
      </div>
    </div>
  );
};

export const PharmacyRequestsView = ({ requests, pharmacyId, products, onRefresh }: { requests: PrescriptionRequest[], pharmacyId: string, products: Product[], onRefresh?: () => void }) => {
   const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
   const [respondedIds, setRespondedIds] = useState<string[]>([]);

   // Filtra as requisições que ainda não foram respondidas (nem no backend, nem na sessão local atual)
   const pendingRequests = requests.filter(r => 
        !respondedIds.includes(r.id) && 
        !r.quotes?.some(q => q.pharmacyId === pharmacyId)
   );

   const handleSuccess = (reqId: string) => {
       setActiveQuoteId(null);
       // Atualiza lista localmente para resposta instantânea
       setRespondedIds(prev => [...prev, reqId]); 
   }

   return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <h1 className="text-2xl font-bold text-gray-800">Solicitações de Receita ({pendingRequests.length})</h1>
       </div>
       {pendingRequests.length === 0 && <p className="text-gray-500">Nenhuma solicitação pendente.</p>}
       <div className="grid gap-6">
          {pendingRequests.map(req => (
            <Card key={req.id} className="border-l-4 border-l-yellow-400">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                  <img src={req.imageUrl} alt="Rx" className="w-full h-auto rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-105 cursor-zoom-in" onClick={() => window.open(req.imageUrl, '_blank')} />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-gray-800">Receita de Cliente</h3><span className="text-sm text-gray-500">{req.date}</span></div>
                   <div className="bg-yellow-50 text-yellow-800 p-3 rounded mb-4 text-sm"><strong>Nota:</strong> {req.notes || "Sem observações."}</div>
                   {activeQuoteId === req.id ? (
                     <QuoteForm request={req} pharmacyId={pharmacyId} products={products} onCancel={() => setActiveQuoteId(null)} onSuccess={() => handleSuccess(req.id)} />
                   ) : (
                     <Button onClick={() => setActiveQuoteId(req.id)} className="w-full md:w-auto">Responder Solicitação</Button>
                   )}
                </div>
              </div>
            </Card>
          ))}
       </div>
    </div>
   );
};

export const PharmacyOrdersView = ({ orders, onUpdate }: { orders: Order[], onUpdate: () => void }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
        onUpdate();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getNextStatus = (current: OrderStatus, type: 'DELIVERY' | 'PICKUP') => {
      if (current === OrderStatus.PENDING) return OrderStatus.PREPARING;
      if (current === OrderStatus.PREPARING) return type === 'PICKUP' ? OrderStatus.READY_FOR_PICKUP : OrderStatus.OUT_FOR_DELIVERY;
      if (current === OrderStatus.OUT_FOR_DELIVERY || current === OrderStatus.READY_FOR_PICKUP) return OrderStatus.COMPLETED;
      return null;
  };

  const getActionLabel = (next: OrderStatus | null) => {
      if (!next) return 'Concluído';
      if (next === OrderStatus.PREPARING) return 'Aceitar e Preparar';
      if (next === OrderStatus.OUT_FOR_DELIVERY) return 'Enviar p/ Entrega';
      if (next === OrderStatus.READY_FOR_PICKUP) return 'Pronto p/ Retirada';
      if (next === OrderStatus.COMPLETED) return 'Concluir Venda'; 
      return 'Atualizar';
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
      setUpdatingId(orderId);
      playSound('click');
      const success = await updateOrderStatus(orderId, status);
      if (success) {
          if (status === OrderStatus.COMPLETED) playSound('cash'); else playSound('success');
          onUpdate(); 
      } else {
          playSound('error');
          alert("Erro ao atualizar status. Tente novamente.");
      }
      setUpdatingId(null);
  };

  const handleCancel = async (orderId: string) => {
      if (confirm('Deseja realmente cancelar este pedido (rejeitar)?\nO cliente será notificado.')) {
        await handleStatusUpdate(orderId, OrderStatus.REJECTED);
        playSound('trash');
      }
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Gerenciar Pedidos</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw size={12} className="animate-spin" /> Atualizando...
            </div>
       </div>
       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <table className="w-full text-left">
           <thead className="bg-gray-50 border-b border-gray-200">
             <tr><th className="p-4 text-gray-600">ID</th><th className="p-4 text-gray-600">Cliente</th><th className="p-4 text-gray-600">Total</th><th className="p-4 text-gray-600">Status</th><th className="p-4 text-gray-600">Ação</th></tr>
           </thead>
           <tbody>
             {orders.map(order => {
               const nextStatus = getNextStatus(order.status, order.type);
               const isCompleted = order.status === OrderStatus.COMPLETED;
               const isCancelled = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED;

               return (
               <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                 <td className="p-4 font-medium text-gray-800">
                     {order.id.slice(0,8)}
                     <div className="text-xs text-gray-400 font-normal">{order.type === 'PICKUP' ? 'Retirada' : 'Entrega'}</div>
                 </td>
                 <td className="p-4 text-gray-700">
                     {order.customerName}
                     {order.address && <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> {order.address.substring(0,20)}...</div>}
                     {order.customerPhone && (
                         <div className="flex gap-2 mt-1">
                             <a href={`tel:${order.customerPhone}`} className="p-1 bg-green-50 text-green-700 rounded text-xs flex items-center gap-1 hover:bg-green-100"><Phone size={10}/> Ligar</a>
                             <a href={`https://wa.me/${order.customerPhone.replace(/\D/g,'')}`} target="_blank" className="p-1 bg-green-50 text-green-700 rounded text-xs flex items-center gap-1 hover:bg-green-100"><MessageCircle size={10}/> WhatsApp</a>
                         </div>
                     )}
                 </td>
                 <td className="p-4 text-gray-700">Kz {order.total}</td>
                 <td className="p-4">
                     <Badge color={isCompleted ? 'green' : (isCancelled ? 'red' : 'blue')}>{order.status}</Badge>
                 </td>
                 <td className="p-4">
                     {!isCompleted && !isCancelled && (
                         <div className="flex items-center gap-2">
                            {nextStatus && (
                                <Button 
                                    onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                    disabled={updatingId === order.id}
                                    variant={nextStatus === OrderStatus.PREPARING ? 'primary' : 'secondary'}
                                    className="!py-1 !px-3 text-xs flex gap-1 items-center"
                                >
                                    {updatingId === order.id ? '...' : getActionLabel(nextStatus)}
                                    {nextStatus === OrderStatus.OUT_FOR_DELIVERY && <Truck size={12}/>}
                                    {nextStatus === OrderStatus.PREPARING && <PlayCircle size={12}/>}
                                    {nextStatus === OrderStatus.COMPLETED && <Check size={12}/>}
                                </Button>
                            )}
                            {(order.status === OrderStatus.PENDING || order.status === OrderStatus.PREPARING) && (
                                <Button onClick={() => handleCancel(order.id)} disabled={updatingId === order.id} variant="danger" className="!py-1 !px-2 !text-xs" title="Cancelar/Rejeitar">
                                    <XCircle size={14} />
                                </Button>
                            )}
                         </div>
                     )}
                     {isCompleted && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12}/> Finalizado</span>}
                     {isCancelled && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><XCircle size={12}/> Cancelado</span>}
                 </td>
               </tr>
               )
             })}
           </tbody>
         </table>
       </div>
    </div>
  );
};
