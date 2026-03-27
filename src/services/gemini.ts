import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, Feedback, ResponseOption } from "../types";

// Helper to get the API key from various possible sources
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || 
         process.env.VITE_GEMINI_API_KEY ||
         process.env.GOOGLE_API_KEY ||
         (import.meta as any).env?.VITE_GEMINI_API_KEY || 
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Ошибка сервера при получении ответа.");
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
    Один вариант должен быть эффективным (спокойным, аргументированным), один нейтральным и один неэффективным (агрессивным или пассивным).
    Для каждого варианта напиши краткое объяснение, почему он такой.
    Также оцени каждый вариант по метрикам от 1 до 10.
    
    Верни ответ строго в формате JSON:
    [
      {
        "text": "текст ответа",
        "explanation": "объяснение",
        "type": "effective" | "neutral" | "ineffective",
        "metrics": {
          "politeness": число,
          "tact": число,
          "persuasion": число,
          "respect": число
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Ошибка сервера при генерации вариантов.");
    }

    const data = await response.json();
    let text = data.text || "[]";
    
    // Clean up markdown code blocks if present
    if (text.includes("```")) {
      text = text.replace(/```json\n?|```\n?/g, "").trim();
    }
    
    try {
      return JSON.parse(text) as ResponseOption[];
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
      throw parseError;
    }
  } catch (e) {
    console.error("Error getting response options:", e);
    return [];
  }
}

export async function getFeedback(
  history: Message[],
  providedApiKey?: string
): Promise<Feedback> {
  const prompt = `
    Проанализируй следующий диалог на тему веры. 
    Оцени ответы пользователя (роль: user) по 10-балльной шкале. 
    Выдели 3 сильные стороны его аргументации и 3 области для улучшения. 
    Оцени средние метрики за весь диалог (от 1 до 10).
    Рассчитай среднюю скорость ответа (имитируй на основе сложности ответов, если нет данных, дай случайное реалистичное число в секундах).
    
    Диалог:
    ${history.map(m => `${m.role === 'user' ? 'Пользователь' : 'Собеседник'}: ${m.text}`).join('\n')}
    
    Верни ответ строго в формате JSON:
    {
      "score": число от 1 до 10,
      "strengths": ["строка1", "строка2", "строка3"],
      "improvements": ["строка1", "строка2", "строка3"],
      "summary": "краткое резюме",
      "metrics": {
        "politeness": число,
        "tact": число,
        "persuasion": число,
        "respect": number,
        "speed": число
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Ошибка сервера при анализе диалога.");
    }

    const data = await response.json();
    let text = data.text || "{}";
    
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
      throw parseError;
    }
  } catch (e) {
    console.error("Error getting feedback:", e);
    return {
      score: 0,
      strengths: ["Не удалось проанализировать"],
      improvements: ["Попробуйте еще раз"],
      summary: "Ошибка при анализе диалога."
    };
  }
}
