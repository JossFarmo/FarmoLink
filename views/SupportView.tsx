
import React, { useState } from 'react';
import { Card, Button } from '../components/UI';
import { User } from '../types';
import { createSupportTicket } from '../services/dataService';
import { MessageCircle, Mail, HelpCircle, Send } from 'lucide-react';
import { playSound } from '../services/soundService';

export const SupportView = ({ user }: { user: User }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const success = await createSupportTicket(user.id, user.name, user.email, subject, message);
        setLoading(false);
        
        if (success) {
            playSound('success');
            alert("Sua solicitação foi enviada! Responderemos em breve por e-mail.");
            setSubject('');
            setMessage('');
        } else {
            playSound('error');
            alert("Erro ao enviar ticket. Tente novamente.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="text-center">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <HelpCircle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Como podemos ajudar?</h1>
                <p className="text-gray-500 mt-2">Escolha a melhor forma de falar com a nossa equipe.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-lg transition-all cursor-pointer" onClick={() => window.open('https://wa.me/244923123456', '_blank')}>
                    <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-full text-green-600">
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">WhatsApp Direto</h3>
                            <p className="text-sm text-gray-500">Resposta imediata (08h - 18h)</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer" onClick={() => document.getElementById('ticket-form')?.scrollIntoView({behavior: 'smooth'})}>
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Abrir Ticket</h3>
                            <p className="text-sm text-gray-500">Relatar problemas técnicos</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-8" id="ticket-form">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Mail size={20} className="text-gray-400"/> Enviar Mensagem
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assunto</label>
                        <select className="w-full p-3 border rounded-lg bg-gray-50" value={subject} onChange={e => setSubject(e.target.value)} required>
                            <option value="">Selecione um motivo...</option>
                            <option value="Problema com Pedido">Problema com Pedido</option>
                            <option value="Erro no Sistema">Erro no Sistema</option>
                            <option value="Dúvida Financeira">Dúvida Financeira</option>
                            <option value="Sugestão">Sugestão</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                        <textarea 
                            className="w-full p-3 border rounded-lg h-32" 
                            placeholder="Descreva detalhadamente sua solicitação..." 
                            value={message} 
                            onChange={e => setMessage(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full py-3 text-lg">
                        {loading ? 'Enviando...' : 'Enviar Solicitação'} <Send size={18} className="ml-2"/>
                    </Button>
                </form>
            </Card>

            <div className="text-center text-sm text-gray-400">
                <p>Equipe FarmoLink • Luanda, Angola</p>
            </div>
        </div>
    );
};
