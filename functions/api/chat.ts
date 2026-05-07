import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  
  try {
    const body: any = await request.json();
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = body;
    
    // Robust API key selection
    const rawEnvKey = (env.GEMINI_API_KEY || "").trim();
    const viteEnvKey = (env.VITE_GEMINI_API_KEY || "").trim();
    
    let apiKey = (clientApiKey || rawEnvKey || viteEnvKey || "").trim();
    
    if (!apiKey || apiKey.includes("YOUR_") || apiKey.includes("MY_GEMINI") || apiKey.endsWith("_KEY") || apiKey.length < 20) {
      apiKey = viteEnvKey || (clientApiKey || "").trim();
    }
    
    if (!apiKey || apiKey.length < 10) {
      return new Response(JSON.stringify({ error: "API Key missing or invalid. Please configure GEMINI_API_KEY." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction,
    });
    
    const chatHistory = (history || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.parts?.[0]?.text || '' }]
    }));

    const chat = genModel.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();
    
    return new Response(JSON.stringify({ text }), {
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
