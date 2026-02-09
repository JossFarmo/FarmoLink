import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

// Carrega variáveis do arquivo .env
dotenv.config();

const app = express();
app.use(cors());
// Explicitly cast express.json() to any to fix "NextHandleFunction" type mismatch in some TS environments
app.use(express.json({ limit: '15mb' }) as any);

const PORT = process.env.PORT || 3000;

// FIX: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); as per initialization guidelines.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Chatbot FarmoBot
app.post('/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: message,
            config: {
                systemInstruction: "Você é o FarmoBot, assistente da FarmoLink em Angola. Use termos angolanos (Kanzas, Luanda) e sempre recomende consulta médica presencial.",
                temperature: 0.7
            }
        });
        res.json({ text: response.text });
    } catch (error) {
        res.status(500).json({ error: "Erro no processamento do chat" });
    }
});

// 2. Análise de Visão (Receitas Médicas)
app.post('/ai/analyze-prescription', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const ai = getAI();
        
        const imageResp = await fetch(imageUrl);
        const arrayBuffer = await imageResp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        const schema = {
            type: Type.OBJECT,
            properties: {
                confidence: { type: Type.NUMBER },
                extracted_text: { type: Type.STRING },
                is_validated: { type: Type.BOOLEAN },
                suggested_items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            quantity: { type: Type.NUMBER }
                        },
                        required: ["name", "quantity"]
                    }
                }
            },
            required: ["confidence", "extracted_text", "is_validated", "suggested_items"]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: "Analise esta receita médica de Angola. Extraia os medicamentos e quantidades." },
                    { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        res.json(JSON.parse(result.text || '{}'));
    } catch (error) {
        res.status(500).json({ error: "Erro na análise de visão" });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));