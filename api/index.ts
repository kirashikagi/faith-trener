import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

// Load Firebase config from file as a fallback/source of truth
let firebaseAppletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json:", e);
}

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

// Diagnostic: Log all defined routes
app.get("/api/routes-list", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods).join(',').toUpperCase()} ${handler.route.path}`);
        }
      });
    }
  });
  res.json({ routes });
});

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
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId;
        if (!projectId) {
          throw new Error("Firebase Project ID not found in environment or config file.");
        }
        admin.initializeApp({ projectId });
      }
    }
    
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;
    const appInstance = admin.apps[0];
    _db = getFirestore(appInstance, databaseId);
    return _db;
  } catch (error) {
    console.error("Firestore init error:", error);
    throw error;
  }
}

// Auth Proxy to bypass network blocks in restricted regions (like Russia)
app.post("/api/auth/proxy", async (req, res) => {
  try {
    const { action, email, password } = req.body;
    const apiKey = process.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey;
    await loadDependencies();

    if (!apiKey) {
      return res.status(500).json({ error: "Firebase API Key is not configured on the server." });
    }

    if (action === 'signIn') {
      // 1. Verify credentials via Identity Toolkit REST API
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });

      const data: any = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      // 2. Credentials valid, generate a Custom Token via Admin SDK
      // This token can be used by the client SDK even if identitytoolkit is blocked on the client
      const customToken = await admin.auth().createCustomToken(data.localId);
      res.json({ customToken, user: data });
    } else if (action === 'signUp') {
      try {
        // Create user via Admin SDK
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: email.split('@')[0]
        });
        
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        res.json({ customToken, uid: userRecord.uid, email: userRecord.email });
      } catch (e: any) {
        console.error("signUp admin error:", e);
        res.status(400).json({ error: e.message, code: e.code });
      }
    } else {
      return res.status(400).json({ error: "Invalid auth action" });
    }
  } catch (error: any) {
    console.error("Auth Proxy internal error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), env: !!process.env.YOOKASSA_SHOP_ID });
});

// Ping endpoint
app.get("/api/payments/test-config", async (req, res) => {
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();
  
  res.json({
    shopIdPresent: !!shopId,
    secretKeyPresent: !!secretKey,
    shopIdLength: shopId.length,
    secretKeyPrefix: secretKey ? secretKey.substring(0, 5) + '...' : 'none',
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => k.startsWith('YOOKASSA'))
  });
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
      console.log("YooKassa checkout initialized.");
    } catch (e) {
      console.error("Failed to initialize YooKassa checkout instance:", e);
    }
  }
  return _checkout;
}

// Payment configuration status
app.get("/api/payments/status", async (req, res) => {
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  
  res.json({
    yookassa: {
      configured: !!(shopId && secretKey),
      shopIdPresent: !!shopId,
      secretKeyPresent: !!secretKey,
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
    console.log("Payment creation request received:", { amount, description, metadata, return_url });
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Некорректная сумма платежа" });
    }

    const checkout = await getCheckout();
    
    if (!checkout) {
      const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
      const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();
      let missing = [];
      if (!shopId) missing.push("YOOKASSA_SHOP_ID");
      if (!secretKey) missing.push("YOOKASSA_SECRET_KEY");
      
      console.error("YooKassa not configured: missing", missing);
      return res.status(500).json({ 
        error: `ЮKassa не настроена. Отсутствуют ключи: ${missing.join(', ')}. Добавьте их в раздел Secrets.` 
      });
    }

    const value = Number(amount).toFixed(2);
    console.log(`Creating YooKassa payment for amount: ${value} RUB, description: ${description}`);
    
    const payment = await checkout.createPayment({
      amount: { value, currency: 'RUB' },
      payment_method_data: { type: 'bank_card' },
      confirmation: { type: 'redirect', return_url: return_url || 'https://vera.plus' },
      description: description || 'Оплата услуг',
      metadata,
      capture: true
    });
    
    console.log("YooKassa payment created successfully. ID:", payment.id);
    
    if (payment.confirmation && payment.confirmation.confirmation_url) {
      res.json({ confirmation_url: payment.confirmation.confirmation_url });
    } else {
      console.error("Payment created but no confirmation URL found. Response:", JSON.stringify(payment));
      res.status(500).json({ error: "ЮKassa не вернула ссылку для подтверждения платежа." });
    }
  } catch (error: any) {
    console.error("YooKassa Payment Error:", error);
    res.status(500).json({ 
      error: error.message || "Произошла непредвиденная ошибка при создании платежа" 
    });
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

// Gemini Chat
app.post("/api/chat", async (req, res) => {
  const { model, systemInstruction, history, message, apiKey: clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const source = clientApiKey ? 'Manual (User Settings)' : (process.env.GEMINI_API_KEY ? 'Secrets (GEMINI_API_KEY)' : (process.env.VITE_GEMINI_API_KEY ? 'Secrets (VITE_GEMINI_API_KEY)' : 'Default/None'));

  try {
    if (!apiKey) return res.status(500).json({ error: "API key missing. Please add GEMINI_API_KEY to your secrets." });

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct contents for multi-turn chat
    const contents = (history || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));
    
    // Handle model-first history
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Привет' }] });
    }

    const chat = ai.chats.create({
      model: model || "gemini-1.5-flash",
      history: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    });

    const response = await chat.sendMessage(message);
    const text = response.text;

    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    res.json({ text });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    let status = 500;
    let message = error.message || "Unknown AI error";
    
    // Categorize common Gemini errors
    if (message.includes("API_KEY_INVALID")) {
      const keyHint = apiKey ? ` (Ключ: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}, Источник: ${source})` : "";
      message = "Неверный API ключ Gemini. " + (clientApiKey ? "Пожалуйста, проверьте правильность ключа в настройках приложения." : "Пожалуйста, обновите GEMINI_API_KEY в разделе Secrets и нажмите 'Apply changes'.") + keyHint;
      status = 401;
    } else if (message.includes("expired") || message.includes("EXPIRED")) {
      message = "Срок действия API ключа истек. Пожалуйста, обновите ключ в Google AI Studio.";
      status = 401;
    } else if (message.includes("quota") || message.includes("429") || message.includes("QUOTA_EXCEEDED")) {
      message = "Лимит бесплатных запросов исчерпан (Quota Exceeded). Пожалуйста, подождите или используйте платный ключ.";
      status = 429;
    } else if (message.includes("region") || message.includes("not available")) {
      message = "К сожалению, сервис Gemini недоступен в вашем регионе через этот прокси.";
      status = 403;
    }
    
    res.status(status).json({ error: message, originalError: error.message });
  }
});

app.post("/api/generate", async (req, res) => {
  const { prompt, config, apiKey: clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const source = clientApiKey ? 'Manual (User Settings)' : (process.env.GEMINI_API_KEY ? 'Secrets (GEMINI_API_KEY)' : (process.env.VITE_GEMINI_API_KEY ? 'Secrets (VITE_GEMINI_API_KEY)' : 'Default/None'));

  try {
    if (!apiKey) return res.status(500).json({ error: "API key missing. Please add GEMINI_API_KEY to your secrets." });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        responseMimeType: config?.responseMimeType || "text/plain",
        temperature: config?.temperature || 0.7,
        topP: config?.topP || 0.95,
        topK: config?.topK || 40
      }
    });

    if (!response.text) {
      throw new Error("Model returned an empty response.");
    }

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Generate API Error:", error);
    
    let status = 500;
    let message = error.message || "Unknown AI error";
    
    if (message.includes("API_KEY_INVALID")) {
      const keyHint = apiKey ? ` (Ключ: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}, Источник: ${source})` : "";
      message = "Неверный API ключ. Пожалуйста, проверьте правильность ключа в настройках или Secrets." + keyHint + ". Убедитесь, что вы нажали \"Apply changes\" в разделе Secrets.";
      status = 401;
    } else if (message.includes("expired")) {
      message = "Срок действия API ключа истек.";
      status = 401;
    } else if (message.includes("quota") || message.includes("429")) {
      message = "Лимит квоты исчерпан.";
      status = 429;
    }
    
    res.status(status).json({ error: message });
  }
});

// Server-side profile proxy to bypass VPN blocks in Russia
app.get("/api/users/:uid", async (req, res) => {
  try {
    const db = await getDb();
    const docRef = db.collection('users').doc(req.params.uid);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(doc.data());
  } catch (error: any) {
    console.error("Profile proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for /api/* to help debug 404/405
app.all("/api/*", (req, res) => {
  console.log(`[404/405] Request for ${req.method} ${req.url} was not handled by any route.`);
  res.status(404).json({ error: `Эндпоинт ${req.method} ${req.url} не найден на этом сервере.` });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
