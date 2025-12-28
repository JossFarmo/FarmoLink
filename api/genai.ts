import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function - handles POST requests from the client and proxies to Gemini
export default async function handler(req: any, res: any) {
  try {
    // Health / debug: allow a GET to check if API key is configured (safe: does NOT return the key)
    if (req.method === 'GET') {
      const hasKey = !!process.env.API_KEY;
      return res.status(200).json({ ok: true, hasApiKey: hasKey, model: process.env.AI_MODEL || null });
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { message, products } = req.body || {};
    if (!message) {
      res.status(400).json({ error: 'Missing message in request body' });
      return;
    }

    if (!process.env.API_KEY) {
      console.error('API_KEY missing in environment');
      res.status(500).json({ error: 'Assistente indisponível: chave de API não configurada no servidor. Defina API_KEY no painel do Vercel.' });
      return;
    }

    // Build a lightweight stock context
    const stockContext = (products || []).slice(0, 50).map((p: any) => `${p.name} (Preço: Kz ${p.price?.toLocaleString?.() || p.price})`).join(', ');

    // Import SDK lazily to avoid module-load errors if environment can't load native libs
    let GoogleGenAI: any;
    try {
      ({ GoogleGenAI } = await import('@google/genai'));
    } catch (err) {
      console.error('Failed to import @google/genai in serverless function', err);
      res.status(500).json({ error: 'Assistente temporariamente indisponível (falha ao carregar SDK).' });
      return;
    }

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
    console.error('genai func error', err?.message || err);
    res.status(500).json({ error: 'Assistente temporariamente indisponível.' });
  }
}
