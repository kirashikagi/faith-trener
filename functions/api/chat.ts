import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = body;
    
    // Robust API key selection: ignore placeholders and prefer VITE_ prefix if legacy env is poisoned
    const rawEnvKey = env.GEMINI_API_KEY || '';
    const viteEnvKey = env.VITE_GEMINI_API_KEY || '';
    
    let apiKey = (clientApiKey || rawEnvKey || viteEnvKey || '').trim();
    
    if (apiKey.includes('YOUR_') || apiKey.includes('MY_GEMINI') || apiKey.endsWith('_KEY')) {
      apiKey = (viteEnvKey || '').trim();
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing. Please configure GEMINI_API_KEY or provide one in settings." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct contents for multi-turn chat
    const contents = (history || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.parts?.[0]?.text || '' }]
    }));

    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: model || "gemini-3-flash-preview",
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });
    
    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Cloudflare Gemini Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
