
import React, { useState } from 'react';
import { User } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { updateUserProfile, resetPassword, updateUserPassword } from '../services/dataService';
import { Lock, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { playSound } from '../services/soundService';

export const CustomerProfileView = ({ user, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    address: user.address || ''
  });
  const [loading, setLoading] = useState(false);

  // Estados para alteração de senha
  const [passwordData, setPasswordData] = useState({ newPass: '', confirmPass: '' });
  const [passLoading, setPassLoading] = useState(false);

  const handleSave = async () => {
     setLoading(true);
     const result = await updateUserProfile(user.id, formData);
     setLoading(false);
     if (result.success) {
       onUpdateUser({ ...user, ...formData });
       playSound('save');
       alert("Perfil atualizado com sucesso!");
     } else {
       playSound('error');
       alert("Erro ao atualizar perfil.");
     }
  };

  const handleChangePassword = async () => {
      if (passwordData.newPass.length < 6) {
          playSound('error');
          alert("A senha deve ter pelo menos 6 caracteres.");
          return;
      }
      if (passwordData.newPass !== passwordData.confirmPass) {
          playSound('error');
          alert("As senhas não coincidem.");
          return;
      }

      setPassLoading(true);
      const result = await updateUserPassword(passwordData.newPass);
      setPassLoading(false);

      if (result.success) {
          playSound('success');
          alert("Senha alterada com sucesso!");
          setPasswordData({ newPass: '', confirmPass: '' });
      } else {
          playSound('error');
          alert("Erro ao alterar senha: " + result.error);
      }
  }

  const handlePasswordResetEmail = async () => {
    if (confirm(`Enviar link de redefinição de senha para ${user.email}?`)) {
       const res = await resetPassword(user.email);
       alert(res.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
       <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
       
       <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-3xl">
                {user.name.charAt(0)}
             </div>
             <div>
                <h2 className="font-bold text-xl text-gray-800">{user.name}</h2>
                <p className="text-gray-500">{user.email}</p>
                <Badge color="blue">Cliente</Badge>
             </div>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
               <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
               <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Seu contato principal" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Padrão</label>
               <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Para entregas" />
             </div>
             
             <Button onClick={handleSave} disabled={loading} className="w-full mt-4 flex items-center gap-2">
                <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Dados Pessoais'}
             </Button>
          </div>
       </Card>

       <Card className="p-6 border-l-4 border-l-emerald-500">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock size={18} className="text-emerald-600"/> Alterar Senha</h3>
          
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <input type="password" value={passwordData.newPass} onChange={e => setPasswordData({...passwordData, newPass: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input type="password" value={passwordData.confirmPass} onChange={e => setPasswordData({...passwordData, confirmPass: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Repita a senha" />
              </div>
              
              <div className="flex gap-4 pt-2">
                  <Button onClick={handleChangePassword} disabled={passLoading} className="flex-1">
                      {passLoading ? 'Alterando...' : 'Atualizar Senha'}
                  </Button>
                  <Button variant="outline" onClick={handlePasswordResetEmail} className="flex-1 text-xs">
                     Esqueci minha senha atual
                  </Button>
              </div>
          </div>
       </Card>
    </div>
  );
};
