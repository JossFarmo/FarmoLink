
// URLs de sons hospedados em CDN estável (Mixkit/Assets)
const SOUNDS = {
    click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 
    success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 
    save: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Bell claro
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', 
    trash: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    login: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    logout: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 
    cash: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

export const playSound = (type: keyof typeof SOUNDS) => {
    // Execução assíncrona para nunca travar a UI
    const audioUrl = SOUNDS[type] || SOUNDS.click;
    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    
    // Tenta tocar, lida com erro de interação do usuário silenciosamente
    audio.play().catch(e => {
        console.warn("Áudio bloqueado pelo navegador. Aguardando interação...", e);
    });
};

export const playWelcomeMessage = (userName?: string) => {
    if (!('speechSynthesis' in window)) return;
    
    try {
        window.speechSynthesis.cancel();
        const firstName = userName ? userName.split(' ')[0] : '';
        const text = firstName 
            ? `Olá ${firstName}, seja bem vindo ao FarmoLink`
            : "Olá, Seja bem vindo ao FarmoLink";

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        // Silenciosamente ignora
    }
};
