import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, Feedback, ResponseOption } from "../types";

// Helper to get the API key from various possible sources
const getApiKey = () => {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
         process.env.GEMINI_API_KEY || 
         process.env.VITE_GEMINI_API_KEY ||
         process.env.GOOGLE_API_KEY ||
         '';
  const trimmedKey = key.trim();
  // Check if it's a placeholder
  if (trimmedKey === 'MY_GEMINI_API_KEY' || !trimmedKey) return '';
  return trimmedKey;
};

export async function getChatResponse(
  modelName: string,
  systemInstruction: string,
  history: Message[],
  userInput: string,
  providedApiKey?: string
): Promise<string> {
  // If we have a provided key, we might be in a special mode, 
  // but normally we use the server proxy to bypass regional blocks.
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        systemInstruction,
        history,
        message: userInput,
        apiKey: providedApiKey
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error (Status ${response.status}):`, text);
      let errorMessage = "Ошибка сервера при получении ответа.";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        if (text.includes('FUNCTION_INVOCATION_FAILED')) {
          errorMessage = 'Серверная функция не смогла запуститься (FUNCTION_INVOCATION_FAILED). Проверьте логи сервера или настройки Secrets.';
        } else {
          errorMessage = `Сервер вернул ошибку (не JSON): ${text.substring(0, 100)}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.text || "Извините, я не смог сформулировать ответ.";
  } catch (error: any) {
    console.error("Proxy Error:", error);
    throw error;
  }
}

export async function getResponseOptions(
  systemInstruction: string,
  history: Message[],
  providedApiKey?: string
): Promise<ResponseOption[]> {
  const prompt = `
    Системная инструкция собеседника: ${systemInstruction}
    
    История диалога:
    ${history.map(m => `${m.role === 'user' ? 'Пользователь' : 'Собеседник'}: ${m.text}`).join('\n')}
    
    На основе текущего диалога и роли собеседника, предложи 3 варианта ответа для пользователя.
    Один вариант должен быть теологически верным и апологетически сильным (effective), один нейтральным и один ошибочным или слабым (ineffective).
    Для каждого варианта напиши краткое объяснение, почему он такой с точки зрения христианской апологетики.
    Также оцени каждый вариант по метрикам от 1 до 10.
    
    Верни ответ строго в формате JSON:
    [
      {
        "text": "текст ответа",
        "explanation": "объяснение",
        "type": "effective" | "neutral" | "ineffective",
        "metrics": {
          "theologicalAccuracy": число,
          "logic": число,
          "empathy": число,
          "scriptureUsage": число
        }
      },
      ...
    ]
  `;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, apiKey: providedApiKey })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error (Status ${response.status}):`, text);
      let errorMessage = "Ошибка сервера при генерации вариантов.";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Сервер вернул ошибку: ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let text = data.text || "";
    
    if (!text) {
      throw new Error("Модель вернула пустой ответ при генерации вариантов.");
    }
    
    // Clean up markdown code blocks if present
    if (text.includes("```")) {
      text = text.replace(/```json\n?|```\n?/g, "").trim();
    }
    
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Ответ модели не является массивом JSON.");
      }
      return parsed as ResponseOption[];
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", text);
      // Fallback: try to find the first [ and last ]
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        try {
          return JSON.parse(text.substring(start, end + 1)) as ResponseOption[];
        } catch (e2) {
          console.error("Second attempt at parsing failed:", e2);
        }
      }
      throw new Error(`Ошибка разбора JSON ответа модели: ${text.substring(0, 50)}...`);
    }
  } catch (e: any) {
    console.error("Error getting response options:", e);
    throw e; // Don't swallow error, let App.tsx handle it
  }
}

export async function getFeedback(
  history: Message[],
  providedApiKey?: string
): Promise<Feedback> {
  const prompt = `
    Ты — строгий эксперт в области христианской апологетики и систематического богословия. 
    Твоя задача — провести безжалостный и глубокий разбор диалога пользователя (user).
    
    Критерии оценки:
    1. Библейская точность (theologicalAccuracy): Насколько утверждения соответствуют Писанию? Нет ли ересей, подмены понятий или "розового христианства"?
    2. Логика и аргументация (logic): Насколько доводы убедительны? Нет ли логических дыр, на которые скептик может легко наступить?
    3. Использование Писания (scriptureUsage): Уместны ли цитаты? Не вырваны ли они из контекста?
    4. Эмпатия и любовь (empathy): Сохраняется ли дух Христовой любви, или это просто сухая интеллектуальная победа?
    
    В разборе ОБЯЗАТЕЛЬНО укажи:
    - Теологические ошибки или неточности.
    - Слабые места в аргументации, которые собеседник мог бы использовать против пользователя.
    - Советы по более глубокому использованию библейского контекста.
    
    Диалог:
    ${history.map(m => `${m.role === 'user' ? 'Пользователь' : 'Собеседник'}: ${m.text}`).join('\n')}
    
    Верни ответ строго в формате JSON:
    {
      "score": число от 1 до 10 (будь строг, 10 — это уровень Клайва Льюиса),
      "strengths": ["строка1", "строка2", "строка3"],
      "improvements": ["конкретная теологическая или логическая ошибка 1", "ошибка 2", "ошибка 3"],
      "summary": "глубокое резюме с упором на суть свидетельства",
      "metrics": {
        "theologicalAccuracy": число 1-10,
        "logic": число 1-10,
        "scriptureUsage": число 1-10,
        "empathy": число 1-10,
        "speed": число (имитация в сек)
      }
    }
  `;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, apiKey: providedApiKey })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error (Status ${response.status}):`, text);
      let errorMessage = "Ошибка сервера при анализе диалога.";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Сервер вернул ошибку: ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let text = data.text || "";
    
    if (!text) {
      throw new Error("Модель вернула пустой ответ при анализе.");
    }
    
    // Clean up markdown code blocks if present
    if (text.includes("```")) {
      text = text.replace(/```json\n?|```\n?/g, "").trim();
    }
    
    try {
      return JSON.parse(text) as Feedback;
    } catch (parseError) {
      console.error("JSON Parse Error in getFeedback. Raw text:", text);
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          return JSON.parse(text.substring(start, end + 1)) as Feedback;
        } catch (e2) {
          console.error("Second attempt at parsing feedback failed:", e2);
        }
      }
      throw new Error(`Ошибка разбора JSON ответа модели при анализе: ${text.substring(0, 50)}...`);
    }
  } catch (e: any) {
    console.error("Error getting feedback:", e);
    throw e;
  }
}
