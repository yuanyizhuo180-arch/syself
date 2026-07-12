/**
 * FakeAIAdapter — AI 输出模拟器，用于测试
 *
 * Claude Code 设计规格，由 Codex 在 Phase 1 中实现。
 *
 * 用途：
 * - C 类测试场景（异常恢复）：注入失败来验证重试和降级逻辑
 * - CI 环境：不依赖真实 AI API 调用
 * - 确定性测试：固定输入 → 固定输出，结果可复现
 *
 * 业务代码通过依赖注入使用此适配器，不直接依赖具体实现。
 */

import type { z } from 'zod';

// ============================================================
// AIAdapter 接口（业务代码依赖此接口，不依赖具体实现）
// ============================================================

export interface AIAdapter {
  generateStructured<T>(
    promptId: string,
    promptVersion: string,
    systemPrompt: string,
    userMessage: string,
    schema: z.ZodSchema<T>,
    options?: { temperature?: number },
  ): Promise<{
    result: T | null;
    error: string | null;
    attempts: number;
    promptVersion: string;
    recoverable: boolean;
  }>;

  generateResponse(
    systemPrompt: string,
    userMessage: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string>;
}

// ============================================================
// FakeAIAdapter — 可编程控制的模拟实现
// ============================================================

export type FakeResponse<T> =
  | { type: 'success'; data: T }
  | { type: 'error'; message: string }
  | { type: 'fail_then_success'; firstError: string; data: T };

export class FakeAIAdapter implements AIAdapter {
  private responses: Map<string, FakeResponse<unknown>> = new Map();
  private callHistory: Array<{
    promptId: string;
    timestamp: string;
    inputHash: string;
  }> = [];

  /**
   * 为指定 promptId 预设响应
   */
  setResponse(promptId: string, response: FakeResponse<unknown>): void {
    this.responses.set(promptId, response);
  }

  /**
   * 清除所有预设响应
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }

  /**
   * 获取调用历史（验证重试次数、调用顺序等）
   */
  getCallHistory(): ReadonlyArray<{
    promptId: string;
    timestamp: string;
    inputHash: string;
  }> {
    return this.callHistory;
  }

  /**
   * 获取特定 promptId 的调用次数
   */
  getCallCount(promptId: string): number {
    return this.callHistory.filter((c) => c.promptId === promptId).length;
  }

  async generateStructured<T>(
    promptId: string,
    promptVersion: string,
    systemPrompt: string,
    userMessage: string,
    _schema: z.ZodSchema<T>,
    _options?: { temperature?: number },
  ): Promise<{
    result: T | null;
    error: string | null;
    attempts: number;
    promptVersion: string;
    recoverable: boolean;
  }> {
    // 记录调用
    this.callHistory.push({
      promptId,
      timestamp: new Date().toISOString(),
      inputHash: this.hashInput(userMessage),
    });

    const preset = this.responses.get(promptId);

    if (!preset) {
      // 没有预设 → 返回默认成功（空对象），由 Zod 校验决定是否通过
      return {
        result: {} as T,
        error: null,
        attempts: 1,
        promptVersion,
        recoverable: true,
      };
    }

    if (preset.type === 'success') {
      return {
        result: preset.data as T,
        error: null,
        attempts: 1,
        promptVersion,
        recoverable: true,
      };
    }

    if (preset.type === 'error') {
      return {
        result: null,
        error: preset.message,
        attempts: 2, // 模拟已重试 2 次
        promptVersion,
        recoverable: true,
      };
    }

    // fail_then_success：第一次失败，第二次成功
    if (preset.type === 'fail_then_success') {
      const callCount = this.getCallCount(promptId);
      if (callCount === 1) {
        // 第一次调用 → 失败
        return {
          result: null,
          error: preset.firstError,
          attempts: 1,
          promptVersion,
          recoverable: true,
        };
      }
      // 第二次调用 → 成功
      return {
        result: preset.data as T,
        error: null,
        attempts: 2,
        promptVersion,
        recoverable: true,
      };
    }

    return {
      result: null,
      error: 'Unknown preset type',
      attempts: 2,
      promptVersion,
      recoverable: false,
    };
  }

  async generateResponse(
    _systemPrompt: string,
    _userMessage: string,
    _options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    return '（FakeAIAdapter 模拟回复）';
  }

  private hashInput(input: string): string {
    // 简单哈希，仅用于测试中验证输入是否一致
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

// ============================================================
// 工厂函数 — 用于依赖注入
// ============================================================

/**
 * 生产环境：返回真实 AI 适配器
 * 测试环境：返回 FakeAIAdapter
 *
 * Codex 实现时可以使用环境变量或 __DEV__ 标志来切换
 */
export function createAIAdapter(env: 'production' | 'test'): AIAdapter {
  if (env === 'test') {
    return new FakeAIAdapter();
  }
  // 生产环境：动态导入真实适配器，避免测试环境加载 AI SDK
  // const { createRealAIAdapter } = await import('./ai');
  // return createRealAIAdapter();
  throw new Error('Real AI adapter not yet implemented — Codex task');
}
