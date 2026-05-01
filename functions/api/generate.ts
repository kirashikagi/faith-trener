import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const { prompt, config, apiKey: clientApiKey } = body;
    
    const apiKey = (clientApiKey || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing. Please configure GEMINI_API_KEY or provide one in settings." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: config || { responseMimeType: "application/json" }
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
