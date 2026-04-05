import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Lazy load heavy dependencies to avoid top-level crashes
let admin: any;
let getFirestore: any;
let YooCheckout: any;

async function loadDependencies() {
  if (!admin) {
    admin = (await import('firebase-admin')).default;
    getFirestore = (await import('firebase-admin/firestore')).getFirestore;
  }
  if (!YooCheckout) {
    const yookassa = await import('yookassa');
    YooCheckout = yookassa.YooCheckout || yookassa.default?.YooCheckout || yookassa.default;
    if (!YooCheckout) {
      console.error("Failed to find YooCheckout in yookassa package:", yookassa);
    }
  }
}

let _db: any = null;
async function getDb() {
  if (_db) return _db;
  await loadDependencies();

  try {
    if (!admin.apps.length) {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      let serviceAccount = null;
      
      if (serviceAccountStr && serviceAccountStr.trim()) {
        try {
          serviceAccount = JSON.parse(serviceAccountStr);
        } catch (e) {
          console.error("FIREBASE_SERVICE_ACCOUNT parse error:", e);
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'the-sentinel-490819'
        });
      }
    }
    
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-869f31c2-5b90-4d7e-8ae0-6d60d83bc4b5';
    const appInstance = admin.apps[0];
    _db = getFirestore(appInstance, databaseId);
    return _db;
  } catch (error) {
    console.error("Firestore init error:", error);
    throw error;
  }
}

// Ping endpoint
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", env: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')) });
});

// YooKassa
let _checkout: any = null;
async function getCheckout() {
  if (_checkout) return _checkout;
  await loadDependencies();
  
  // Hardcoded fallbacks for the live site where env vars might be missing
  const shopId = (process.env.YOOKASSA_SHOP_ID || '1315942').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || 'live_vMzEd9KfPVlsS7UUmPgfT9hklysnjgfgvzE9bZThxSg').trim();
  
  if (shopId && secretKey) {
    try {
      _checkout = new YooCheckout({ shopId, secretKey });
      console.log("YooKassa checkout initialized with ShopID:", shopId);
    } catch (e) {
      console.error("Failed to initialize YooKassa checkout instance:", e);
    }
  }
  return _checkout;
}

// Payment configuration status
app.get("/api/payments/status", async (req, res) => {
  const shopId = (process.env.YOOKASSA_SHOP_ID || '1315942').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || 'live_vMzEd9KfPVlsS7UUmPgfT9hklysnjgfgvzE9bZThxSg').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  
  res.json({
    yookassa: {
      configured: !!(shopId && secretKey),
      shopIdPresent: !!process.env.YOOKASSA_SHOP_ID,
      secretKeyPresent: !!process.env.YOOKASSA_SECRET_KEY,
      usingFallback: !process.env.YOOKASSA_SHOP_ID,
      shopId: shopId,
      shopIdLength: shopId.length
    },
    gemini: {
      configured: !!geminiKey,
      keyLength: geminiKey.length
    },
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/payments/create", async (req, res) => {
  try {
    const { amount, description, metadata, return_url } = req.body;
    const checkout = await getCheckout();
    
    if (!checkout) {
      const shopId = (process.env.YOOKASSA_SHOP_ID || '1315942').trim();
      const secretKey = (process.env.YOOKASSA_SECRET_KEY || 'live_vMzEd9KfPVlsS7UUmPgfT9hklysnjgfgvzE9bZThxSg').trim();
      let missing = [];
      if (!shopId) missing.push("YOOKASSA_SHOP_ID");
      if (!secretKey) missing.push("YOOKASSA_SECRET_KEY");
      
      console.error("YooKassa not configured: missing", missing);
      return res.status(500).json({ 
        error: `ЮKassa не настроена. Отсутствуют ключи: ${missing.join(', ')}. Добавьте их в раздел Secrets.` 
      });
    }

    console.log("Creating payment for amount:", amount, "description:", description);
    const payment = await checkout.createPayment({
      amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
      payment_method_data: { type: 'bank_card' },
      confirmation: { type: 'redirect', return_url: return_url || 'https://vera.plus' },
      description,
      metadata,
      capture: true
    });
    
    console.log("Payment created successfully:", payment.id);
    if (payment.confirmation && payment.confirmation.confirmation_url) {
      res.json({ confirmation_url: payment.confirmation.confirmation_url });
    } else {
      console.error("Payment created but no confirmation URL found:", payment);
      res.status(500).json({ error: "No confirmation URL returned from YooKassa." });
    }
  } catch (error: any) {
    console.error("Payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  try {
    const event = req.body;
    if (event.event === 'payment.succeeded') {
      const { userId, articleId, type } = event.object.metadata || {};
      if (userId) {
        const db = await getDb();
        const userRef = db.collection('users').doc(userId);
        if (type === 'subscription') {
          await userRef.update({ isSubscribed: true, subscriptionDate: new Date() });
        } else if (type === 'article' && articleId) {
          await userRef.update({ purchasedArticles: admin.firestore.FieldValue.arrayUnion(articleId) });
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(200);
  }
});

// Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) return res.status(500).json({ error: "API key missing." });

    const ai = new GoogleGenAI({ apiKey });
    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.unshift({ role: 'user', parts: [{ text: 'Начнем.' }] });
    }

    const chat = ai.chats.create({
      model: model || "gemini-3-flash-preview",
      config: { systemInstruction },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, config, apiKey: clientApiKey } = req.body;
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    
    if (!apiKey) return res.status(500).json({ error: "API key missing." });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: config || { responseMimeType: "application/json" }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
