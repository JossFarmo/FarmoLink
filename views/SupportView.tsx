
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { User, FAQItem, SystemContent } from '../types';
import { createSupportTicket, fetchUserTickets, fetchTicketMessages, sendTicketMessage, fetchFaq, fetchAboutUs } from '../services/dataService';
// FIX: Added missing Target and Sparkles icon imports
import { MessageCircle, HelpCircle, Send, ChevronRight, X, Heart, Shield, Globe, ArrowLeft, Search, Info, Loader2, CheckCircle2, MessageSquare, ExternalLink, Target, Sparkles } from 'lucide-react';
import { playSound } from '../services/soundService';

export const SupportView = ({ user }: { user: User }) => {
    const [view, setView] = useState<'LIST' | 'NEW' | 'CHAT' | 'INFO'>('LIST');
    const [tickets, setTickets] = useState<any[]>([]);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [faqSearch, setFaqSearch] = useState('');
    
    // Dados Dinâmicos
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [aboutUs, setAboutUs] = useState<SystemContent | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const [subject, setSubject] = useState('');
    const [initialMessage, setInitialMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { 
        if (view === 'LIST') loadTickets();
        if (view === 'INFO') loadInstitutional();
    }, [view]);

    useEffect(() => {
        if (view === 'CHAT' && activeTicket) {
            loadMessages();
            const interval = setInterval(loadMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [view, activeTicket?.id]);

    const loadTickets = async () => {
        setLoading(true);
        const data = await fetchUserTickets(user.id);
        setTickets(data);
        setLoading(false);
    };

    const loadInstitutional = async () => {
        setLoadingData(true);
        const [f, a] = await Promise.all([fetchFaq(), fetchAboutUs()]);
        setFaqs(f.filter(i => i.active));
        setAboutUs(a);
        setLoadingData(false);
    };

    const loadMessages = async () => {
        if (!activeTicket) return;
        const data = await fetchTicketMessages(activeTicket.id);
        setMessages(data);
    };

    const handleStartTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !initialMessage) return;
        setLoading(true);
        const success = await createSupportTicket(user.id, user.name, user.email, subject, initialMessage);
        setLoading(false);
        if (success) { playSound('success'); setView('LIST'); setSubject(''); setInitialMessage(''); }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeTicket) return;
        const msg = newMessage; setNewMessage('');
        const success = await sendTicketMessage(activeTicket.id, user.id, user.name, user.role, msg);
        if (success) { loadMessages(); playSound('click'); }
    };

    const filteredFaq = useMemo(() => {
        const q = faqSearch.toLowerCase().trim();
        if (!q) return faqs;
        const tokens = q.split(' ').filter(t => t.length > 0);
        return faqs.filter(f => tokens.every(t => f.question.toLowerCase().includes(t) || f.answer.toLowerCase().includes(t)));
    }, [faqSearch, faqs]);

    if (view === 'INFO') {
        return (
            <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-24 px-4 bg-gray-50/30">
                <button onClick={() => setView('LIST')} className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase hover:text-emerald-600 transition-colors pt-4"><ArrowLeft size={14}/> Voltar para Suporte</button>
                
                {loadingData ? (
                    <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" size={40}/></div>
                ) : (
                    <>
                        {/* HEADER - DESIGN DAS IMAGENS */}
                        <div className="text-center space-y-4 pt-10">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[24px] flex items-center justify-center mx-auto shadow-sm">
                                <Info size={32} />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-emerald-950 tracking-tighter uppercase">{aboutUs?.title}</h1>
                            <p className="text-[10px] font-black text-gray-400 tracking-[0.4em] uppercase">{aboutUs?.subtitle}</p>
                        </div>

                        {/* CARDS MISSÃO E INOVAÇÃO */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-[#064e3b] p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                                <h3 className="text-3xl font-black mb-6">Nossa Missão</h3>
                                <p className="text-emerald-50 text-lg leading-relaxed font-medium">{aboutUs?.mission_text}</p>
                                <div className="absolute -right-8 -bottom-8 bg-white/5 w-40 h-40 rounded-full flex items-center justify-center">
                                    {/* FIX: Target icon added */}
                                    <Target size={60} className="opacity-10" />
                                </div>
                            </div>
                            <div className="bg-[#0066FF] p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                                <h3 className="text-3xl font-black mb-6">Inovação Local</h3>
                                <p className="text-blue-50 text-lg leading-relaxed font-medium">{aboutUs?.innovation_text}</p>
                                <div className="absolute -right-8 -bottom-8 bg-white/5 w-40 h-40 rounded-full flex items-center justify-center">
                                    {/* FIX: Sparkles icon added */}
                                    <Sparkles size={60} className="opacity-10" />
                                </div>
                            </div>
                        </div>

                        {/* NOSSOS VALORES - LISTA COM ÍCONES CHECK VERDE */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-emerald-500" size={24}/>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Nossos Valores</h3>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                {[
                                    { title: 'TRANSPARÊNCIA', text: aboutUs?.val_transparency },
                                    { title: 'SEGURANÇA', text: aboutUs?.val_security },
                                    { title: 'ÉTICA', text: aboutUs?.val_ethics },
                                    { title: 'ACESSIBILIDADE', text: aboutUs?.val_accessibility }
                                ].map((v, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 flex items-start gap-5 shadow-sm hover:shadow-md transition-all">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-emerald-950 text-sm mb-1 tracking-widest">{v.title}</h4>
                                            <p className="text-gray-500 text-xs font-medium">{v.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BANNER FARMÁCIAS PARCEIRAS */}
                        <div className="bg-white rounded-[48px] p-12 border-2 border-emerald-50 text-center space-y-6 shadow-sm">
                            <h3 className="text-3xl md:text-4xl font-black text-emerald-950 tracking-tight">Já somos {aboutUs?.partners_count_text}</h3>
                            <p className="text-gray-400 font-medium max-w-xl mx-auto">Quer levar sua farmácia para o mundo digital? Junte-se à maior rede online de Angola.</p>
                            <div className="flex flex-wrap justify-center gap-4 pt-4">
                                {['LUANDA', 'BENGUELA', 'HUÍLA'].map(prov => (
                                    <Badge key={prov} className="px-6 py-2 !text-[10px] font-black tracking-widest border-none" color={prov === 'LUANDA' ? 'green' : (prov === 'BENGUELA' ? 'blue' : 'yellow')}>
                                        {prov}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* FAQ - DESIGN DAS IMAGENS */}
                        <div className="space-y-10 pt-12 border-t border-gray-100">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                                    <HelpCircle size={28} />
                                </div>
                                <h3 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Perguntas Frequentes</h3>
                                <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Esclarece as tuas dúvidas sobre o FarmoLink.</p>
                            </div>
                            
                            <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-3 max-w-2xl mx-auto"><Search className="text-gray-300 ml-4" size={20}/><input placeholder="Pesquisar ajuda..." className="w-full py-4 outline-none font-bold text-gray-700 uppercase placeholder:normal-case" value={faqSearch} onChange={e => setFaqSearch(e.target.value)}/></div>
                            
                            <div className="grid gap-6 max-w-4xl mx-auto">
                                {filteredFaq.map((f, i) => (
                                    <details key={f.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm group transition-all open:ring-4 open:ring-emerald-50">
                                        <summary className="font-black text-gray-800 uppercase text-xs cursor-pointer list-none flex justify-between items-center group-open:mb-6 group-open:pb-4 group-open:border-b border-gray-50">
                                            {f.question}
                                            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-open:bg-emerald-100 group-open:text-emerald-600 transition-colors">
                                                <ChevronRight size={18} className="group-open:rotate-90 transition-transform"/>
                                            </div>
                                        </summary>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium animate-fade-in">{f.answer}</p>
                                    </details>
                                ))}
                            </div>

                            {/* BANNER SUPORTE WHATSAPP NO FINAL DO FAQ */}
                            <div className="bg-blue-600 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl animate-fade-in max-w-4xl mx-auto">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/20 rounded-[20px] flex items-center justify-center shadow-inner">
                                        <MessageSquare size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black">Ainda tens dúvidas?</h4>
                                        <p className="text-blue-100 text-sm font-medium">Estamos disponíveis no WhatsApp para ajudar.</p>
                                    </div>
                                </div>
                                <button className="px-10 py-5 bg-white text-blue-600 rounded-[20px] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                                    Falar com Suporte
                                </button>
                            </div>
                        </div>

                        <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest pt-10">{aboutUs?.footer_text}</p>
                    </>
                )}
            </div>
        );
    }

    // LIST VIEW (REMAINS THE SAME)
    if (view === 'CHAT') {
        return (
            <div className="max-w-4xl mx-auto h-[80vh] flex flex-col animate-fade-in bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 bg-emerald-900 text-white flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('LIST')} className="p-2 hover:bg-white/20 rounded-full transition-colors bg-white/10"><X size={20}/></button>
                        <div><h3 className="font-bold text-sm sm:text-base">{activeTicket.subject}</h3><p className="text-[9px] opacity-60 uppercase tracking-widest font-black">Ticket #{activeTicket.id.slice(0,6)}</p></div>
                    </div>
                    <Badge color={activeTicket.status === 'OPEN' ? 'green' : 'gray'}>{activeTicket.status === 'OPEN' ? 'ATIVO' : 'RESOLVIDO'}</Badge>
                </div>
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50">
                    {messages.map((m, idx) => {
                        const isMe = m.sender_id === user.id;
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm ${!isMe ? 'bg-white text-gray-800 border-emerald-500 border-l-4 rounded-tl-none' : 'bg-emerald-600 text-white rounded-tr-none'}`}>
                                    <p className="leading-relaxed">{m.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {activeTicket.status === 'OPEN' && (
                    <div className="p-6 bg-white border-t flex gap-4 shrink-0"><input className="flex-1 p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-50 text-sm" placeholder="Escreva aqui..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} /><button onClick={handleSendMessage} className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 shadow-lg active:scale-95 transition-all"><Send size={24}/></button></div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
            <div className="text-center"><h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Centro de Suporte</h1><p className="text-gray-500 mt-2 font-medium">Como podemos ajudar hoje?</p></div>
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 p-8 border-emerald-100 flex flex-col items-center text-center h-full">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><HelpCircle size={32} /></div>
                    <h3 className="font-black text-gray-800 uppercase text-sm">Novo Chamado</h3>
                    <p className="text-[10px] text-gray-400 mt-1 mb-6 font-bold">Relata dúvidas ou problemas.</p>
                    <Button onClick={() => setView('NEW')} className="w-full font-black py-4 uppercase text-xs">Abrir Ticket</Button>
                </Card>
                <Card className="md:col-span-1 p-8 border-blue-100 flex flex-col items-center text-center h-full cursor-pointer hover:shadow-xl transition-all" onClick={() => setView('INFO')}>
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><Info size={32} /></div>
                    <h3 className="font-black text-gray-800 uppercase text-sm">Sobre & FAQ</h3>
                    <p className="text-[10px] text-gray-400 mt-1 mb-6 font-bold">Tira dúvidas rápidas aqui.</p>
                    <Button variant="secondary" className="w-full font-black py-4 uppercase text-xs bg-blue-50 text-blue-600">Ver Informações</Button>
                </Card>
                <div className="md:col-span-1 space-y-4 flex flex-col h-full">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 px-2">Histórico</h4>
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2 custom-scrollbar">
                        {tickets.map(t => (
                            <div key={t.id} onClick={() => { setActiveTicket(t); setView('CHAT'); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between group transition-all">
                                <div className="flex items-center gap-3 overflow-hidden"><div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${t.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><MessageCircle size={16}/></div><p className="font-bold text-gray-800 text-[11px] truncate uppercase">{t.subject}</p></div>
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600"/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {view === 'NEW' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                    <Card className="w-full max-w-lg p-8 animate-scale-in">
                        <div className="flex justify-between items-center mb-8"><h3 className="font-black text-2xl text-gray-800 uppercase tracking-tighter">Novo Ticket</h3><button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full"><X/></button></div>
                        <form onSubmit={handleStartTicket} className="space-y-4">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Assunto</label><select className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold uppercase text-xs" value={subject} onChange={e => setSubject(e.target.value)} required><option value="">Escolha...</option><option value="Problema com Pedido">Problema com Pedido</option><option value="Erro no Sistema">Erro no Sistema</option><option value="Sugestão">Sugestão</option></select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Mensagem</label><textarea className="w-full p-4 bg-gray-50 border rounded-2xl outline-none h-32 text-sm" placeholder="O que aconteceu?" value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required /></div>
                            <Button type="submit" disabled={loading} className="w-full py-4 font-black uppercase shadow-lg shadow-emerald-100">{loading ? <Loader2 className="animate-spin" /> : 'Mandar para Suporte'}</Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};
