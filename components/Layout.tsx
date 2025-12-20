
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, X, LogOut, ShoppingCart, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { User, Notification, UserRole } from '../types';
import { fetchNotifications, markNotificationRead, deleteNotification } from '../services/dataService';
import { playSound } from '../services/soundService';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  menuItems: { id: string; label: string; icon: any }[];
  cartCount?: number; 
}

const LOGO_URL = "https://res.cloudinary.com/dzvusz0u4/image/upload/v1765977310/wrzwildc1kqsq5skklio.png";

export const MainLayout: React.FC<LayoutProps> = ({ 
    children, user, activePage, onNavigate, onLogout, menuItems, cartCount 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
      loadNotifications();
      const interval = setInterval(loadNotifications, 12000); // Polling de notificações
      return () => clearInterval(interval);
  }, [user?.id]);

  const loadNotifications = async () => {
      const data = await fetchNotifications();
      const currentUnread = data.filter(n => !n.read).length;
      
      // DISPARO SONORO DO SININHO: Se o número de não lidas aumentou, toca o som!
      if (currentUnread > prevUnreadCountRef.current) {
          playSound('notification');
      }
      
      prevUnreadCountRef.current = currentUnread;
      setNotifications(data);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNavigate = (id: string) => {
      onNavigate(id);
      setIsMobileMenuOpen(false);
      playSound('click');
  };

  const toggleNotif = async () => {
      setShowNotif(!showNotif);
      if (!showNotif && unreadCount > 0) {
          const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
          setNotifications(prev => prev.map(n => ({...n, read: true})));
          prevUnreadCountRef.current = 0;
          for (const id of unreadIds) await markNotificationRead(id);
      }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="flex h-[100dvh] bg-gray-100 overflow-hidden font-sans">
        
        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/60 z-[60] md:hidden backdrop-blur-sm transition-all" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* --- SIDEBAR --- */}
        <aside className={`
            fixed inset-y-0 left-0 z-[70] bg-emerald-900 text-white shadow-2xl flex flex-col transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
            md:relative md:translate-x-0 ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}>
            {/* LOGO AREA */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-emerald-800 bg-emerald-950 shrink-0`}>
                {!isCollapsed ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-white p-1.5 rounded-xl text-emerald-800 shadow-sm shrink-0">
                            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="animate-fade-in">
                            <h1 className="font-bold text-lg tracking-tight leading-none text-white">FarmoLink</h1>
                            <p className="text-[9px] text-emerald-400 uppercase tracking-widest leading-none mt-1 font-bold">
                                {user.role === 'CUSTOMER' ? 'Shopping' : (user.role === 'ADMIN' ? 'Administrador' : 'Farmácia')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-1.5 rounded-xl text-emerald-800 shadow-lg">
                        <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                )}

                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-emerald-300 p-1 hover:bg-emerald-800 rounded-full">
                    <X size={24}/>
                </button>

                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className={`hidden md:flex text-emerald-400 hover:text-white transition-colors p-1 rounded hover:bg-emerald-800 ${isCollapsed ? 'absolute -right-3 top-8 bg-emerald-700 rounded-full shadow-md border border-emerald-600' : ''}`}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* NAV ITEMS */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3.5 rounded-xl transition-all duration-200 group relative
                            ${activePage === item.id 
                                ? 'bg-emerald-600 text-white shadow-lg' 
                                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                            }
                        `}
                    >
                        <item.icon size={22} className={`${activePage === item.id ? 'text-white' : 'text-emerald-300 group-hover:text-white'} shrink-0`} />
                        
                        {!isCollapsed && (
                            <span className="font-bold ml-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis animate-fade-in">
                                {item.label}
                            </span>
                        )}
                        
                        {item.id === 'cart' && cartCount && cartCount > 0 ? (
                            <span className={`absolute ${isCollapsed ? 'top-1 right-1 w-4 h-4 p-0' : 'right-3 top-1/2 -translate-y-1/2 px-2 py-0.5'} bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                                {cartCount}
                            </span>
                        ) : null}
                    </button>
                ))}
            </nav>

            {/* PROFILE & LOGOUT */}
            <div className="p-3 border-t border-emerald-800 bg-emerald-950 shrink-0">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-3 px-1'}`}>
                    <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold border-2 border-emerald-500 shrink-0 text-sm shadow-inner">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden animate-fade-in">
                            <p className="text-sm font-bold text-white truncate">{user.name}</p>
                            <p className="text-[10px] text-emerald-500 truncate">{user.email}</p>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={onLogout} 
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-4'} gap-3 bg-emerald-900/50 hover:bg-red-600/90 text-emerald-200 hover:text-white py-3 rounded-xl transition-all duration-300 group shadow-sm border border-emerald-800/50`}
                >
                    <LogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
                    {!isCollapsed && <span className="text-sm font-bold">Encerrar Sessão</span>}
                </button>
            </div>
        </aside>

        {/* --- MAIN AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-gray-50 h-full">
            
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-50 sticky top-0 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-emerald-600 p-2 transition-colors">
                        <Menu size={24} />
                    </button>
                    <h2 className="font-bold text-gray-800 text-lg md:text-xl truncate max-w-[150px] sm:max-w-none">
                        {menuItems.find(m => m.id === activePage)?.label || 'FarmoLink'}
                    </h2>
                </div>

                <div className="flex items-center gap-1 md:gap-4">
                    {user.role === UserRole.CUSTOMER && (
                        <button onClick={() => onNavigate('cart')} className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-xl hover:bg-gray-100">
                            <ShoppingCart size={22} />
                            {cartCount && cartCount > 0 ? (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                                    {cartCount}
                                </span>
                            ) : null}
                        </button>
                    )}

                    <div className="relative">
                        <button onClick={toggleNotif} className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-xl hover:bg-gray-100">
                            <Bell size={22} className={unreadCount > 0 ? 'animate-bounce text-emerald-600' : ''} />
                            {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                        </button>

                        {showNotif && (
                            <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-fade-in origin-top-right">
                                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                    <h4 className="font-bold text-sm text-gray-700">Notificações</h4>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{notifications.length}</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-10 text-center text-gray-400 text-xs italic">Sem novas notificações</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 relative group transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                                                <p className="text-xs font-bold text-gray-800 pr-4">{n.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                                                <button onClick={(e) => handleDeleteNotif(e, n.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 scroll-smooth pb-24 custom-scrollbar">
                <div className="max-w-7xl mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    </div>
  );
};

interface HeaderProps {
    currentPage: string;
    setPage: (page: string) => void;
    onLoginClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, setPage, onLoginClick }) => {
    return (
        <header className="fixed w-full top-0 z-[100] bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('home')}>
                     <img src={LOGO_URL} alt="Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-xl p-1 shadow-sm border border-gray-100" />
                    <span className="font-bold text-xl sm:text-2xl tracking-tight text-gray-800">FarmoLink</span>
                </div>
                
                <div className="flex items-center gap-4">
                     {onLoginClick && (
                        <button 
                            onClick={onLoginClick}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                        >
                            Entrar
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
