
/**
 * Serviço de integração direta com Cloudinary
 * Cloud Name: dzvusz0u4
 * Preset: farmolink_presets (Deve ser configurado como "Unsigned" no painel Cloudinary)
 */

const CLOUD_NAME = 'dzvusz0u4';
const UPLOAD_PRESET = 'farmolink_presets';

export const uploadImageToCloudinary = async (base64Data: string): Promise<string | null> => {
    try {
        const formData = new FormData();
        formData.append('file', base64Data);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Falha no upload para Cloudinary');

        const data = await response.json();
        return data.secure_url; // Retorna o link HTTPS direto
    } catch (error) {
        console.error('Erro Cloudinary:', error);
        return null;
    }
};
