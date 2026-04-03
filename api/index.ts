import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { YooCheckout } from 'yookassa';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore;

try {
  let appInstance;
  if (!admin.apps.length) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    let serviceAccount = null;
    
    if (serviceAccountStr) {
      try {
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch (e) {
        console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON:", e);
      }
    }

    if (serviceAccount) {
      appInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      appInstance = admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'the-sentinel-490819'
      });
    }
  } else {
    appInstance = admin.apps[0]!;
  }
  
  // Use the specific database ID if provided
  const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-869f31c2-5b90-4d7e-8ae0-6d60d83bc4b5';
  db = getFirestore(appInstance, databaseId);
} catch (error) {
  console.error("CRITICAL: Firebase Admin initialization failed:", error);
}

const app = express();
app.use(express.json());

// YooKassa Configuration
const getTrimmedEnv = (key: string) => (process.env[key] || '').trim();

let checkout: YooCheckout | null = null;

const getCheckout = () => {
  if (!checkout) {
    const shopId = getTrimmedEnv('YOOKASSA_SHOP_ID');
    const secretKey = getTrimmedEnv('YOOKASSA_SECRET_KEY');
    if (shopId && secretKey) {
      checkout = new YooCheckout({ shopId, secretKey });
    }
  }
  return checkout;
};

// YooKassa Payment Routes
app.post("/api/payments/create", async (req, res) => {
  const { amount, description, metadata, return_url } = req.body;
  
  const shopId = getTrimmedEnv('YOOKASSA_SHOP_ID');
  const secretKey = getTrimmedEnv('YOOKASSA_SECRET_KEY');

  console.log("Creating payment for:", { amount, description, metadata });

  if (!shopId || !secretKey) {
    console.error("YooKassa keys missing in environment");
    return res.status(500).json({ error: "YooKassa is not configured on the server. Please add YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY to Secrets." });
  }

  try {
    const yooCheckout = getCheckout();
    if (!yooCheckout) throw new Error("Failed to initialize YooKassa checkout");

    const payment = await yooCheckout.createPayment({
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
    
    console.log("Payment created successfully:", payment.id);
    res.json({ confirmation_url: payment.confirmation.confirmation_url });
  } catch (error: any) {
    console.error("YooKassa Create Payment Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  const event = req.body;
  console.log("YooKassa Webhook Event:", JSON.stringify(event));
  
  if (event.event === 'payment.succeeded') {
    const payment = event.object;
    const { userId, articleId, type } = payment.metadata || {};
    
    if (!userId) {
      console.error("No userId in payment metadata");
      return res.sendStatus(200);
    }

    console.log(`Payment succeeded for user ${userId}, type: ${type}, id: ${articleId}`);
    
    try {
      const userRef = db.collection('users').doc(userId);
      
      if (type === 'subscription') {
        await userRef.update({
          isSubscribed: true,
          subscriptionDate: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Updated subscription for user ${userId}`);
      } else if (type === 'article' && articleId) {
        await userRef.update({
          purchasedArticles: admin.firestore.FieldValue.arrayUnion(articleId)
        });
        console.log(`Added article ${articleId} to user ${userId}`);
      }
    } catch (error) {
      console.error("Error updating Firestore from webhook:", error);
    }
  }
  
  res.sendStatus(200);
});

// Gemini Proxy Routes
app.post("/api/chat", async (req, res, next) => {
  try {
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
    console.log("Chat request received:", { model, messageLength: message?.length });
    
    let apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Gemini history MUST start with 'user' role.
    // If our history starts with 'model' (initial message), we prepend a dummy user message.
    let formattedHistory = (history || []).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.unshift({ role: 'user', parts: [{ text: 'Начнем диалог.' }] });
    }

    const chat = ai.chats.create({
      model: model || "gemini-3-flash-preview",
      config: { systemInstruction },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/generate", async (req, res, next) => {
  try {
    const { prompt, config, apiKey: clientApiKey } = req.body;
    console.log("Generate request received:", { promptLength: prompt?.length });
    
    let apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: config || { responseMimeType: "application/json" }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("UNHANDLED SERVER ERROR:", err);
  res.status(500).json({ error: err.message || "A server error occurred" });
});

// For Vercel, we export the app instance
export default app;
