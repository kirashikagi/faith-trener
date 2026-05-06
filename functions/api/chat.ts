import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = body;
    
    // В Cloudflare переменные окружения берутся из env.
    // Приоритет: ключ от клиента -> env.GEMINI_API_KEY -> env.VITE_GEMINI_API_KEY
    const apiKey = (clientApiKey || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '').trim();
    
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
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_JAILBREAK, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
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
