import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const { model, systemInstruction, history, message } = body;
    
    // В Cloudflare переменные окружения берутся из env
    const apiKey = env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured on Cloudflare." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: model || "gemini-3-flash-preview",
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
