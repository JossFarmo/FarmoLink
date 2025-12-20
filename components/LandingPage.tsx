
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Layout';
import { Button } from './UI';
import { CarouselSlide, Partner } from '../types';
import { ArrowRight, ChevronLeft, ChevronRight, Upload, Search, MapPin, ShieldCheck, Clock, Heart, Zap } from 'lucide-react';
import { fetchLandingContent } from '../services/dataService';

interface LandingPageProps {
    onLoginClick: () => void;
}

// Fallback slides caso o DB esteja vazio
const DEFAULT_SLIDES: CarouselSlide[] = [
    {
        id: 'def-1',
        title: 'Sua farmácia digital, conectada e acessível.',
        subtitle: 'Encontre medicamentos, compare preços e envie receitas para as melhores farmácias da sua região.',
        imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2d5f926?q=80&w=2079&auto=format&fit=crop',
        buttonText: 'Buscar Medicamentos',
        order: 1
    },
    {
        id: 'def-2',
        title: 'Envie sua Receita Médica em segundos.',
        subtitle: 'Tire uma foto e receba orçamentos de várias farmácias sem sair de casa.',
        imageUrl: 'https://images.unsplash.com/photo-1576091160550-217358c7e618?q=80&w=2070&auto=format&fit=crop',
        buttonText: 'Enviar Receita',
        order: 2
    },
    {
        id: 'def-3',
        title: 'Entregas rápidas e seguras.',
        subtitle: 'Receba seus produtos no conforto do seu lar com rastreamento em tempo real.',
        imageUrl: 'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?q=80&w=2070&auto=format&fit=crop',
        buttonText: 'Começar Agora',
        order: 3
    }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
    const [slides, setSlides] = useState<CarouselSlide[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        const loadContent = async () => {
            const content = await fetchLandingContent();
            // Use defaults if DB is empty
            if (content.slides.length > 0) {
                setSlides(content.slides);
            } else {
                setSlides(DEFAULT_SLIDES);
            }
            setPartners(content.partners);
        };
        loadContent();
    }, []);

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    useEffect(() => {
        if (isPaused || slides.length === 0) return;
        resetTimeout();
        timeoutRef.current = setTimeout(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 5000);

        return () => resetTimeout();
    }, [currentSlide, isPaused, slides.length]);

    const nextSlide = () => {
        setCurrentSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);
    }

    const prevSlide = () => {
        setCurrentSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);
    }

    // Safety check: if slides is empty (shouldn't happen with defaults), show loader
    if (slides.length === 0) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

    return (
        <div className="font-sans text-gray-900 bg-white">
            {/* Header Global (Sólido) */}
            <Header 
                currentPage="landing" 
                setPage={() => {}} 
                onLoginClick={onLoginClick}
            />

            {/* --- HERO CAROUSEL (Fixed Height for Visibility) --- */}
            <div 
                className="relative h-[450px] md:h-[550px] w-full overflow-hidden bg-gray-900 text-white mt-[64px]" // mt-[64px] compensa o header fixo
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Slides */}
                <div 
                    className="flex transition-transform duration-700 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {slides.map((slide, idx) => (
                        <div key={slide.id} className="min-w-full h-full relative">
                            {/* Background Image with Darker Overlay for better text contrast */}
                            <div className="absolute inset-0 bg-black/50 z-10"></div>
                            <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                            
                            {/* Content - CENTERED ALIGNMENT (REVERTED) */}
                            <div className="absolute inset-0 z-20 flex items-center justify-center container mx-auto px-4 mt-8">
                                <div className="max-w-3xl text-center space-y-4 md:space-y-6 animate-fade-in-up">
                                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">{slide.title}</h2>
                                    <p className="text-base md:text-xl text-gray-200 opacity-90 max-w-2xl mx-auto">{slide.subtitle}</p>
                                    <div className="pt-4">
                                        <button 
                                            onClick={onLoginClick}
                                            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-base shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
                                        >
                                            {slide.buttonText} <ArrowRight size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white transition-all opacity-0 hover:opacity-100 md:opacity-100">
                    <ChevronLeft size={24}/>
                </button>
                <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur text-white transition-all opacity-0 hover:opacity-100 md:opacity-100">
                    <ChevronRight size={24}/>
                </button>

                {/* Dots Indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                    {slides.map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-emerald-500' : 'w-2 bg-white/50 hover:bg-white'}`}
                        />
                    ))}
                </div>
            </div>

            {/* --- FEATURES SECTION --- */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs md:text-sm">Funcionalidades</span>
                        <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mt-2">Tudo o que você precisa</h2>
                        <p className="text-gray-500 mt-3 text-sm md:text-base">Simplificamos o processo de cuidar da sua saúde conectando você às melhores farmácias.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 text-center group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Search size={28}/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Busca Inteligente</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Encontre medicamentos pelo nome ou princípio ativo. Compare preços em tempo real.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 text-center group">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Upload size={28}/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Envio de Receitas</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Tire uma foto da sua receita médica e envie para múltiplas farmácias simultaneamente.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 text-center group">
                            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <MapPin size={28}/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Entrega Rápida</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Receba seus medicamentos no conforto da sua casa ou reserve para retirada.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PARTNERS SECTION --- */}
            <section className="py-12 bg-white border-t border-gray-100">
                <div className="container mx-auto px-4">
                    <p className="text-center text-gray-400 font-bold uppercase text-xs tracking-widest mb-8">Parceiros que confiam no FarmoLink</p>
                    
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {partners.map(partner => (
                            <img 
                                key={partner.id} 
                                src={partner.logoUrl} 
                                alt={partner.name} 
                                className="h-10 md:h-14 object-contain hover:scale-110 transition-transform duration-300 cursor-pointer" 
                                title={partner.name}
                            />
                        ))}
                        {partners.length === 0 && <p className="text-gray-300 text-sm">Nenhum parceiro configurado.</p>}
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} FarmoLink Angola. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};
