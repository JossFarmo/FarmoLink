
// URLs de sons hospedados - Otimizados para UI
const SOUNDS = {
    click: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8c8a73467.mp3?filename=mouse-click-153941.mp3', 
    success: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3', 
    save: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_274e797d74.mp3?filename=notification-sound-7062.mp3',
    notification: 'https://cdn.pixabay.com/download/audio/2022/10/16/audio_13a3788734.mp3?filename=notification-interface-1856.mp3', // Som mais evidente
    error: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative-beeps-6008.mp3', 
    trash: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=recycle-bin-restore-96542.mp3',
    login: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=success-fanfare-trumpets-6110.mp3',
    logout: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_7e7e834863.mp3?filename=ui-click-43196.mp3', // Som suave de saída
    cash: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769f.mp3?filename=cash-register-purchase-87313.mp3'
};

export const playSound = (type: keyof typeof SOUNDS) => {
    // Execução "Fire and Forget"
    setTimeout(() => {
        try {
            console.log(`Tentando tocar som: ${type}`);
            const audio = new Audio(SOUNDS[type] || SOUNDS.click);
            audio.volume = 1.0; // VOLUME MÁXIMO
            
            const promise = audio.play();
            
            if (promise !== undefined) {
                promise.then(() => {
                    console.log("Som reproduzido com sucesso.");
                }).catch(error => {
                    console.warn("Autoplay bloqueado pelo navegador. O usuário precisa interagir com a página primeiro.", error);
                });
            }
        } catch (e) {
            console.error("Erro fatal ao tocar som", e);
        }
    }, 0);
};

export const playWelcomeMessage = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = "Olá, Seja bem vindo ao FarmoLink";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT'; 
        utterance.rate = 1.1; 
        
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-PT')) || voices.find(v => v.lang.includes('pt'));
        if (ptVoice) utterance.voice = ptVoice;

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 300);
    } else {
        playSound('login');
    }
};
