/**
 * AI SDK 封装层 — 项目中唯一可直接调用模型供应商的模块
 *
 * 职责：
 * - 结构化输出（Zod Schema 校验 + 自动重试）
 * - 自由文本生成
 * - 统一错误处理与日志
 * - 供应商无关（仅通过 Vercel AI SDK 抽象）
 *
 * 业务域模块不得直接导入具体模型 SDK
 */

import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { z } from 'zod';

// ============================================================
// 配置
// ============================================================

const AI_CONFIG = {
  model: openai(process.env.OPENAI_MODEL || 'deepseek-chat'),
  defaultTemperature: 0.3, // 规划类任务使用低随机性
  creativeTemperature: 0.7, // 复盘洞察可以使用稍高随机性
  maxRetries: 2,
  timeout: 30_000, // 30秒超时
};

// ============================================================
// 结构化输出结果
// ============================================================

export interface StructuredResult<T> {
  result: T | null;
  error: string | null;
  attempts: number;
  promptVersion: string;
  recoverable: boolean;
}

// ============================================================
// AI 调用元数据（用于日志追踪，不记录完整 prompt/user 内容）
// ============================================================

export interface AICallMetadata {
  promptId: string;
  promptVersion: string;
  model: string;
  temperature: number;
  attempts: number;
  validationStatus: 'success' | 'retry_success' | 'failed';
  timestamp: string;
}

// ============================================================
// 结构化输出（带 Zod 校验 + 自动重试）
// ============================================================

export async function generateStructured<T>(
  promptId: string,
  promptVersion: string,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>,
  options?: {
    temperature?: number;
  },
): Promise<StructuredResult<T>> {
  let lastError: string | null = null;
  let currentMessage = userMessage;
  const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;

  for (let attempt = 0; attempt < AI_CONFIG.maxRetries; attempt++) {
    try {
      const { object } = await generateObject({
        model: AI_CONFIG.model,
        schema,
        system: systemPrompt,
        prompt: currentMessage,
        temperature,
      });

      // 成功
      return {
        result: object as T,
        error: null,
        attempts: attempt + 1,
        promptVersion,
        recoverable: true,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);

      // 第一次失败时，在 user message 后追加错误信息再重试
      if (attempt === 0) {
        currentMessage += `\n\n[SYSTEM ERROR] 上一次输出校验失败：${lastError}\n请严格按照要求的 JSON Schema 格式输出，确保所有必填字段完整、类型正确。`;
      }
    }
  }

  // 两次重试均失败
  console.error(`[AI] Structured generation failed for ${promptId}`, {
    promptVersion,
    attempts: AI_CONFIG.maxRetries,
    error: lastError,
  });

  return {
    result: null,
    error: lastError,
    attempts: AI_CONFIG.maxRetries,
    promptVersion,
    recoverable: true, // 允许用户手动继续
  };
}

// ============================================================
// 自由文本生成（用于追问、摘要、洞察等非结构化输出）
// ============================================================

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  options?: {
    temperature?: number;
  },
): Promise<string> {
  const { text } = await generateText({
    model: AI_CONFIG.model,
    system: systemPrompt,
    prompt: userMessage,
    temperature: options?.temperature ?? AI_CONFIG.creativeTemperature,
  });

  return text;
}

// ============================================================
// 创建 AI 调用元数据
// ============================================================

export function createAIMetadata(
  promptId: string,
  promptVersion: string,
  attempts: number,
  success: boolean,
): AICallMetadata {
  return {
    promptId,
    promptVersion,
    model: process.env.OPENAI_MODEL || 'deepseek-chat',
    temperature: AI_CONFIG.defaultTemperature,
    attempts,
    validationStatus: success
      ? attempts === 1
        ? 'success'
        : 'retry_success'
      : 'failed',
    timestamp: new Date().toISOString(),
  };
}
