import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { YooCheckout } from 'yookassa';

dotenv.config();

const app = express();
app.use(express.json());

// YooKassa Configuration
const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID || '',
  secretKey: process.env.YOOKASSA_SECRET_KEY || ''
});

// YooKassa Payment Routes
app.post("/api/payments/create", async (req, res) => {
  const { amount, description, metadata, return_url } = req.body;
  
  if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) {
    return res.status(500).json({ error: "YooKassa is not configured on the server. Please add YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY to Secrets." });
  }

  try {
    const payment = await checkout.createPayment({
      amount: {
        value: Number(amount).toFixed(2),
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      confirmation: {
        type: 'redirect',
        return_url: return_url
      },
      description: description,
      metadata: metadata,
      capture: true
    });
    
    res.json({ confirmation_url: payment.confirmation.confirmation_url });
  } catch (error: any) {
    console.error("YooKassa Create Payment Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  const event = req.body;
  console.log("YooKassa Webhook Event:", event);
  
  if (event.event === 'payment.succeeded') {
    const payment = event.object;
    const { userId, articleId, type } = payment.metadata;
    
    console.log(`Payment succeeded for user ${userId}, type: ${type}, id: ${articleId}`);
    // Note: In a real app, you would update Firestore here.
    // Since we are server-side, we can't easily update client-side state,
    // but the client can poll or refresh to see the change.
  }
  
  res.sendStatus(200);
});

// Gemini Proxy Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
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
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, config, apiKey: clientApiKey } = req.body;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: config || { responseMimeType: "application/json" }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// For Vercel, we export the app instance
export default app;
