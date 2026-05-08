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
    
    // If current key is suspicious or matches known bad suffix, try to fallback to viteEnvKey
    if (apiKey.includes("YOUR_") || apiKey.includes("MY_GEMINI") || apiKey.endsWith("_KEY") || apiKey.length < 20 || apiKey.endsWith("idf0")) {
      if (viteEnvKey && viteEnvKey.startsWith("AIzaSy")) {
        apiKey = viteEnvKey;
      } else if (clientApiKey) {
        apiKey = clientApiKey.trim();
      }
    }
    
    if (!apiKey || apiKey.length < 10) {
      return new Response(JSON.stringify({ error: "API Key missing or invalid. Please configure GEMINI_API_KEY." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const genAIModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction,
    });
    
    let chatHistory = (history || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: (m.text || m.parts?.[0]?.text || "").trim() }]
    })).filter(m => m.parts[0].text !== "");
    
    // Gemini requires alternating roles and starts with 'user'
    let mergedHistory = [];
    for (const msg of chatHistory) {
      if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === msg.role) {
        mergedHistory[mergedHistory.length - 1].parts[0].text += "\n" + msg.parts[0].text;
      } else {
        mergedHistory.push(msg);
      }
    }
    
    // Ensure it starts with 'user'
    while (mergedHistory.length > 0 && mergedHistory[0].role !== 'user') {
      mergedHistory.shift();
    }

    // Ensure it ends with 'model' to allow the next 'user' message
    while (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role !== 'model') {
      mergedHistory.pop();
    }

    const chat = genAIModel.startChat({
      history: mergedHistory,
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
