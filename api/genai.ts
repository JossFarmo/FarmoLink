import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

// Vercel Serverless Function - handles POST requests from the client and proxies to Gemini
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { message, products } = req.body || {};
    if (!message) {
      res.status(400).json({ error: 'Missing message in request body' });
      return;
    }

    // Build a lightweight stock context
    const stockContext = (products || []).slice(0, 50).map((p: any) => `${p.name} (Preço: Kz ${p.price?.toLocaleString?.() || p.price})`).join(', ');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.AI_MODEL || 'gemini-3-flash-preview',
      contents: `Você é o FarmoBot, o assistente inteligente da FarmoLink, a maior rede de farmácias online de Angola.

      DIRETRIZES DE PERSONALIDADE:
      - Seja prestativo, educado e use um tom profissional.
      - Use termos locais de Angola quando apropriado (ex: citar preços em Kwanzas).
      - Se o usuário perguntar sobre preços ou disponibilidade, use estas informações do nosso stock atual: ${stockContext}.
      - Nunca diagnostique doenças gravemente. Sugira sempre a consulta a um especialista.

      REGRAS DE RESPOSTA:
      - Respostas curtas e diretas ao ponto.
      - IMPORTANTE: No final de cada resposta, adicione: "Nota: Sou uma inteligência artificial. Para diagnósticos precisos, consulte sempre um médico ou farmacêutico presencialmente."

      PERGUNTA DO CLIENTE: ${message}`,
    });

    res.status(200).json({ text: response.text });
  } catch (err: any) {
    console.error('genai func error', err);
    res.status(500).json({ error: 'Assistente temporariamente indisponível.' });
  }
}
