/**
 * AI SDK 封装层 — 兼容 DeepSeek / OpenAI
 * 使用 generateText + JSON 解析替代 generateObject（DeepSeek 不支持 JSON Schema 模式）
 */
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { z } from 'zod';

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.apib.ai/v1',
});

// 使用 .chat() 强制走 Chat Completions API
// DeepSeek 不支持 OpenAI Responses API（/responses），只支持 /chat/completions
const AI_CONFIG = {
  model: openaiProvider.chat(process.env.OPENAI_MODEL || 'gpt-5'),
  defaultTemperature: 0.3,
  creativeTemperature: 0.7,
  maxRetries: 2,
};

export interface StructuredResult<T> {
  result: T | null;
  error: string | null;
  attempts: number;
  promptVersion: string;
  recoverable: boolean;
}

export interface AICallMetadata {
  promptId: string;
  promptVersion: string;
  model: string;
  temperature: number;
  attempts: number;
  validationStatus: 'success' | 'retry_success' | 'failed';
  timestamp: string;
}

function extractJson(text: string): string {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  return cleaned;
}

function describeSchema(schema: z.ZodSchema<unknown>): string {
  try {
    const def = (schema as unknown as { _def?: { shape?: Record<string, { description?: string }> } })._def;
    const shape = def?.shape;
    if (!shape) return '输出纯 JSON 对象，不要用 markdown 代码块包裹。';
    const fields = Object.entries(shape)
      .map(([key, s]) => `"${key}": ${(s as { description?: string }).description || s.constructor.name || 'value'}`)
      .join(',\n    ');
    return `输出纯 JSON 对象，包含以下字段：\n{\n    ${fields}\n}\n不要用 markdown 代码块包裹。`;
  } catch {
    return '输出纯 JSON 对象，不要用 markdown 代码块包裹。';
  }
}

export async function generateStructured<T>(
  promptId: string,
  promptVersion: string,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>,
  options?: { temperature?: number },
): Promise<StructuredResult<T>> {
  let lastError: string | null = null;
  let currentMessage = userMessage;
  const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
  const fullSystem = systemPrompt + '\n\n' + describeSchema(schema);

  for (let attempt = 0; attempt < AI_CONFIG.maxRetries; attempt++) {
    try {
      const { text } = await generateText({
        model: AI_CONFIG.model,
        system: fullSystem,
        prompt: currentMessage,
        temperature,
      });

      const json = extractJson(text);
      let parsed: unknown;
      try { parsed = JSON.parse(json); } catch {
        lastError = `JSON parse failed. Response: ${text.slice(0, 200)}`;
        if (attempt === 0) currentMessage += `\n\n[SYSTEM] 上一次输出不是合法 JSON。请只输出纯 JSON。`;
        continue;
      }

      const validation = schema.safeParse(parsed);
      if (validation.success) {
        return { result: validation.data, error: null, attempts: attempt + 1, promptVersion, recoverable: true };
      }

      lastError = validation.error.message;
      if (attempt === 0) currentMessage += `\n\n[SYSTEM] 校验失败：${lastError}\n请严格按照字段要求输出。`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt === 0) currentMessage += `\n\n[SYSTEM ERROR] ${lastError}`;
    }
  }

  console.error(`[AI] Failed ${promptId}`, { attempts: AI_CONFIG.maxRetries, error: lastError });
  return { result: null, error: lastError, attempts: AI_CONFIG.maxRetries, promptVersion, recoverable: true };
}

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number },
): Promise<string> {
  const { text } = await generateText({
    model: AI_CONFIG.model,
    system: systemPrompt,
    prompt: userMessage,
    temperature: options?.temperature ?? AI_CONFIG.creativeTemperature,
  });
  return text;
}

export function createAIMetadata(
  promptId: string, promptVersion: string, attempts: number, success: boolean,
): AICallMetadata {
  return {
    promptId, promptVersion,
    model: process.env.OPENAI_MODEL || 'deepseek-chat',
    temperature: AI_CONFIG.defaultTemperature,
    attempts,
    validationStatus: success ? (attempts === 1 ? 'success' : 'retry_success') : 'failed',
    timestamp: new Date().toISOString(),
  };
}
