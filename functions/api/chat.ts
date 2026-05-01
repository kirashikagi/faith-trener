import { GoogleGenAI } from "@google/genai";

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
    const chat = ai.chats.create({
      model: model || "gemini-1.5-flash",
      config: { systemInstruction },
      history: history.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }))
    });

    const response = await chat.sendMessage({ message });
    
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
