import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function - handles POST requests from the client and proxies to Gemini
export default async function handler(req: any, res: any) {
  // Helper: mask which env var is used for logs
  const maskApiKeySource = () => (process.env.API_KEY ? 'API_KEY' : (process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : null));

  const truncate = (s: string | undefined | null, n = 300) => {
    if (!s) return s;
    return s.length > n ? `${s.slice(0, n)}... (truncated ${s.length - n} chars)` : s;
  };

  try {
    // Health / debug: allow a GET to check if API key is configured (safe: does NOT return the key)
    if (req.method === 'GET') {
      const key = process.env.API_KEY || process.env.GEMINI_API_KEY || null;
      const source = maskApiKeySource();
      return res.status(200).json({ ok: true, hasApiKey: !!key, apiKeySource: source, model: process.env.AI_MODEL || null });
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

    const KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || null;
    if (!KEY) {
      console.error('API_KEY / GEMINI_API_KEY missing in environment');
      res.status(500).json({ error: 'Assistente indisponível: chave de API não configurada no servidor. Defina API_KEY (ou GEMINI_API_KEY) no painel do Vercel.' });
      return;
    }

    // Build a lightweight stock context
    const stockContext = (products || []).slice(0, 50).map((p: any) => `${p.name} (Preço: Kz ${p.price?.toLocaleString?.() || p.price})`).join(', ');

    // Logging: structured and safe
    console.info('genai invocation', {
      ts: new Date().toISOString(),
      apiKeySource: maskApiKeySource(),
      messageLen: String(message?.length || 0),
      productsCount: (products || []).length,
      stockContextPreview: truncate(stockContext, 200),
    });

    // Import SDK lazily to avoid module-load errors if environment can't load native libs
    let GoogleGenAI: any;
    try {
      ({ GoogleGenAI } = await import('@google/genai'));
    } catch (err) {
      console.error('Failed to import @google/genai in serverless function', { err: truncate(String(err), 1000) });
      res.status(500).json({ error: 'Assistente temporariamente indisponível (falha ao carregar SDK).' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: KEY });

    // Prepare the full prompt we normally send
    const model = process.env.AI_MODEL || 'gemini-3-flash-preview';
    const buildPrompt = (includeStock = true) => {
      const stockPart = includeStock && stockContext ? `Se o usuário perguntar sobre preços ou disponibilidade, use estas informações do nosso stock atual: ${stockContext}.` : '';
      return `Você é o FarmoBot, o assistente inteligente da FarmoLink, a maior rede de farmácias online de Angola.

DIRETRIZES DE PERSONALIDADE:
- Seja prestativo, educado e use um tom profissional.
- Use termos locais de Angola quando apropriado (ex: citar preços em Kwanzas).
${stockPart}
- Nunca diagnostique doenças gravemente. Sugira sempre a consulta a um especialista.

REGRAS DE RESPOSTA:
- Respostas curtas e diretas ao ponto.
- IMPORTANTE: No final de cada resposta, adicione: "Nota: Sou uma inteligência artificial. Para diagnósticos precisos, consulte sempre um médico ou farmacêutico presencialmente."

PERGUNTA DO CLIENTE: ${message}`;
    };

    // Try primary SDK call
    let response: any;
    let primaryError: any = null;
    try {
      const contents = buildPrompt(true);
      console.debug('genai: calling SDK (primary)', { model, promptPreview: truncate(contents, 400) });
      response = await ai.models.generateContent({ model, contents });
      // normalize: keep response.text if present
      const text = response?.text ?? response?.output?.[0]?.content ?? null;
      if (!text) {
        // if SDK returned an unexpected shape, include full response for debugging
        console.warn('genai: SDK returned unexpected response shape', { response: truncate(JSON.stringify(response), 1000) });
      }
      return res.status(200).json({ text: text ?? response });
    } catch (aiErr: any) {
      primaryError = aiErr;
      console.error('genai SDK primary error', { message: truncate(String(aiErr?.message || aiErr), 1000), stack: aiErr?.stack ? aiErr.stack.split('\n').slice(0,3).join('\n') : undefined });
    }

    // If we got here, primary SDK call failed. Try a safer retry with reduced payload (no stock context)
    try {
      const retryPrompt = buildPrompt(false);
      console.info('genai: retrying SDK with reduced payload (no stock context)', { promptPreview: truncate(retryPrompt, 300) });
      const retryResp = await ai.models.generateContent({ model, contents: retryPrompt });
      const text = retryResp?.text ?? retryResp?.output?.[0]?.content ?? null;
      if (text) {
        return res.status(200).json({ text, fallback: 'reduced-prompt' });
      }
      // if still no text, fallthrough to error handler
      console.warn('genai: retry succeeded but returned unexpected shape', { retryResp: truncate(JSON.stringify(retryResp), 1000) });
    } catch (retryErr: any) {
      console.error('genai SDK retry error', { message: truncate(String(retryErr?.message || retryErr), 1000), stack: retryErr?.stack ? retryErr.stack.split('\n').slice(0,3).join('\n') : undefined });
    }

    // All attempts failed - return structured debug info (truncated) for diagnosis
    res.status(500).json({
      error: 'Assistente temporariamente indisponível (SDK).',
      details: truncate(String(primaryError?.message || primaryError || 'unknown'), 1000),
      apiKeySource: maskApiKeySource(),
      hint: 'Primary SDK call failed. A retry with a reduced payload was attempted. Check serverless logs for full stack traces.',
    });
  } catch (err: any) {
    console.error('genai func error', { err: truncate(String(err), 1000) });
    // Include message in response for temporary debugging (do not expose sensitive data in production)
    res.status(500).json({ error: 'Assistente temporariamente indisponível.', details: err?.message || String(err) });
  }
}
