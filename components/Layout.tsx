
import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Pill, Home, Activity, Settings, LogOut, User, Store, DollarSign, Heart, Bell, HelpCircle } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children?: React.ReactNode;
  role: UserRole;
  setRole: (role: UserRole) => void;
  cartCount?: number;
  onCartClick?: () => void;
  currentPage: string;
  setPage: (page: string) => void;
  pendingOrdersCount?: number;   
  pendingRequestsCount?: number; 
}

// Logo Component: Original FarmoLink
const BrandLogo = () => (
  <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
    <div className="bg-white text-emerald-600 p-1.5 rounded-lg shadow-sm">
      <Pill className="h-6 w-6" />
    </div>
    <span>FarmoLink</span>
  </div>
);

export const Header: React.FC<LayoutProps> = ({ role, setRole, cartCount, onCartClick, currentPage, setPage, pendingOrdersCount = 0, pendingRequestsCount = 0 }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const BadgeDot = ({ count }: { count: number }) => count > 0 ? (
      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-emerald-600 animate-pulse">
        {count}
      </span>
  ) : null;

  return (
    <header className="bg-emerald-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPage('home')}>
          <BrandLogo />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {role === UserRole.CUSTOMER && (
            <>
              <button onClick={() => setPage('home')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'home' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Início</button>
              <button onClick={() => setPage('pharmacies-list')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'pharmacies-list' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Farmácias</button>
              <button onClick={() => setPage('prescriptions')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'prescriptions' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Receitas</button>
              <button onClick={() => setPage('orders')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'orders' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Pedidos</button>
            </>
          )}
          
          {role === UserRole.PHARMACY && (
             <>
             <button onClick={() => setPage('dashboard')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'dashboard' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Painel</button>
             <button onClick={() => setPage('products')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'products' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Produtos</button>
             
             <button onClick={() => setPage('orders')} className={`relative hover:text-emerald-100 font-medium transition-colors ${currentPage === 'orders' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>
                Pedidos
                <BadgeDot count={pendingOrdersCount} />
             </button>
             
             <button onClick={() => setPage('requests')} className={`relative hover:text-emerald-100 font-medium transition-colors ${currentPage === 'requests' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>
                Receitas
                <BadgeDot count={pendingRequestsCount} />
             </button>
             
             <button onClick={() => setPage('financial')} className={`hover:text-emerald-100 font-medium transition-colors flex items-center gap-1 ${currentPage === 'financial' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}><DollarSign size={14}/> Financeiro</button>
             
             <button onClick={() => setPage('settings')} className={`hover:text-emerald-100 font-medium transition-colors flex items-center gap-1 ${currentPage === 'settings' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`} title="Configurações"><Settings size={18}/></button>
           </>
          )}

           {role === UserRole.ADMIN && (
             <>
             <button onClick={() => setPage('dashboard')} className={`hover:text-emerald-100 font-medium transition-colors ${currentPage === 'dashboard' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}>Visão Geral</button>
             <button onClick={() => setPage('financial')} className={`hover:text-emerald-100 font-medium transition-colors flex items-center gap-1 ${currentPage === 'financial' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`}><DollarSign size={14}/> Ganhos</button>
           </>
          )}

          {/* Botão de Suporte Global (Desktop) */}
          <button onClick={() => setPage('support')} className={`hover:text-emerald-100 font-medium transition-colors flex items-center gap-1 ${currentPage === 'support' ? 'text-white border-b-2 border-white' : 'text-emerald-100/90'}`} title="Fale Conosco">
              <HelpCircle size={18}/> Suporte
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          
          {role === UserRole.CUSTOMER && (
            <>
              <button 
                onClick={onCartClick} 
                className="relative p-2 hover:bg-emerald-700 rounded-full transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount && cartCount > 0 ? (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-emerald-600">
                    {cartCount}
                  </span>
                ) : null}
              </button>

              <button 
                onClick={() => setPage('profile')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors ${currentPage === 'profile' ? 'bg-emerald-800 text-white' : 'bg-emerald-800/50'}`}
              >
                <User className="h-5 w-5" />
                <span className="text-sm font-medium hidden lg:inline">Meu Perfil</span>
              </button>
            </>
          )}

           <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
              </button>
           </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-emerald-700 py-4 px-4 space-y-3 shadow-inner">
           {role === UserRole.CUSTOMER && (
            <>
              <button onClick={() => { setPage('home'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'home' ? 'text-white' : 'text-emerald-100'}`}>Início</button>
              <button onClick={() => { setPage('pharmacies-list'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'pharmacies-list' ? 'text-white' : 'text-emerald-100'}`}>Farmácias</button>
              <button onClick={() => { setPage('prescriptions'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'prescriptions' ? 'text-white' : 'text-emerald-100'}`}>Minhas Receitas</button>
              <button onClick={() => { setPage('orders'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'orders' ? 'text-white' : 'text-emerald-100'}`}>Meus Pedidos</button>
              <button onClick={() => { setPage('support'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'support' ? 'text-white' : 'text-emerald-100'}`}>Suporte / Ajuda</button>
              <button onClick={() => { setPage('profile'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium border-t border-emerald-600 mt-2 pt-2 ${currentPage === 'profile' ? 'text-white' : 'text-emerald-100'}`}>Minha Conta</button>
            </>
          )}
          {role === UserRole.PHARMACY && (
             <>
             <button onClick={() => { setPage('dashboard'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'dashboard' ? 'text-white' : 'text-emerald-100'}`}>Painel</button>
             <button onClick={() => { setPage('products'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'products' ? 'text-white' : 'text-emerald-100'}`}>Meus Produtos</button>
             <button onClick={() => { setPage('orders'); setIsMenuOpen(false)}} className={`flex justify-between items-center w-full text-left py-2 font-medium ${currentPage === 'orders' ? 'text-white' : 'text-emerald-100'}`}>Pedidos {pendingOrdersCount > 0 && <span className="text-xs bg-red-500 text-white px-2 rounded-full">{pendingOrdersCount}</span>}</button>
             <button onClick={() => { setPage('requests'); setIsMenuOpen(false)}} className={`flex justify-between items-center w-full text-left py-2 font-medium ${currentPage === 'requests' ? 'text-white' : 'text-emerald-100'}`}>Receitas {pendingRequestsCount > 0 && <span className="text-xs bg-red-500 text-white px-2 rounded-full">{pendingRequestsCount}</span>}</button>
             <button onClick={() => { setPage('financial'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'financial' ? 'text-white' : 'text-emerald-100'}`}>Financeiro</button>
             <button onClick={() => { setPage('settings'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'settings' ? 'text-white' : 'text-emerald-100'}`}>Configurações</button>
             <button onClick={() => { setPage('support'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'support' ? 'text-white' : 'text-emerald-100'}`}>Suporte</button>
             </>
          )}
          {role === UserRole.ADMIN && (
             <>
             <button onClick={() => { setPage('dashboard'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'dashboard' ? 'text-white' : 'text-emerald-100'}`}>Dashboard</button>
             <button onClick={() => { setPage('financial'); setIsMenuOpen(false)}} className={`block w-full text-left py-2 font-medium ${currentPage === 'financial' ? 'text-white' : 'text-emerald-100'}`}>Ganhos</button>
             </>
          )}
        </div>
      )}
    </header>
  );
};
