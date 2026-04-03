import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { YooCheckout } from 'yookassa';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Lazy Firebase initialization to prevent top-level crashes
let _db: admin.firestore.Firestore | null = null;

function getDb() {
  if (_db) return _db;

  try {
    console.log("Initializing Firebase Admin...");
    let appInstance;
    if (!admin.apps.length) {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      let serviceAccount = null;
      
      if (serviceAccountStr && serviceAccountStr.trim()) {
        try {
          serviceAccount = JSON.parse(serviceAccountStr);
          console.log("Service account parsed successfully.");
        } catch (e) {
          console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON:", e);
        }
      }

      if (serviceAccount) {
        appInstance = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase initialized with service account.");
      } else {
        appInstance = admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'the-sentinel-490819'
        });
        console.log("Firebase initialized with project ID:", process.env.VITE_FIREBASE_PROJECT_ID || 'the-sentinel-490819');
      }
    } else {
      appInstance = admin.apps[0]!;
      console.log("Using existing Firebase app instance.");
    }
    
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-869f31c2-5b90-4d7e-8ae0-6d60d83bc4b5';
    console.log("Connecting to Firestore database:", databaseId);
    _db = getFirestore(appInstance, databaseId);
    return _db!;
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    throw error;
  }
}

const app = express();
app.use(express.json());

// Ping endpoint for health checks
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// YooKassa Configuration
const getTrimmedEnv = (key: string) => (process.env[key] || '').trim();

let _checkout: YooCheckout | null = null;

const getCheckout = () => {
  if (!_checkout) {
    const shopId = getTrimmedEnv('YOOKASSA_SHOP_ID');
    const secretKey = getTrimmedEnv('YOOKASSA_SECRET_KEY');
    if (shopId && secretKey) {
      _checkout = new YooCheckout({ shopId, secretKey });
    }
  }
  return _checkout;
};

// YooKassa Payment Routes
app.post("/api/payments/create", async (req, res) => {
  try {
    const { amount, description, metadata, return_url } = req.body;
    
    const shopId = getTrimmedEnv('YOOKASSA_SHOP_ID');
    const secretKey = getTrimmedEnv('YOOKASSA_SECRET_KEY');

    console.log("Creating payment for:", { amount, description, metadata });

    if (!shopId || !secretKey) {
      return res.status(500).json({ error: "YooKassa is not configured on the server." });
    }

    const checkout = getCheckout();
    if (!checkout) throw new Error("Failed to initialize YooKassa checkout");

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
    console.error("Payment Create Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  try {
    const event = req.body;
    console.log("Webhook Event:", JSON.stringify(event));
    
    if (event.event === 'payment.succeeded') {
      const payment = event.object;
      const { userId, articleId, type } = payment.metadata || {};
      
      if (userId) {
        const db = getDb();
        const userRef = db.collection('users').doc(userId);
        
        if (type === 'subscription') {
          await userRef.update({
            isSubscribed: true,
            subscriptionDate: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (type === 'article' && articleId) {
          await userRef.update({
            purchasedArticles: admin.firestore.FieldValue.arrayUnion(articleId)
          });
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(200); // Always return 200 to YooKassa
  }
});

// Gemini Proxy Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
    let apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, config, apiKey: clientApiKey } = req.body;
    let apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: config || { responseMimeType: "application/json" }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Generate Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: err.message || "A server error occurred" });
});

export default app;
