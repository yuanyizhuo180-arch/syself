# Codex 交接文档 — AI Personal Planning MVP 0.1

> **From Claude Code → To Codex**
>
> Claude Code 已完成所有 AI 层设计和规格定义。本文档是 Codex 开始编码前必须阅读的完整交接说明。
>
> **关键约束：先完成 Phase 0 人工验证（用户访谈 ≥2 人说"会持续用"），再开始写代码。**

---

## 1. 已完成的文件（不要修改）

以下文件由 Claude Code 设计，Codex **只读引用，不要修改逻辑**：

```
lib/
├── types.ts                          # 全局共享类型与枚举（冻结接口）
├── ai.ts                             # AI SDK 封装（generateStructured + generateResponse）
├── ai-adapter.interface.ts           # AIAdapter 接口 + FakeAIAdapter 规格
├── db.ts                             # SQLite Schema + 初始化 + 辅助函数
├── personal-model.ts                 # Personal Model 采集引擎
├── schemas/
│   ├── index.ts                      # Barrel export
│   ├── goal-understanding.ts         # 目标理解 Zod Schema + 业务校验
│   ├── plan-route.ts                 # 路线 Schema + 差异化验证
│   ├── task.ts                       # 任务 Schema + 容量校验 + 质量检查
│   └── reflection.ts                 # 复盘 Schema + 统计计算 + 安全校验
└── prompts/
    ├── goal-understanding.ts         # Prompt 模板 + User Message 构建器
    ├── route-generation.ts           # Prompt 模板 + 阶段序列化工具
    ├── task-generation.ts            # Prompt 模板 + serializeRoutePhases
    └── daily-reflection.ts           # Prompt 模板 + 语气自适应
```

**如果发现 lib/ 中的设计有问题**，先记录不修改，等 Claude Code 来调整。

---

## 2. Codex 需要创建的文件

### 2.1 工程脚手架

```bash
# Step 1: 初始化 Next.js
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Step 2: 安装依赖（优先使用 pnpm，中国大陆使用镜像源）
pnpm add better-sqlite3 zod ai @ai-sdk/openai
pnpm add -D vitest @types/better-sqlite3
```

**注意：** 安装任何额外生产依赖前必须先取得用户确认。

### 2.2 页面（6 个）

| 路由 | 文件 | 功能 | 关键交互 |
|---|---|---|---|
| `/` | `app/page.tsx` | 目标输入页 | 文本框 + "帮我规划"按钮；支持明确/模糊两种路径 |
| `/plan/understanding` | `app/plan/understanding/page.tsx` | AI 理解确认页 | 展示 AI 理解结果；假设黄色标注；追问表单；可修改任何字段 |
| `/plan/routes` | `app/plan/routes/page.tsx` | 路线选择页 | 左右两栏对比 2 条路线；展开查看阶段详情；点击选择 |
| `/plan/week` | `app/plan/week/page.tsx` | 任务确认页 | 7 天任务列表；容量条；可编辑/删除任务；确认激活 |
| `/today` | `app/today/page.tsx` | 今日执行页 | 今日任务列表；完成/跳过按钮；简单下拉选时间块 |
| `/reflection` | `app/reflection/page.tsx` | 复盘页 | 3 题快速复盘 + emoji 评分 + AI 洞察展示 |

### 2.3 API Routes（4 个）

| 路由 | 文件 | 调用 lib/ 模块 |
|---|---|---|
| `POST /api/ai/understand` | `app/api/ai/understand/route.ts` | `lib/ai.ts` + `lib/prompts/goal-understanding.ts` + `lib/schemas/goal-understanding.ts` + `lib/db.ts` |
| `POST /api/ai/routes` | `app/api/ai/routes/route.ts` | `lib/ai.ts` + `lib/prompts/route-generation.ts` + `lib/schemas/plan-route.ts` + `lib/db.ts` |
| `POST /api/ai/tasks` | `app/api/ai/tasks/route.ts` | `lib/ai.ts` + `lib/prompts/task-generation.ts` + `lib/schemas/task.ts` + `lib/db.ts` |
| `POST /api/ai/reflect` | `app/api/ai/reflect/route.ts` | `lib/ai.ts` + `lib/prompts/daily-reflection.ts` + `lib/schemas/reflection.ts` + `lib/db.ts` + `lib/personal-model.ts` |

### 2.4 API Routes（数据操作，3 个）

| 路由 | 功能 |
|---|---|
| `GET /api/goal` | 获取当前激活目标 |
| `PUT /api/goal` | 更新目标（确认 AI 理解后） |
| `GET /api/tasks?date=YYYY-MM-DD` | 获取指定日期的任务 |
| `POST /api/tasks/[id]/complete` | 标记任务完成 |
| `POST /api/tasks/[id]/skip` | 跳过任务 |
| `GET /api/reflection?date=YYYY-MM-DD` | 获取指定日期的复盘 |
| `POST /api/reflection` | 保存复盘 + 触发 Personal Model 更新 |

### 2.5 测试文件（1 个）

| 文件 | 内容 |
|---|---|
| `tests/mvp-happy-path.test.ts` | 使用 FakeAIAdapter 的完整闭环测试（参考 `docs/prompts/test-scenarios.md` 中的 A 类场景） |

---

## 3. 架构约定

### 3.1 API Route 结构模板

```typescript
// app/api/ai/understand/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateStructured } from '@/lib/ai';
import { GoalUnderstandingSchema, validateGoalUnderstanding } from '@/lib/schemas/goal-understanding';
import { GOAL_UNDERSTANDING_SYSTEM_PROMPT, buildGoalUnderstandingUserMessage } from '@/lib/prompts/goal-understanding';
import { getDb, generateId } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rawGoal } = await req.json();

    if (!rawGoal || typeof rawGoal !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_INPUT', userMessage: '请输入你的目标', retryable: false },
        { status: 400 }
      );
    }

    // 1. 构建 prompt
    const systemPrompt = GOAL_UNDERSTANDING_SYSTEM_PROMPT;
    const userMessage = buildGoalUnderstandingUserMessage(rawGoal);

    // 2. 调用 AI
    const { result, error, attempts } = await generateStructured(
      'goal-understanding',
      'v1',
      systemPrompt,
      userMessage,
      GoalUnderstandingSchema,
    );

    if (!result) {
      return NextResponse.json(
        { code: 'AI_FAILED', userMessage: 'AI 理解失败，请重试', retryable: true, attempts },
        { status: 422 }
      );
    }

    // 3. 业务校验
    const validation = validateGoalUnderstanding(result);
    if (!validation.valid) {
      // 业务规则不通过但 AI 调用成功 → 仍然返回结果但标记问题
      console.warn('[Goal Understanding] Business validation warnings:', validation.errors);
    }

    // 4. 持久化
    const db = getDb();
    const goalId = generateId();
    const understandingId = generateId();

    db.prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)')
      .run(goalId, rawGoal, 'draft');

    db.prepare(`INSERT INTO goal_understanding (id, goal_id, extracted_json, assumptions_json, missing_info_json, confidence, prompt_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(understandingId, goalId,
        JSON.stringify(result),
        JSON.stringify(result.assumptions),
        JSON.stringify(result.missing_information),
        result.confidence,
        'v1'
      );

    // 5. 返回
    const requiresFollowUp = result.missing_information.some(m => m.priority === 'critical');

    return NextResponse.json({
      goalId,
      understanding: result,
      requiresFollowUp,
      followUpQuestions: result.missing_information.filter(m => m.priority === 'critical'),
      validationWarnings: validation.errors.length > 0 ? validation.errors : undefined,
    });
  } catch (error) {
    console.error('[API] /api/ai/understand error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', userMessage: '服务器错误，请重试', retryable: true },
      { status: 500 }
    );
  }
}
```

### 3.2 页面组件结构模板

```typescript
// app/plan/routes/page.tsx
'use client';

import { useState } from 'react';
import type { RouteComparison } from '@/lib/schemas/plan-route';

export default function RouteSelectionPage() {
  const [routes, setRoutes] = useState<RouteComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Codex 实现具体 UI 逻辑
  // 关键约束：
  // - 两条路线平等展示，不做默认选中
  // - 风险和预警信号突出显示
  // - AI 假设用视觉区分（黄色背景）
}
```

### 3.3 数据流

```
用户输入 → API Route → lib/prompts/ 构建 prompt → lib/ai.ts 调用 LLM
                                                      ↓
                                            lib/schemas/ Zod 校验
                                                      ↓
                                              业务校验规则
                                                      ↓
                                            lib/db.ts 持久化
                                                      ↓
                                            返回结果给前端
```

---

## 4. 关键实现细节

### 4.1 AI 调用错误处理

```typescript
// 所有 API Route 统一使用这个模式
const { result, error, attempts } = await generateStructured(/*...*/);

if (!result) {
  // recoverable = true → 用户可重试
  // 日志记录 promptId + attempts + error（不记录完整 prompt/user 内容）
  console.error(`[AI] ${promptId} failed after ${attempts} attempts:`, error?.slice(0, 200));
  return NextResponse.json({
    code: 'AI_FAILED',
    userMessage: 'AI 处理失败，请点击重试',
    retryable: true,
  }, { status: 422 });
}
```

### 4.2 Personal Model 更新时机（使用集成层）

**已创建 `lib/personal-model-integration.ts`**，API Route 无需直接操作 `personal_model` 表。使用语义化 API：

```typescript
import { PersonalModel } from '@/lib/personal-model-integration';

// 目标确认时
PersonalModel.goalCreated('skill_acquisition');

// 路线选择时
PersonalModel.routeSelected('depth_first');

// 任务完成时
PersonalModel.taskCompleted({
  taskId: 'xxx',
  timeBlock: 'morning',
  energyLevel: 'high',
  actualMinutes: 50,
  estimatedMinutes: 45,
});

// 任务跳过时
PersonalModel.taskSkipped({
  taskId: 'xxx',
  timeBlock: 'evening',
  energyLevel: 'high',
  reason: 'no_time',
});

// 用户修改 AI 任务时
PersonalModel.taskModified('task-1', ['title', 'estimated_minutes'], 'skill_acquisition');

// 复盘完成时
PersonalModel.reflectionCompleted('2026-07-12', 4);

// 注入 AI prompt 时
const summary = PersonalModel.getSummary();
```

**关键约束：**
- Personal Model 更新失败不阻塞主流程（内部 try-catch）
- 所有更新是同步的（better-sqlite3），无竞态条件
- `getSummary()` 在 dataPoints < 5 时返回"暂无数据"

### 4.3 页面刷新状态恢复

- 所有工作流中间状态保存到 SQLite
- 关键页面 `useEffect` 中检查是否有未完成的流程
- 刷新后恢复到中断的步骤

---

## 5. 不需要实现的功能（明确排除）

- ❌ 用户注册登录（Phase 2）
- ❌ 拖拽排程（用 select 下拉替代）
- ❌ 路线编辑/融合
- ❌ 任务重新规划
- ❌ 今日简报
- ❌ 审计日志
- ❌ 数据导出/删除
- ❌ CI/CD pipeline
- ❌ Docker
- ❌ Playwright E2E 测试

---

## 6. Codex 开始前的检查清单

- [ ] Phase 0 用户访谈完成（≥2 人说"会持续用"）
- [ ] Phase 0 手工模拟完成（≥1 人连续使用 5 天）
- [ ] Phase 0 Prompt 原型测试完成（4 个引擎平均加权分 > 40/57）
- [ ] 用户确认进入 Phase 1

**以上全部通过前，不要写任何代码。**
