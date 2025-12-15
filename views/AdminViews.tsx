
import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { Pharmacy, PharmacyInput, User, Order, Product, UserRole } from '../types';
import { getAdminStats, fetchAllUsers, fetchOrders, approvePharmacy, denyPharmacy, fetchPharmacies, fetchProducts, fetchPharmacyById, adminUpdateUser, generateFullSystemBackup, restoreFullSystemBackup, deletePharmacy } from '../services/dataService';
import { RestoreOptions } from '../services/backupService';
import { Activity, Users, Store, TrendingUp, MapPin, CheckCircle, Search, User as UserIcon, Mail, Phone, Lock, Eye, ShoppingBag, AlertCircle, Key, XCircle, Database, ArrowLeft, Package, DollarSign, X, ShieldCheck, Download, UploadCloud, Loader2, Trash2, List, FileText } from 'lucide-react';
import { AdminCatalogView } from './AdminCatalogView';
import { playSound } from '../services/soundService';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, pharmacies: 0, ordersToday: 0, totalRevenue: 0 });
  const [view, setView] = useState<'overview' | 'pharmacies' | 'users' | 'catalog' | 'backup'>('overview'); 
  const [usersList, setUsersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  // Carrega dados iniciais
  useEffect(() => { 
      reloadAll();
  }, []);

  const reloadAll = () => {
      getAdminStats().then(setStats);
      fetchAllUsers().then(setUsersList);
      fetchOrders().then(setOrdersList);
  }

  const Overview = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="flex items-center gap-4 p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setView('users')}>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6"/></div>
           <div><div className="text-gray-500 text-sm">Usuários</div><div className="text-2xl font-bold">{stats.users}</div></div>
         </Card>
         <Card className="flex items-center gap-4 p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setView('pharmacies')}>
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Store className="w-6 h-6"/></div>
           <div><div className="text-gray-500 text-sm">Farmácias</div><div className="text-2xl font-bold">{stats.pharmacies}</div></div>
         </Card>
         <Card className="flex items-center gap-4 p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setView('catalog')}>
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Database className="w-6 h-6"/></div>
           <div><div className="text-gray-500 text-sm">Catálogo Global</div><div className="text-xs font-medium text-indigo-600">Gerenciar Master Data</div></div>
         </Card>
         <Card className="flex items-center gap-4 p-6">
           <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp className="w-6 h-6"/></div>
           <div><div className="text-gray-500 text-sm">Faturamento</div><div className="text-2xl font-bold">Kz {stats.totalRevenue.toLocaleString()}</div></div>
         </Card>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
          <Card title="Últimos Usuários">
             <div className="space-y-4">
                {usersList.length === 0 ? <p className="text-gray-400 text-sm">Nenhum usuário cadastrado.</p> : usersList.slice(0,5).map(u => (
                    <div key={u.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-full"><UserIcon size={16} className="text-gray-500"/></div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                        </div>
                        <Badge color={u.role === 'PHARMACY' ? 'blue' : 'gray'}>{u.role}</Badge>
                    </div>
                ))}
             </div>
          </Card>
          <Card title="Últimos Pedidos">
             <div className="space-y-4">
                {ordersList.length === 0 ? <p className="text-gray-400 text-sm">Nenhum pedido realizado.</p> : ordersList.slice(0,5).map(o => (
                    <div key={o.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                         <div>
                             <p className="font-bold text-sm text-gray-800">#{o.id.slice(0,6)} - {o.customerName}</p>
                             <p className="text-xs text-gray-500">{o.date}</p>
                         </div>
                         <div className="text-right">
                             <p className="font-bold text-sm text-emerald-600">Kz {o.total}</p>
                             <Badge color="green">{o.status}</Badge>
                         </div>
                    </div>
                ))}
             </div>
          </Card>
       </div>
    </div>
  );

  // --- MODAL DE EDIÇÃO DE USUÁRIO ---
  const EditUserModal = ({ user, onClose, onSave }: { user: User, onClose: () => void, onSave: () => void }) => {
      const [formData, setFormData] = useState({ name: user.name, phone: user.phone || '', role: user.role });
      const [loading, setLoading] = useState(false);

      const handleSave = async () => {
          setLoading(true);
          const success = await adminUpdateUser(user.id, formData);
          setLoading(false);
          if (success.success) {
              alert("Usuário atualizado com sucesso.");
              onSave();
              onClose();
          } else {
              alert("Erro ao atualizar: " + success.error);
          }
      };

      return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md animate-fade-in relative">
                  <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="text-lg font-bold mb-4">Editar Usuário</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                          <input className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                          <input className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Função (Role)</label>
                          <select className="w-full p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                              <option value={UserRole.CUSTOMER}>Cliente (CUSTOMER)</option>
                              <option value={UserRole.PHARMACY}>Farmácia (PHARMACY)</option>
                              <option value={UserRole.ADMIN}>Administrador (ADMIN)</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                          <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
                      </div>
                  </div>
              </Card>
          </div>
      )
  }

  const UsersView = () => {
      const [editingUser, setEditingUser] = useState<User | null>(null);

      return (
      <div className="space-y-6 animate-fade-in">
          {editingUser && (
              <EditUserModal 
                user={editingUser} 
                onClose={() => setEditingUser(null)} 
                onSave={reloadAll} 
              />
          )}

          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Gestão de Usuários</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                      <tr>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Contato</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Função</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
                      </tr>
                  </thead>
                  <tbody>
                      {usersList.map(u => (
                          <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                      {u.name.substring(0,1)}
                                  </div>
                                  {u.name}
                              </td>
                              <td className="p-4 text-sm">
                                  <div className="flex items-center gap-1"><Mail size={12}/> {u.email}</div>
                                  {u.phone && <div className="flex items-center gap-1 text-gray-500 mt-1"><Phone size={12}/> {u.phone}</div>}
                              </td>
                              <td className="p-4"><Badge color={u.role === 'ADMIN' ? 'red' : (u.role === 'PHARMACY' ? 'blue' : 'green')}>{u.role}</Badge></td>
                              <td className="p-4">
                                  <Button variant="outline" className="!py-1 !px-2 !text-xs" onClick={() => setEditingUser(u)}>Editar</Button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  )};

  // --- NOVA VIEW: BACKUP & SECURITY ---
  const BackupView = () => {
      const fileRef = useRef<HTMLInputElement>(null);
      const [loading, setLoading] = useState(false);
      const [parsedBackup, setParsedBackup] = useState<any>(null);
      const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
          users: true,
          pharmacies: true,
          globalProducts: true,
          inventory: true,
          orders: true,
          prescriptions: true,
          quotes: true
      });

      const handleBackup = async () => {
          setLoading(true);
          await generateFullSystemBackup();
          setLoading(false);
      }

      const handleRestoreClick = () => {
          if(fileRef.current) fileRef.current.value = '';
          fileRef.current?.click();
      }

      const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if(!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
              try {
                  const json = JSON.parse(event.target?.result as string);
                  if (json && json.data) {
                      setParsedBackup(json);
                  } else {
                      alert("Arquivo inválido: Formato incorreto.");
                  }
              } catch (err) {
                  alert("Arquivo inválido ou corrompido.");
              }
          };
          reader.readAsText(file);
      }

      const executeRestore = async () => {
          if (!parsedBackup) return;
          
          if (!confirm("ATENÇÃO: A restauração irá sobrescrever/adicionar os dados selecionados.\nIsso pode causar duplicações se não for feito com cuidado.\n\nDeseja continuar?")) return;

          setLoading(true);
          const result = await restoreFullSystemBackup(parsedBackup, restoreOptions);
          setLoading(false);
          
          if(result.success) {
              playSound('success');
              alert("Sistema restaurado com sucesso! Por favor, recarregue a página.");
              window.location.reload();
          } else {
              playSound('error');
              alert("Falha na restauração: " + (result.message || "Erro desconhecido"));
          }
      }

      const toggleOption = (key: keyof RestoreOptions) => {
          setRestoreOptions(prev => ({...prev, [key]: !prev[key]}));
      }

      return (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in relative">
              {loading && (
                  <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center rounded-xl">
                      <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4"/>
                      <p className="font-bold text-gray-800">Processando restauração...</p>
                      <p className="text-sm text-gray-500">Por favor, não feche a página.</p>
                  </div>
              )}

              {/* MODAL DE SELEÇÃO DE RESTAURAÇÃO */}
              {parsedBackup && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                      <Card className="w-full max-w-lg relative animate-fade-in max-h-[90vh] overflow-y-auto">
                          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                              <UploadCloud className="text-blue-600"/> Restaurar Dados
                          </h3>
                          <p className="text-sm text-gray-500 mb-6">
                              Backup datado de: <strong>{new Date(parsedBackup.timestamp).toLocaleString()}</strong><br/>
                              Selecione quais áreas do sistema deseja restaurar:
                          </p>

                          <div className="space-y-3 mb-6">
                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.globalProducts} onChange={() => toggleOption('globalProducts')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Produtos Globais</span><span className="text-xs text-gray-500">Catálogo mestre</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.global_products?.length || 0}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.users} onChange={() => toggleOption('users')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Usuários</span><span className="text-xs text-gray-500">Clientes e Farmácias</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.profiles?.length || 0}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.pharmacies} onChange={() => toggleOption('pharmacies')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Farmácias</span><span className="text-xs text-gray-500">Dados cadastrais</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.pharmacies?.length || 0}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.inventory} onChange={() => toggleOption('inventory')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Estoque das Farmácias</span><span className="text-xs text-gray-500">Produtos locais e preços</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.products?.length || 0}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.orders} onChange={() => toggleOption('orders')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Pedidos</span><span className="text-xs text-gray-500">Histórico de vendas</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.orders?.length || 0}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.prescriptions} onChange={() => toggleOption('prescriptions')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Receitas</span><span className="text-xs text-gray-500">Solicitações de clientes</span></div>
                                  </div>
                                  <Badge>{(parsedBackup.data.prescriptions?.length || 0) + (parsedBackup.data.prescription_requests?.length || 0)}</Badge>
                              </label>

                              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={restoreOptions.quotes} onChange={() => toggleOption('quotes')} className="w-5 h-5 text-blue-600 rounded"/>
                                      <div><span className="font-bold block">Orçamentos</span><span className="text-xs text-gray-500">Respostas de farmácias</span></div>
                                  </div>
                                  <Badge>{parsedBackup.data.quotes?.length || 0}</Badge>
                              </label>
                          </div>

                          <div className="flex gap-3 justify-end">
                              <Button variant="secondary" onClick={() => setParsedBackup(null)}>Cancelar</Button>
                              <Button onClick={executeRestore}>Confirmar Restauração</Button>
                          </div>
                      </Card>
                  </div>
              )}

              <input type="file" ref={fileRef} accept=".json" className="hidden" onChange={onFileChange} />
              
              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                      <ShieldCheck className="text-emerald-600"/> Segurança de Dados
                  </h2>
                  <p className="text-gray-500 mt-2">
                      Faça backups regulares de todo o sistema para garantir que nenhuma informação seja perdida.
                  </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                  <Card className="p-8 text-center border-t-4 border-emerald-500 hover:shadow-lg transition-all">
                      <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                          <Download size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Exportar Backup Completo</h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Baixa um arquivo JSON contendo Usuários, Farmácias, Produtos, Estoque, Pedidos, Receitas e Orçamentos.
                      </p>
                      <Button onClick={handleBackup} disabled={loading} className="w-full">
                          {loading ? 'Gerando...' : 'Baixar Dados Agora'}
                      </Button>
                  </Card>

                  <Card className="p-8 text-center border-t-4 border-blue-500 hover:shadow-lg transition-all">
                      <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                          <UploadCloud size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Restaurar Sistema</h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Recupera o sistema a partir de um arquivo de backup. Você poderá escolher o que restaurar.
                      </p>
                      <Button variant="outline" onClick={handleRestoreClick} disabled={loading} className="w-full">
                          {loading ? 'Lendo Arquivo...' : 'Carregar Arquivo'}
                      </Button>
                  </Card>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 flex gap-3">
                  <AlertCircle className="shrink-0 mt-0.5"/>
                  <div>
                      <strong>Nota Importante:</strong> O backup é baixado localmente no seu dispositivo. 
                      Recomendamos guardar esses arquivos em um local seguro (Google Drive, HD Externo) periodicamente.
                      O sistema inclui TODOS os dados sensíveis do negócio.
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Painel Administrativo</h1>
          <Button variant="secondary" onClick={reloadAll} className="!py-1">Atualizar Dados</Button>
       </div>
       
       <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
           <button onClick={() => setView('overview')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${view === 'overview' ? 'bg-white border border-gray-200 border-b-white text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Visão Geral</button>
           <button onClick={() => setView('pharmacies')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${view === 'pharmacies' ? 'bg-white border border-gray-200 border-b-white text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Farmácias</button>
           <button onClick={() => setView('users')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${view === 'users' ? 'bg-white border border-gray-200 border-b-white text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Usuários</button>
           <button onClick={() => setView('catalog')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${view === 'catalog' ? 'bg-white border border-gray-200 border-b-white text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Catálogo</button>
           <button onClick={() => setView('backup')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${view === 'backup' ? 'bg-white border border-gray-200 border-b-white text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Backup & Dados</button>
       </div>

       {view === 'overview' && <Overview />}
       {view === 'users' && <UsersView />}
       {view === 'pharmacies' && <AdminPharmaciesViewInternal />}
       {view === 'catalog' && <AdminCatalogView />}
       {view === 'backup' && <BackupView />}
    </div>
  );
};

const AdminPharmaciesViewInternal = () => {
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    useEffect(() => { reload(); }, []);
    const reload = () => { fetchPharmacies(true).then(setPharmacies); }

    if (selectedId) {
        return <AdminPharmacyDetailView pharmacyId={selectedId} onBack={() => { setSelectedId(null); reload(); }} />;
    }

    return <AdminPharmaciesView pharmacies={pharmacies} onUpdate={reload} onViewDetails={setSelectedId} />
}

// --- NOVA VIEW: DETALHES DE UMA FARMÁCIA (ADMIN) ---
const AdminPharmacyDetailView = ({ pharmacyId, onBack }: { pharmacyId: string, onBack: () => void }) => {
    const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const p = await fetchPharmacyById(pharmacyId);
            const prods = await fetchProducts(pharmacyId);
            const ords = await fetchOrders(pharmacyId);
            setPharmacy(p);
            setProducts(prods);
            setOrders(ords);
            setLoading(false);
        }
        load();
    }, [pharmacyId]);

    const handleDelete = async () => {
        const confirmMsg = prompt(`ATENÇÃO PERIGO:\n\nVocê está prestes a excluir PERMANENTEMENTE a farmácia "${pharmacy?.name}".\n\nIsso pode deixar produtos e pedidos órfãos.\n\nDigite DELETAR para confirmar:`);
        if (confirmMsg === 'DELETAR') {
            const success = await deletePharmacy(pharmacyId);
            if (success) {
                alert("Farmácia removida do sistema.");
                onBack();
            } else {
                alert("Erro ao excluir.");
            }
        }
    }

    if(loading) return <div className="p-10 text-center">Carregando detalhes...</div>;
    if(!pharmacy) return <div>Erro ao carregar.</div>;

    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800"><ArrowLeft size={18}/> Voltar para lista</button>
            
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{pharmacy.name}</h1>
                    <p className="text-gray-500">{pharmacy.address} • NIF: {pharmacy.nif}</p>
                </div>
                <Badge color={pharmacy.isAvailable ? 'green' : 'gray'}>{pharmacy.isAvailable ? 'Online' : 'Offline'}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-100">
                    <div className="text-sm text-blue-800 font-bold uppercase mb-1">Vendas Totais</div>
                    <div className="text-2xl font-bold text-gray-800">Kz {totalSales.toLocaleString()}</div>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-100">
                    <div className="text-sm text-purple-800 font-bold uppercase mb-1">Produtos</div>
                    <div className="text-2xl font-bold text-gray-800">{products.length}</div>
                </Card>
                <Card className="p-4 bg-orange-50 border-orange-100">
                    <div className="text-sm text-orange-800 font-bold uppercase mb-1">Pedidos</div>
                    <div className="text-2xl font-bold text-gray-800">{orders.length}</div>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card title="Inventário (Resumo)">
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {products.map(p => (
                            <div key={p.id} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                                <span>{p.name}</span>
                                <span className="text-emerald-600 font-bold">Kz {p.price}</span>
                            </div>
                        ))}
                        {products.length === 0 && <p className="text-gray-400 text-sm">Sem produtos.</p>}
                    </div>
                </Card>
                <Card title="Últimos Pedidos">
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {orders.slice(0,10).map(o => (
                            <div key={o.id} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                                <span>{o.customerName} ({o.status})</span>
                                <span className="text-gray-600">Kz {o.total}</span>
                            </div>
                        ))}
                        {orders.length === 0 && <p className="text-gray-400 text-sm">Sem pedidos.</p>}
                    </div>
                </Card>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button variant="secondary" onClick={() => alert("Funcionalidade de suspensão em desenvolvimento.")}>Suspender Temporariamente</Button>
                <Button variant="danger" onClick={handleDelete} className="flex items-center gap-2">
                    <Trash2 size={18}/> Excluir Farmácia
                </Button>
            </div>
        </div>
    )
}

export const AdminPharmaciesView = ({ pharmacies, onUpdate, onViewDetails }: { pharmacies: Pharmacy[], onUpdate: () => void, onViewDetails: (id: string) => void }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string, email?: string) => {
    if(confirm('Tem certeza que deseja APROVAR esta farmácia?')) {
        setProcessingId(id);
        try {
            const success = await approvePharmacy(id);
            if (success) {
                alert(`Farmácia aprovada com sucesso!`);
                setTimeout(() => { onUpdate(); setProcessingId(null); }, 500);
            } else {
                alert("Erro ao aprovar.");
                setProcessingId(null);
            }
        } catch (e) {
            setProcessingId(null);
        }
    }
  }

  const handleDeny = async (id: string, email?: string) => {
    if(confirm('ATENÇÃO: Deseja NEGAR e EXCLUIR esta solicitação?')) {
        setProcessingId(id);
        try {
            const success = await denyPharmacy(id);
            if (success) {
                alert(`Candidatura negada e removida.`);
                setTimeout(() => { onUpdate(); setProcessingId(null); }, 500);
            } else {
                alert("Erro ao excluir.");
                setProcessingId(null);
            }
        } catch (e) {
            setProcessingId(null);
        }
    }
  }

  const pendingList = pharmacies.filter(p => p.status === 'PENDING');
  const activeList = pharmacies.filter(p => p.status === 'APPROVED');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Entidades Cadastradas</h2>
      </div>

      {pendingList.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-orange-600 flex items-center gap-2"><AlertCircle size={20} /> Solicitações Pendentes ({pendingList.length})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingList.map(p => (
                <Card key={p.id} className="border-l-4 border-l-orange-400 bg-orange-50/30">
                    <div className="flex justify-between items-start mb-2">
                        <div><h3 className="font-bold text-gray-800">{p.name}</h3></div>
                        <Badge color='yellow'>Candidatura</Badge>
                    </div>
                    <div className="mb-4 text-sm text-gray-600 space-y-1">
                        <p><strong>Responsável:</strong> {p.ownerEmail || 'Email não registrado'}</p>
                        <p><strong>Status:</strong> Aguardando validação</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => handleApprove(p.id, p.ownerEmail)} disabled={processingId === p.id} className="flex-1 text-xs">
                            {processingId === p.id ? '...' : 'Aprovar'}
                        </Button>
                        <Button onClick={() => handleDeny(p.id, p.ownerEmail)} disabled={processingId === p.id} variant="danger" className="flex-1 text-xs">
                            {processingId === p.id ? '...' : 'Negar'}
                        </Button>
                    </div>
                </Card>
                ))}
            </div>
          </div>
      )}

      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Farmácias Aprovadas</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeList.map(p => (
            <Card key={p.id} className="hover:shadow-lg transition-all border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div><h3 className="font-bold text-gray-800">{p.name}</h3><p className="text-xs text-gray-500 mt-1">NIF: {p.nif || 'N/A'}</p></div>
                    <Badge color={p.isAvailable ? 'green' : 'gray'}>{p.isAvailable ? 'Online' : 'Configurando'}</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-4"><p>📍 {p.address}</p></div>
                <Button variant="outline" className="w-full text-xs" onClick={() => onViewDetails(p.id)}>Ver Detalhes</Button>
            </Card>
            ))}
        </div>
      </div>
    </div>
  );
};
