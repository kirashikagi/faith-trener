import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Absolute most permissive CORS policy for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

// Payment configuration status
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// YooKassa
let _checkout: any = null;
async function getCheckout() {
  if (_checkout) return _checkout;
  await loadDependencies();
  
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();
  
  if (shopId && secretKey) {
    try {
      _checkout = new YooCheckout({ shopId, secretKey });
    } catch (e) {
      console.error("Failed to initialize YooKassa checkout instance:", e);
    }
  }
  return _checkout;
}

app.post("/api/payments/create", async (req, res) => {
  try {
    const { amount, description, metadata, return_url } = req.body;
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Некорректная сумма платежа" });
    }

    const checkout = await getCheckout();
    if (!checkout) return res.status(500).json({ error: "ЮKassa не настроена." });

    const value = Number(amount).toFixed(2);
    const payment = await checkout.createPayment({
      amount: { value, currency: 'RUB' },
      payment_method_data: { type: 'bank_card' },
      confirmation: { type: 'redirect', return_url: return_url || 'https://vera.plus' },
      description: description || 'Оплата услуг',
      metadata,
      capture: true
    });
    
    if (payment.confirmation && payment.confirmation.confirmation_url) {
      res.json({ confirmation_url: payment.confirmation.confirmation_url });
    } else {
      res.status(500).json({ error: "ЮKassa не вернула ссылку." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Ошибка при создании платежа" });
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
    res.sendStatus(200);
  }
});

// Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    if (!apiKey) return res.status(500).json({ error: "API key missing." });

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ 
      model: model || "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });

    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const chat = modelInstance.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ text: response.text() });
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const generationConfig = {
      responseMimeType: config?.responseMimeType === "application/json" ? "application/json" : "text/plain",
      temperature: config?.temperature || 0.7,
      topP: config?.topP || 0.95,
      topK: config?.topK || 40,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });

    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Firestore Proxy Endpoints (to bypass VPN blocks in Russia)
app.get("/api/users/:uid", async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(doc.data());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users/:uid", async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('users').doc(req.params.uid).set(req.body, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:uid", async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('users').doc(req.params.uid).update(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try {
    const db = await getDb();
    const usersSnapshot = await db.collection('users').get();
    const feedbackSnapshot = await db.collection('feedback').get();
    const sessionsSnapshot = await db.collection('sessions').get();
    
    res.json({
      users: usersSnapshot.size,
      feedback: feedbackSnapshot.size,
      sessions: sessionsSnapshot.size
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/feedback", async (req, res) => {
  try {
    const db = await getDb();
    const snapshot = await db.collection('feedback')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const docs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    }));
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const data = req.body;
    if (!data.uid) return res.status(400).json({ error: "uid is required" });
    const db = await getDb();
    const result = await db.collection('sessions').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: result.id });
  } catch (error: any) {
    console.error("Save session error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid is required" });
    const db = await getDb();
    const snapshot = await db.collection('sessions')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const docs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    });
    res.json(docs);
  } catch (error: any) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const data = req.body;
    if (!data.uid) return res.status(400).json({ error: "uid is required" });
    const db = await getDb();
    const result = await db.collection('feedback').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: result.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Эндпоинт ${req.method} ${req.url} не найден.` });
});

export default app;
