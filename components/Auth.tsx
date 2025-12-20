
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { signInUser, signUpUser, signUpPartner, resetPassword, updateUserPassword } from '../services/dataService';
import { Button } from './UI';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertTriangle, Info, ArrowLeft, Briefcase, Phone, Heart, CheckCircle } from 'lucide-react';
import { playSound, playWelcomeMessage } from '../services/soundService';

interface AuthProps {
  onLogin: (user: User) => void;
}

const LOGO_URL = "https://res.cloudinary.com/dzvusz0u4/image/upload/v1765977310/wrzwildc1kqsq5skklio.png";

// --- NOVO COMPONENTE: Tela de Definição de Nova Senha ---
export const UpdatePasswordView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if(password.length < 6) return alert("A senha deve ter no mínimo 6 caracteres");
        if(password !== confirm) return alert("As senhas não coincidem");

        setLoading(true);
        const result = await updateUserPassword(password);
        setLoading(false);

        if(result.success) {
            playSound('success');
            alert("Senha atualizada com sucesso! Você já está logado.");
            onComplete();
        } else {
            playSound('error');
            alert("Erro ao atualizar senha: " + result.error);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center border border-gray-100">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <Lock size={32}/>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Definir Nova Senha</h2>
                <p className="text-gray-500 mb-6 text-sm">Digite sua nova senha abaixo para recuperar o acesso.</p>
                
                <form onSubmit={handleUpdate} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nova Senha</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full p-3 border rounded-xl"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Confirmar Senha</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full p-3 border rounded-xl"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Repita a senha"
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full py-3">
                        {loading ? 'Salvando...' : 'Atualizar Senha'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export const AuthView: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isPartnerMode, setIsPartnerMode] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // Estado para telefone
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.includes('@') || !email.includes('.')) {
       setErrorMsg('Por favor, insira um endereço de e-mail válido.');
       playSound('error');
       setLoading(false);
       return;
    }

    if (isResetMode) {
      const result = await resetPassword(email.trim());
      setLoading(false);
      if (result.success) {
        setSuccessMsg(result.message);
        playSound('save');
      } else {
        setErrorMsg(result.message);
        playSound('error');
      }
      return;
    }

    let result;
    if (isLoginMode) {
      result = await signInUser(email.trim(), password);
    } else {
      if (isPartnerMode) {
         // Passando telefone no cadastro de parceiro
         result = await signUpPartner(name, email.trim(), password, phone);
      } else {
         // Passando telefone no cadastro de cliente
         result = await signUpUser(name, email.trim(), password, UserRole.CUSTOMER, phone);
      }
    }

    if (result.user) {
      playWelcomeMessage(result.user.name); // Passa o nome do usuário para o áudio
      onLogin(result.user);
    } else {
      playSound('error');
      setErrorMsg(result.error || 'Ocorreu um erro desconhecido.');
    }
    
    setLoading(false);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setIsResetMode(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setName('');
    setPhone('');
    playSound('click');
  };

  const switchToPartnerSignup = () => {
    setIsPartnerMode(true);
    setIsLoginMode(false);
    setIsResetMode(false);
    setErrorMsg(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    playSound('click');
  }

  const toggleReset = () => {
    setIsResetMode(!isResetMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    playSound('click');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        
        {/* Header Visual - FarmoLink Original */}
        <div className={`p-8 text-center transition-colors duration-500 ${isPartnerMode && !isLoginMode ? 'bg-blue-800' : 'bg-emerald-600'}`}>
          <div className="flex justify-center mb-6">
             {/* AUMENTADO: w-24 h-24 */}
             <div className="bg-white p-4 rounded-3xl shadow-xl">
                <img src={LOGO_URL} className="h-24 w-24 object-contain" alt="Logo" />
             </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FarmoLink</h1>
          <p className="text-emerald-100 opacity-90">
             {isPartnerMode ? 'Parceiros' : 'Sua farmácia digital'}
          </p>
        </div>

        <div className="p-8">
          
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {isResetMode ? 'Recuperar Senha' : (
                isLoginMode ? 'Acessar Conta' : (isPartnerMode ? 'Candidatura de Farmácia' : 'Criar Nova Conta')
              )}
            </h2>
            {isResetMode && <p className="text-gray-500 text-sm mt-1">Digite seu e-mail para receber um link de redefinição.</p>}
            {isPartnerMode && !isLoginMode && <p className="text-gray-500 text-sm mt-1">Crie sua conta. Após aprovação do administrador, você poderá configurar sua farmácia.</p>}
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Nome (Apenas Cadastro) */}
            {!isLoginMode && !isResetMode && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  required={!isLoginMode}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  placeholder={isPartnerMode ? "Nome do Responsável" : "Nome Completo"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Telefone (Apenas Cadastro) */}
            {!isLoginMode && !isResetMode && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="tel" 
                  required={!isLoginMode}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  placeholder="Seu Telefone (ex: 923...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder={isPartnerMode && !isLoginMode ? "E-mail Corporativo" : "Seu E-mail"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Senha */}
            {!isResetMode && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  placeholder="Sua Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {isLoginMode && !isResetMode && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={toggleReset}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className={`w-full py-3.5 mt-2 text-lg font-bold shadow-lg transition-transform active:scale-95 ${isPartnerMode && !isLoginMode ? '!bg-blue-700 hover:!bg-blue-800' : ''}`}
              disabled={loading}
            >
              {loading ? 'Processando...' : (
                <span className="flex items-center justify-center gap-2">
                  {isResetMode ? 'Enviar Link' : (isLoginMode ? 'Entrar' : (isPartnerMode ? 'Enviar Candidatura' : 'Criar Conta'))}
                  {!isResetMode && <ArrowRight className="h-5 w-5" />}
                </span>
              )}
            </Button>
          </form>

          {isResetMode && (
             <div className="mt-4 text-center">
               <button onClick={toggleReset} className="text-gray-500 text-sm hover:text-gray-800 flex items-center justify-center gap-1 mx-auto">
                 <ArrowLeft className="w-4 h-4" /> Voltar para o Login
               </button>
             </div>
          )}

          {!isResetMode && (
            <div className="mt-6 text-center pt-6 border-t border-gray-100">
              <p className="text-gray-500 text-sm mb-2">
                {isLoginMode ? 'Ainda não tem uma conta?' : 'Já possui cadastro?'}
              </p>
              <button 
                onClick={() => { toggleMode(); setIsPartnerMode(false); }}
                className="font-bold text-emerald-600 hover:underline transition-colors mb-6"
              >
                {isLoginMode ? 'Criar conta de Cliente' : 'Fazer Login'}
              </button>

              {/* Link DISCRETO para Farmácias */}
              {!isPartnerMode && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button 
                        onClick={switchToPartnerSignup}
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                        <Briefcase className="w-3 h-3" /> Sou Farmácia: Cadastrar / Entrar
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
