
console.log("YOOKASSA_SHOP_ID:", process.env.YOOKASSA_SHOP_ID ? "PRESENT" : "MISSING");
console.log("YOOKASSA_SECRET_KEY:", process.env.YOOKASSA_SECRET_KEY ? "PRESENT" : "MISSING");

const geminiKey = process.env.GEMINI_API_KEY || "";
const viteGeminiKey = process.env.VITE_GEMINI_API_KEY || "";

console.log("GEMINI_API_KEY:", geminiKey ? `PRESENT (Ends with: ${geminiKey.substring(geminiKey.length - 4)})` : "MISSING");
console.log("VITE_GEMINI_API_KEY:", viteGeminiKey ? `PRESENT (Ends with: ${viteGeminiKey.substring(viteGeminiKey.length - 4)})` : "MISSING");
