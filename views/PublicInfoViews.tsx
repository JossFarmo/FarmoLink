
import React from 'react';
import { Card, Badge } from '../components/UI';
import { ShieldCheck, Users, Target, Heart, HelpCircle, ChevronDown, CheckCircle2, MessageSquare, Info, Smartphone, Store } from 'lucide-react';

export const AboutUsView = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20 px-4">
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-inner"><Info size={40}/></div>
                <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase">FarmoLink Angola</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Transformando o acesso à saúde através da tecnologia.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-8 border-none bg-emerald-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                    <h3 className="text-2xl font-black mb-4">Nossa Missão</h3>
                    <p className="text-emerald-100 leading-relaxed font-medium">Digitalizar o ecossistema farmacêutico angolano, proporcionando transparência de preços e conveniência para todos os utentes, de Luanda a Cabinda.</p>
                    <Target className="absolute -bottom-6 -right-6 text-white/5 w-32 h-32" />
                </Card>
                <Card className="p-8 border-none bg-blue-600 text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                    <h3 className="text-2xl font-black mb-4">Inovação Local</h3>
                    <p className="text-blue-100 leading-relaxed font-medium">Criado por angolanos para angolanos, entendemos os desafios logísticos e de literacia digital, criando ferramentas simples e eficazes como a leitura de receitas por IA.</p>
                    <Smartphone className="absolute -bottom-6 -right-6 text-white/5 w-32 h-32" />
                </Card>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2 px-2"><ShieldCheck className="text-emerald-500"/> Nossos Valores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { t: 'Transparência', d: 'Preços reais das farmácias em tempo real.' },
                        { t: 'Segurança', d: 'Dados protegidos conforme a Lei da APD.' },
                        { t: 'Ética', d: 'Sempre exigimos a receita original para entrega.' },
                        { t: 'Acessibilidade', d: 'Feito para funcionar em qualquer telemóvel.' }
                    ].map((v, i) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 flex gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl h-fit"><CheckCircle2 size={20}/></div>
                            <div><h4 className="font-black text-gray-800 uppercase text-sm mb-1">{v.t}</h4><p className="text-xs text-gray-400 font-medium">{v.d}</p></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-10 rounded-[50px] border border-emerald-100 text-center space-y-6 shadow-sm">
                <h3 className="text-2xl font-black text-gray-800">Já somos +30 farmácias parceiras</h3>
                <p className="text-gray-500 text-sm max-w-xl mx-auto">Quer levar sua farmácia para o mundo digital? Junte-se à maior rede online de Angola.</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Badge color="green" className="py-2 px-6">LUANDA</Badge>
                    <Badge color="blue" className="py-2 px-6">BENGUELA</Badge>
                    <Badge color="yellow" className="py-2 px-6">HUÍLA</Badge>
                </div>
            </div>
        </div>
    );
};

export const FAQView = () => {
    const faqs = [
        { q: 'Como faço para comprar um medicamento?', a: 'Podes pesquisar diretamente pelo nome na tela inicial ou tirar uma foto da tua receita médica. A IA ajudará a ler e mandaremos para as farmácias darem o orçamento.' },
        { q: 'O FarmoLink faz entregas?', a: 'Sim! No momento do pedido podes escolher "Entrega ao Domicílio". Algumas farmácias têm entrega própria e outras permitem apenas levantamento em loja.' },
        { q: 'Preciso da receita física no momento da entrega?', a: 'SIM. O FarmoLink é uma plataforma de intermediação. A entrega de medicamentos sujeitos a receita médica só será feita se entregares a receita original física ao estafeta ou ao balcão.' },
        { q: 'Como pago o meu pedido?', a: 'O pagamento é feito diretamente à farmácia no ato da entrega, via TPA (Multicaixa), MCX Express ou Dinheiro.' },
        { q: 'O que acontece se a IA ler errado a receita?', a: 'A IA é apenas um assistente. O farmacêutico da loja escolhida fará sempre a verificação manual da foto e da receita física antes de validar a venda.' },
        { q: 'Os preços são os mesmos da loja física?', a: 'Sim. As farmácias parceiras comprometem-se a praticar os mesmos preços do balcão na plataforma FarmoLink.' }
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
            <div className="text-center space-y-4 py-6">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-inner"><HelpCircle size={40}/></div>
                <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase">Perguntas Frequentes</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Esclarece as tuas dúvidas sobre o FarmoLink.</p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, i) => (
                    <div key={i} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <details className="group">
                            <summary className="p-6 flex items-center justify-between cursor-pointer list-none">
                                <h4 className="font-black text-gray-800 pr-8 text-sm sm:text-base leading-tight uppercase">{faq.q}</h4>
                                <div className="p-2 bg-gray-50 rounded-xl group-open:rotate-180 transition-transform"><ChevronDown size={20} className="text-gray-400"/></div>
                            </summary>
                            <div className="px-6 pb-8 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-4 animate-fade-in font-medium">
                                {faq.a}
                            </div>
                        </details>
                    </div>
                ))}
            </div>

            <div className="bg-blue-600 p-8 rounded-[40px] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><MessageSquare size={28}/></div>
                    <div>
                        <h4 className="font-black text-lg">Ainda tens dúvidas?</h4>
                        <p className="text-blue-100 text-xs font-medium">Estamos disponíveis no WhatsApp para ajudar.</p>
                    </div>
                </div>
                <button className="px-8 py-3 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-all">Falar com Suporte</button>
            </div>
        </div>
    );
};
