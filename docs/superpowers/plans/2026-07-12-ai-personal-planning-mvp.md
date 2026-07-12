# AI 个人规划系统 — MVP 实施计划（CTO 审查修订版）

> **修订说明：** 原计划经过 CTO 级架构审查，存在"用 10 人团队 6 个月工程计划包装成 MVP"的根本性问题。修订后的计划以 **MVP 0.1（2-4 周可完成、可验证用户价值）** 为核心，MVP 1.0 作为验证后的第二阶段。核心调整：极简技术栈、AI 理解引擎前置、Personal Model 从 Day 1 开始采集、删除过度工程化内容。
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用最少资源、最快时间验证"用户是否愿意让 AI 帮助自己规划人生目标并持续执行"。MVP 0.1 聚焦核心闭环：自然语言输入目标 → AI 理解标准化 → 2 条差异化路线 → 首周任务 → 每日执行与复盘。MVP 1.0 在验证通过后加入用户系统、数据持久化、Personal Model 基础版等工程化能力。

**Architecture (MVP 0.1):** Next.js App Router + SQLite (better-sqlite3) + Vercel AI SDK + Tailwind CSS。单项目全栈，不引入独立后端、不引入 PostgreSQL、不引入 Docker。AI 调用通过 Next.js API Routes 统一代理，结构化输出使用 Zod 在前端侧校验。

**Architecture (MVP 1.0):** 在 MVP 0.1 基础上，根据需要引入 PostgreSQL + NextAuth/Better Auth + 简单的 Python AI 微服务（仅当 prompt 管理复杂度超过单文件承载时）。

**Tech Stack (MVP 0.1):** Next.js、TypeScript、Tailwind CSS、Zod、better-sqlite3、Vercel AI SDK、Vitest。

**Tech Stack (MVP 1.0 候选):** 上述 + PostgreSQL 16、NextAuth.js、Python 3.12 + FastAPI（可选）、Playwright（E2E）。

---

## 全局约束

- 产品定位是"AI 个人战略与执行规划系统"，不是纯待办清单、一次性计划聊天机器人或替用户决策的人生顾问。
- **MVP 0.1 只允许 1 个激活目标**，核心闭环：输入目标 → AI 理解标准化 → 2 条路线 → 路线选择 → 5-8 个首周任务 → 每日执行标记 → 快速复盘。
- 桌面网页优先；移动端原生应用、手机复杂拖拽和推送通知不进入 MVP 0.1 和 1.0。
- 每日排程 MVP 0.1 使用简单列表 + 下拉选择时间块（上午/下午/晚上），不引入 dnd-kit 拖拽。
- AI 批量生成的数据必须先进入草稿；用户确认前不得创建正式任务。
- 结构化 AI 输出必须通过 Zod Schema 校验；校验失败时重试一次，两次失败则保存上下文并允许用户手动继续。
- 事实、用户声明、观察、假设必须区分；AI 不得把推测写成事实。
- MVP 0.1 不包含：多目标协调、拖拽排程、周/月复盘、复杂长期记忆、文件上传、第三方日历、推送通知、多 Agent、LangGraph、向量数据库。
- 所有 AI 调用记录 `prompt_version` 和 `input_hash`，用于后续质量追踪。
- MVP 0.1 不需要 CI/CD pipeline、Docker、Alembic 迁移、OpenAPI 代码生成。

---

## 0. 重新定义的开发阶段

| 阶段 | 周期 | 目标 | 阶段门 |
|---|---|---|---|
| **Phase 0：产品验证** | 第 1 周 | 验证用户需求存在 | 至少 2 个用户表示"有 App 我会持续用" |
| **Phase 1：MVP 0.1** | 第 2-4 周 | 可用的核心闭环，种子用户验证 | 至少 1 个用户连续使用 5 天，AI 内容"觉得有用">60% |
| **Phase 2：MVP 1.0** | 第 5-8 周（条件触发） | 基于 0.1 反馈的工程化 | 种子用户验证通过后才进入 |
| **Phase 3：长期演进** | 3-12 个月 | Personal Model、Memory、多目标 | 按用户数据和反馈驱动优先级 |

---

## Phase 0：产品验证（第 1 周）—— 最高优先级

> **核心原则：在写任何一行代码之前，先证明有人需要这个产品。**

### Task 0.1：用户访谈

- [ ] 找 5 个目标用户（有未实现的人生目标、尝试过做计划但失败），深访 30 分钟
- [ ] 核心问题：
  - "你现在怎么管理你的人生目标？"
  - "上一次你设定了目标但没完成是什么时候？为什么？"
  - "如果有人帮你把模糊想法变成可执行的每日计划，你愿意付费吗？"
- [ ] 产出：5 份访谈记录 + 痛点优先级排序

### Task 0.2：手工模拟 AI 规划

- [ ] 你扮演 AI，手动为 3 个朋友做一次完整闭环：理解目标 → 给路线 → 拆任务 → 每日跟进
- [ ] 记录：用户在第几步表现出兴趣/困惑/放弃
- [ ] 验证：用户会不会主动"回来用第二天"？

### Task 0.3：Prompt 原型

- [ ] 在 Claude/ChatGPT 中反复测试 prompt，回答核心问题：
  - 什么 prompt 能让 AI 生成"不千篇一律"的规划建议？
  - 什么 prompt 能让 AI 追问关键缺失信息而不是猜测？
  - 什么 prompt 能让 AI 基于用户画像给出个性化建议？
- [ ] 产出：3-5 个验证过的 prompt 模板，存储在 `docs/prompts/prototypes/`

### Task 0.4：Go/No-Go 决策

- [ ] **硬性阶段门：至少 2 个用户表示"如果有 App 我会持续用"** → 进入 Phase 1
- [ ] 不满足 → 重新理解用户需求或 pivot

---

## Phase 1：MVP 0.1（第 2-4 周）—— 核心交付

> **目标：2-4 周内完成可用的核心闭环，交给种子用户验证。**

### MVP 0.1 目标文件结构

```text
.
├── app/
│   ├── page.tsx                    # 首页：目标输入
│   ├── plan/
│   │   ├── understanding/
│   │   │   └── page.tsx            # AI 理解结果 + 追问
│   │   ├── routes/
│   │   │   └── page.tsx            # 2 条路线比较与选择
│   │   └── week/
│   │       └── page.tsx            # 7 天任务确认
│   ├── today/
│   │   └── page.tsx                # 今日执行
│   ├── reflection/
│   │   └── page.tsx                # 快速复盘
│   └── api/
│       └── ai/
│           ├── understand/route.ts # 目标理解 API
│           ├── routes/route.ts     # 路线生成 API
│           ├── tasks/route.ts      # 任务生成 API
│           └── reflect/route.ts    # 复盘生成 API
├── lib/
│   ├── db.ts                       # SQLite 数据库
│   ├── ai.ts                       # AI SDK 封装
│   ├── schemas/
│   │   ├── goal-understanding.ts   # 目标理解 Zod Schema
│   │   ├── plan-route.ts           # 路线 Zod Schema
│   │   ├── task.ts                 # 任务 Zod Schema
│   │   └── reflection.ts           # 复盘 Zod Schema
│   ├── personal-model.ts           # Personal Model 采集与更新
│   └── prompts/
│       ├── goal-understanding.ts   # 目标理解 Prompt
│       ├── route-generation.ts     # 路线生成 Prompt
│       ├── task-generation.ts      # 任务生成 Prompt
│       └── daily-reflection.ts     # 每日复盘 Prompt
├── components/
│   └── ui/                         # 最小 UI 组件集
├── tests/
│   └── mvp-happy-path.test.ts      # 核心闭环测试
├── docs/
│   └── prompts/prototypes/         # Phase 0 验证过的 prompt
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.local
```

边界说明：`lib/ai.ts` 是唯一可直接调用模型供应商的模块；`lib/prompts/` 每个文件包含一个版本的 prompt 模板；`lib/personal-model.ts` 从 Day 1 开始采集用户行为数据；不使用独立后端，所有逻辑在 Next.js API Routes 中完成。

---

### Task 1.1：工程基座（2-3 天）

**目标：Next.js + SQLite + AI SDK 可启动，最简开发环境。**

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
```

- [ ] **Step 2: 安装核心依赖**

```bash
pnpm add better-sqlite3 zod ai @ai-sdk/openai
pnpm add -D vitest @types/better-sqlite3
```

注意：安装依赖前确认包名和用途，优先使用 pnpm。如需使用中国大陆镜像源，配置 `.npmrc`。

- [ ] **Step 3: 建立 SQLite 数据库**

`lib/db.ts`：初始化数据库，创建 MVP 0.1 核心表：

```sql
-- 目标表（单激活目标）
CREATE TABLE goal (
  id TEXT PRIMARY KEY,
  raw_input TEXT NOT NULL,
  normalized_name TEXT,
  success_criteria TEXT,
  target_date TEXT,
  primary_area TEXT,
  status TEXT DEFAULT 'draft',  -- draft | active | completed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- AI 理解结果
CREATE TABLE goal_understanding (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  extracted_json TEXT NOT NULL,    -- GoalUnderstanding JSON
  assumptions_json TEXT NOT NULL,  -- 假设列表
  missing_info_json TEXT,          -- 缺失信息
  confidence REAL DEFAULT 0,
  prompt_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 路线方案
CREATE TABLE plan_route (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  route_type TEXT NOT NULL,        -- 'depth_first' | 'breadth_first'
  title TEXT NOT NULL,
  thesis TEXT NOT NULL,
  phases_json TEXT NOT NULL,
  advantages_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  first_month_actions_json TEXT NOT NULL,
  status TEXT DEFAULT 'draft',     -- draft | selected | rejected
  created_at TEXT DEFAULT (datetime('now'))
);

-- 任务
CREATE TABLE task (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  route_id TEXT,
  title TEXT NOT NULL,
  completion_criteria TEXT,
  minimum_action TEXT,
  estimated_minutes INTEGER,
  quadrant TEXT DEFAULT 'important_not_urgent',
  time_block TEXT,                 -- morning | afternoon | evening
  day_date TEXT,                   -- 安排在哪天
  status TEXT DEFAULT 'planned',   -- planned | done | skipped
  created_at TEXT DEFAULT (datetime('now'))
);

-- 执行记录
CREATE TABLE execution_event (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,            -- done | skipped | partial
  actual_minutes INTEGER,
  difficulty TEXT,
  note TEXT,                       -- 用户一句话备注
  created_at TEXT DEFAULT (datetime('now'))
);

-- 每日复盘
CREATE TABLE daily_reflection (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completion_rate REAL,
  important_completion_rate REAL,
  incomplete_reasons_json TEXT,
  workload_fit TEXT,
  tomorrow_need TEXT,
  ai_insight TEXT,                 -- AI 一句话洞察
  created_at TEXT DEFAULT (datetime('now'))
);

-- Personal Model（从 Day 1 开始积累）
CREATE TABLE personal_model (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  behavior_patterns_json TEXT DEFAULT '{}',
  goal_preferences_json TEXT DEFAULT '{}',
  calibration_json TEXT DEFAULT '{}',
  data_points INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 4: 建立 AI SDK 封装**

`lib/ai.ts`：

```typescript
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { z } from 'zod';

// 结构化输出（带重试）
export async function generateStructured<T>(
  promptId: string,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodSchema<T>,
): Promise<{ result: T | null; error: string | null; attempts: number }> {
  let lastError: string | null = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema,
        system: systemPrompt,
        prompt: userMessage,
        temperature: 0.3, // 规划类任务使用低随机性
      });
      return { result: object, error: null, attempts: attempt + 1 };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // 第一次失败时在 prompt 中追加错误信息后重试
      if (attempt === 0) {
        userMessage += `\n\n[SYSTEM] 上一次输出校验失败：${lastError}。请严格按照要求的 JSON 格式输出。`;
      }
    }
  }
  
  return { result: null, error: lastError, attempts: 2 };
}

// 自由文本生成（用于追问、摘要等）
export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    prompt: userMessage,
    temperature: 0.5,
  });
  return text;
}
```

- [ ] **Step 5: 验证**

```bash
pnpm dev  # Next.js 启动成功
pnpm test # 即使初始 0 个测试，退出码为 0
```

- [ ] **Step 6: 提交**

`chore: bootstrap mvp-0.1 workspace with next.js + sqlite + ai sdk`

---

### Task 1.2：AI 理解引擎 — 目标输入与标准化（3-4 天）

**目标：用户输入自然语言目标，AI 深度理解、追问缺失信息、输出结构化目标。**

> 这是整个产品最核心的 AI 能力。不是简单的"把用户输入转成 JSON"，而是真正理解用户意图、识别隐含假设、追问关键缺失。

#### 1.2.1 Goal Understanding Schema

`lib/schemas/goal-understanding.ts`：

```typescript
import { z } from 'zod';

export const GoalUnderstandingSchema = z.object({
  goal_type: z.enum([
    'skill_acquisition', 'career_change', 'health_fitness',
    'finance_investment', 'creative_output', 'relationship',
    'learning_education', 'habit_formation', 'other'
  ]),
  desired_outcome: z.string().describe('用户想要达到的具体成果，用用户的语言描述'),
  current_state: z.string().describe('用户当前在这个目标上的状态'),
  time_horizon: z.string().describe('预计时间跨度，如"3个月""1-2年"'),
  intensity: z.enum(['casual', 'moderate', 'intense']).describe('用户期望的投入程度'),

  implicit_constraints: z.object({
    time_per_week_hours: z.number().nullable().describe('每周可投入时间，未知则为 null'),
    budget_required: z.string().nullable(),
    location_dependent: z.boolean(),
    requires_mentor: z.boolean(),
  }),

  risks: z.object({
    dropout_triggers: z.array(z.string()).describe('可能导致用户放弃的场景'),
    knowledge_gaps: z.array(z.string()).describe('用户当前缺失的关键知识/技能'),
    behavioral_risks: z.array(z.string()).describe('用户行为模式中可能阻碍目标的因素'),
  }),

  missing_information: z.array(z.object({
    field: z.string(),
    question: z.string().describe('用用户友好的语言追问'),
    why_important: z.string().describe('为什么这个信息对规划质量有影响'),
    priority: z.enum(['critical', 'important', 'nice_to_have']),
  })),

  assumptions: z.array(z.object({
    statement: z.string(),
    basis: z.enum(['user_stated', 'inferred', 'general_knowledge']),
    verifiable: z.boolean(),
    verification_method: z.string().nullable(),
  })),

  confidence: z.number().min(0).max(1).describe('AI 对整体理解的置信度'),
});

export type GoalUnderstanding = z.infer<typeof GoalUnderstandingSchema>;
```

#### 1.2.2 Goal Understanding Prompt

`lib/prompts/goal-understanding.ts`：

```typescript
export const GOAL_UNDERSTANDING_PROMPT = `你是一位资深的个人战略规划师。你的任务是深度理解用户的模糊人生目标，而不是简单地转述。

## 核心原则

1. **不要猜测**：对于关键缺失信息，标记为 missing_information 并要求追问，不要用"常见情况"来填充。
2. **标注来源**：每条假设必须标注 basis：user_stated（用户明确说的）、inferred（你推断的）、general_knowledge（常识）。
3. **识别风险**：基于用户当前状态和目标之间的差距，指出最可能导致放弃的因素。
4. **区分目标类型**：是能力获取（学会XX技能）、成果产出（完成XX作品）、习惯养成（每天XX）还是状态改变（减肥到XX公斤）——不同类型需要不同的策略。

## 输出要求

- desired_outcome 必须具体、可验证。"成为更好的人" → 追问：你怎么定义"更好"？
- confidence < 0.6 时，missing_information 必须包含至少一条 critical 级别追问
- dropout_triggers 必须基于用户的具体画像，不能是"缺乏动力"这种通用回答
- 每条 question 用用户能理解的中文表达，不要使用术语`;
```

#### 1.2.3 实现步骤

- [ ] **Step 1: 写 Schema 校验测试**

```typescript
// tests/mvp-happy-path.test.ts
import { describe, it, expect } from 'vitest';
import { GoalUnderstandingSchema } from '@/lib/schemas/goal-understanding';

describe('Goal Understanding Schema', () => {
  it('rejects understanding with confidence 0 but no critical missing info', () => {
    const invalid = { /* ... confidence: 0, missing_information: [] */ };
    const result = GoalUnderstandingSchema.safeParse(invalid);
    // 业务规则：confidence < 0.6 时必须有追问
  });

  it('accepts valid understanding with all required fields', () => {
    const valid = { /* 完整有效的理解结果 */ };
    const result = GoalUnderstandingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects when assumption basis is invalid', () => {
    // basis 必须是 user_stated | inferred | general_knowledge
  });
});
```

- [ ] **Step 2: 实现目标输入页**

`app/page.tsx`：一个文本框 + "帮我规划"按钮。极简设计，聚焦输入体验。

- 支持两种输入路径：
  - **明确目标**："我想在 6 个月内成为能独立分析财报的投资者"
  - **模糊想法**："我想学投资但不知道怎么开始"
- 模糊输入时 AI 追问更多信息；明确输入时 AI 直接标准化

- [ ] **Step 3: 实现 API Route**

`app/api/ai/understand/route.ts`：

```typescript
import { generateStructured } from '@/lib/ai';
import { GoalUnderstandingSchema } from '@/lib/schemas/goal-understanding';
import { GOAL_UNDERSTANDING_PROMPT } from '@/lib/prompts/goal-understanding';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { rawGoal } = await req.json();

  const { result, error, attempts } = await generateStructured(
    'goal-understanding-v1',
    GOAL_UNDERSTANDING_PROMPT,
    `用户的目标是：${rawGoal}`,
    GoalUnderstandingSchema,
  );

  if (!result) {
    return Response.json({
      error: 'AI 理解失败，请重试',
      recoverable: true,
      attempts,
    }, { status: 422 });
  }

  // 保存理解结果到 SQLite
  const goalId = crypto.randomUUID();
  const understandingId = crypto.randomUUID();

  db.prepare(`INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'draft')`)
    .run(goalId, rawGoal);

  db.prepare(`INSERT INTO goal_understanding (id, goal_id, extracted_json, assumptions_json, missing_info_json, confidence, prompt_version)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(understandingId, goalId,
      JSON.stringify(result),
      JSON.stringify(result.assumptions),
      JSON.stringify(result.missing_information),
      result.confidence,
      'goal-understanding-v1'
    );

  return Response.json({
    goalId,
    understanding: result,
    // 如果有 critical 缺失信息，标记需要追问
    requiresFollowUp: result.missing_information.some(m => m.priority === 'critical'),
  });
}
```

- [ ] **Step 4: 实现理解结果展示页**

`app/plan/understanding/page.tsx`：

- 展示 AI 对目标的理解（desired_outcome、current_state、时间跨度）
- **假设用黄色背景标注**，事实用白色背景，让用户区分"AI 确认的"和"AI 猜测的"
- 如果 `requiresFollowUp === true`，展示 AI 的追问问题，用户必须回答 critical 级别问题
- 用户可以修改任何 AI 理解结果
- 确认后保存到 SQLite 并进入下一步

- [ ] **Step 5: 验证**

手动测试 5 种不同类型的目标输入：
1. "我想成为投资高手"（模糊）
2. "我想 3 个月内学会 Python 并找到相关工作"（明确）
3. "我想减肥 10 公斤"（常见但容易放弃）
4. "我想写一本小说"（创意型）
5. "我想改善和家人的关系"（关系型）

检查：AI 是否追问了关键缺失？假设是否正确标注了来源？confidence 评分是否合理？

- [ ] **Step 6: 提交**

`feat: add ai goal understanding engine with structured output`

---

### Task 1.3：路线生成 — 2 条差异化路线（2-3 天）

**目标：基于 AI 理解的目标，生成 2 条有实质差异的战略路线。**

> 为什么是 2 条而不是原计划的 3 条？—— 3 条路线在 MVP 阶段造成信息过载，用户决策疲劳。2 条路线（深度优先 vs 广度优先）覆盖核心选择维度，足够验证"用户需要对比才能做决策"这个假设。

#### 1.3.1 Route Schema

`lib/schemas/plan-route.ts`：

```typescript
import { z } from 'zod';

export const PlanRouteSchema = z.object({
  title: z.string().describe('路线名称，简洁有力'),
  thesis: z.string().describe('核心理念：为什么这条路线适合这个用户'),
  strategy_type: z.enum(['depth_first', 'breadth_first']),
  
  phases: z.array(z.object({
    name: z.string(),
    duration: z.string(),
    focus: z.string(),
    key_actions: z.array(z.string()),
    success_marker: z.string().describe('怎么知道这个阶段完成了'),
    weekly_hours: z.number(),
  })).min(2).max(4),

  advantages: z.array(z.object({
    point: z.string(),
    why_relevant_to_user: z.string(), // 必须链接到用户画像
  })),

  risks: z.array(z.object({
    risk: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
    early_warning_sign: z.string().describe('出现什么信号说明这条路有问题'),
  })),

  first_month_preview: z.object({
    week1_summary: z.string(),
    week2_summary: z.string(),
    week3_summary: z.string(),
    week4_summary: z.string(),
  }),

  user_profile_basis: z.array(z.string()).describe('引用用户画像中的哪些信息支撑了这条路线的设计'),
});

export const RouteComparisonSchema = z.object({
  routes: z.array(PlanRouteSchema).length(2),
  comparison_summary: z.string().describe('用 2-3 句话概括两条路线的核心区别'),
  recommendation: z.string().nullable().describe('不做推荐则为 null，让用户自主选择'),
});
```

#### 1.3.2 Route Generation Prompt（核心设计）

`lib/prompts/route-generation.ts`：

```typescript
export const ROUTE_GENERATION_PROMPT = `你是一位个人战略规划师。基于对用户目标的深度理解，设计两条有实质差异的执行路线。

## 两条路线的核心差异

**路线 A：深度优先 (Depth First)**
- 先集中攻克最关键的一个能力/瓶颈
- 在一个方向建立扎实基础后再扩展
- 适合：时间有限、自制力需要外部结构、需要快速看到局部成果来建立信心

**路线 B：广度优先 (Breadth First)**
- 同步推进多个维度，快速建立整体框架
- 先广度了解再逐步深入
- 适合：有持续学习习惯、不喜欢单调、需要先了解全局再做选择

## 如何避免空泛鸡汤

1. **每条建议必须引用用户画像中的具体信息**。不要写"建议每天学习"，而是"基于你每周只有 5 小时可用时间，建议..."
2. **每条路线必须包含失败预警**。"如果你在第 2 周发现自己连续 3 天没有行动，说明这条路线的节奏不适合你，建议..."
3. **阶段行动必须可验证**。"理解财务报表" 是空话 → "用一份真实公司年报，独立完成三张报表的关联分析" 是可验证的
4. **不写"保持耐心""相信过程""坚持就是胜利"这类无操作性的鼓励**

## 与用户对话的语气

- 理性、直接但不冷酷
- 指出风险时引用用户画像中的具体原因
- 肯定用户现有的优势或资源
- 明确区分"基于你提供的信息"和"基于一般经验推断"

## 严禁

- 把不同措辞的同一策略当作两条路线
- 推荐超出用户可用时间的投入
- 使用人格评价（"你是一个容易放弃的人"）
- 替用户做选择（不做推荐，除非差异极其明显）`;
```

#### 1.3.3 差异化验证规则

`lib/schemas/plan-route.ts` 中增加：

```typescript
export function validateRouteDiversity(routes: PlanRoute[]): {
  valid: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (routes.length !== 2) {
    failures.push('必须恰好生成 2 条路线');
    return { valid: false, failures };
  }

  const [a, b] = routes;

  // 差异维度检查
  const dimensions: { name: string; valueA: any; valueB: any }[] = [
    { name: '策略类型', valueA: a.strategy_type, valueB: b.strategy_type },
    { name: '阶段数', valueA: a.phases.length, valueB: b.phases.length },
    { name: '周投入', valueA: a.phases.reduce((s, p) => s + p.weekly_hours, 0) / a.phases.length,
      valueB: b.phases.reduce((s, p) => s + p.weekly_hours, 0) / b.phases.length },
    { name: '风险数量', valueA: a.risks.length, valueB: b.risks.length },
  ];

  const differentDimensions = dimensions.filter(d => d.valueA !== d.valueB);

  if (differentDimensions.length < 2) {
    failures.push(`两条路线仅在 ${differentDimensions.length} 个维度上有差异，要求至少 2 个维度不同`);
  }

  if (a.title === b.title) {
    failures.push('两条路线标题相同，实质差异不足');
  }

  if (JSON.stringify(a.advantages) === JSON.stringify(b.advantages)) {
    failures.push('两条路线的优势描述完全相同');
  }

  return { valid: failures.length === 0, failures };
}
```

#### 1.3.4 实现步骤

- [ ] **Step 1: 写差异校验测试**：验证 validateRouteDiversity 能检测出伪差异化
- [ ] **Step 2: 实现 API Route** `app/api/ai/routes/route.ts`
- [ ] **Step 3: 实现路线比较页** `app/plan/routes/page.tsx`：
  - 左右两栏对比核心差异
  - 展开可看完整阶段
  - 风险和成功标志并排展示
  - 用户点击选择（不是默认选中推荐方案）
- [ ] **Step 4: 手动测试**：用 5 组不同目标验证路线质量，检查是否真的"不同"而不仅是"换说法"
- [ ] **Step 5: 提交** `feat: generate and compare 2 differentiated planning routes`

---

### Task 1.4：首周任务生成（2 天）

**目标：根据用户选择的路线，生成首周 5-8 个可执行任务。**

#### 1.4.1 Task Schema

`lib/schemas/task.ts`：

```typescript
import { z } from 'zod';

export const TaskDraftSchema = z.object({
  title: z.string().describe('任务标题，可执行、可验证'),
  completion_criteria: z.string().describe('怎么知道这个任务算完成了？'),
  minimum_action: z.string().describe('如果太忙，最少完成什么也算有进展？'),
  estimated_minutes: z.number().min(5).max(240),
  quadrant: z.enum([
    'important_urgent',
    'important_not_urgent',
    'urgent_not_important',
    'not_important_not_urgent',
  ]),
  day_of_week: z.number().min(1).max(7).describe('建议安排在一周的第几天'),
  energy_level: z.enum(['high', 'medium', 'low']).describe('需要什么精力水平'),
});

export const WeeklyPlanSchema = z.object({
  tasks: z.array(TaskDraftSchema).min(5).max(8),
  total_minutes: z.number(),
  weekly_capacity_percentage: z.number().describe('占用户可用时间的百分比'),
  ai_note: z.string().describe('AI 对本周计划的一句话说明，如"本周重点是建立基础习惯，任务偏轻量"'),
});
```

#### 1.4.2 核心约束

- 数量 5-8 个
- 总建议时长不超过用户可用时间的 70%
- 每个重要任务必须有 `completion_criteria` 和 `minimum_action`
- 任务必须直接推动路线目标，不能是"学习 XX 理论"这种无法验收的
- 每天最多 2 个任务（避免用户 overwhelmed）

#### 1.4.3 实现步骤

- [ ] **Step 1: 写校验测试**：数量边界、容量边界、完成标准必填
- [ ] **Step 2: 实现 API Route** `app/api/ai/tasks/route.ts`
- [ ] **Step 3: 实现任务确认页** `app/plan/week/page.tsx`：
  - 展示 AI 生成的 7 天任务列表
  - 用户可修改标题、时长、完成标准、象限
  - 显示容量条：已安排分钟 / 可用时间 × 70%
  - 超载时黄色警告而非阻断，用户可强制确认
  - 确认后所有任务写入 SQLite
- [ ] **Step 4: 提交** `feat: generate capacity-aware first week tasks`

---

### Task 1.5：每日执行与复盘（2 天）

**目标：用户能标记任务完成、记录执行事件、完成每日快速复盘。**

#### 1.5.1 今日执行页

`app/today/page.tsx`：

- 简单列表展示今日任务
- 每个任务：标题 + 预计时长 + 完成标准 + "完成"按钮
- 点击"完成"：重要任务弹出简单表单（实际时长 + 难度 + 一句话备注，均可选）
- 简单任务直接标记完成
- 未完成任务可"跳过"（需要选原因标签：没时间 / 太难 / 忘了 / 不想做）
- 简单下拉选择时间块（上午/下午/晚上），不引入拖拽

#### 1.5.2 快速复盘页

`app/reflection/page.tsx`：

3 个核心问题（可以在 1 分钟内完成）：
1. 今天完成情况怎么样？（emoji 1-5 评分）
2. 没完成的任务是因为什么？（从预定义标签选 + 可选自由输入）
3. 明天需要调整什么？（继续 / 减量 / 加量 / 换任务）

AI 在复盘后生成一句话洞察，如：
- "你今天的重要任务完成率是 100%，但比预计多花了 30 分钟。明天类似的任务建议预留更多时间。"
- "你连续 2 天跳过了需要高精力的任务。是否考虑把它们安排在上午？"

#### 1.5.3 Personal Model 采集

`lib/personal-model.ts`——**从 Day 1 开始采集**：

```typescript
export function updatePersonalModel(event: {
  type: 'task_completed' | 'task_skipped' | 'task_modified' | 'route_selected' | 'reflection';
  data: Record<string, any>;
}) {
  const model = db.prepare('SELECT * FROM personal_model WHERE id = ?').get('singleton');
  // 更新对应维度的统计数据
  // behavior_patterns: 完成率按时段、任务大小偏好
  // goal_preferences: 选择路线类型、修改 AI 建议的倾向
  // calibration: 时间估算偏差
  // ...
}
```

采集的数据点：
- 任务完成/未完成（基础完成率）
- 未完成原因标签（拖延模式识别）
- 用户覆盖的象限（用户判断 vs AI 判断）
- 用户修改的时长（时间估算偏差）
- 选择的路线类型（决策偏好）
- 复盘 emoji 评分趋势

#### 1.5.4 实现步骤

- [ ] **Step 1: 实现执行事件 API** `app/api/ai/reflect/route.ts`
- [ ] **Step 2: 实现今日执行页** `app/today/page.tsx`
- [ ] **Step 3: 实现复盘页** `app/reflection/page.tsx`
- [ ] **Step 4: 实现 Personal Model 采集逻辑** `lib/personal-model.ts`
- [ ] **Step 5: E2E 手动测试**：从目标输入到复盘的完整闭环
- [ ] **Step 6: 提交** `feat: daily execution tracking and quick reflection with personal model`

---

### Task 1.6：部署与种子用户测试（2 天）

- [ ] **Step 1: 部署到 Vercel**（SQLite 使用 Turso 或 LiteFS 做持久化，或切换到 Vercel Postgres 的最简配置）
- [ ] **Step 2: 邀请 3 个种子用户**，每人使用真实目标
- [ ] **Step 3: 连续 5 天记录数据**：
  - 每日完成链路是否通畅
  - AI 生成内容用户修改了什么
  - 用户在第几天开始出现使用疲劳
  - 复盘完成率
- [ ] **Step 4: MVP 0.1 成功标准验收**：
  - [ ] 至少 1 个用户连续使用 5 天
  - [ ] AI 内容的用户"觉得有用"率 > 60%（每次 AI 生成后加一个 👍/👎）
  - [ ] 从输入目标到看到路线 < 3 分钟
  - [ ] 每日复盘完成时间 < 1 分钟

### Phase 1 复盘

- [ ] AI 理解准确率：用户修改 AI 理解结果的频率和幅度
- [ ] 路线有效性：被选中的路线类型是否有统计规律
- [ ] 任务执行率：实际完成率、跳过原因分布
- [ ] Personal Model 数据量：每个用户积累了多少数据点
- [ ] **Go/No-Go 到 Phase 2 的决策**

---

## Phase 2：MVP 1.0（条件触发，第 5-8 周）

> **前提：Phase 1 种子用户验证通过，确认产品有价值。不通过则 pivot 或关停。**

### Phase 2 只做 Phase 1 验证后确认需要的事：

| 优先级 | 能力 | 触发条件 |
|---|---|---|
| P0 | 用户注册登录（Better Auth） | 用户问"我的数据保存了吗" |
| P0 | PostgreSQL 迁移（从 SQLite） | 数据量增长或需要多用户隔离 |
| P0 | Personal Model 反馈到 AI Prompt | 积累 ≥ 7 天数据后，下次 AI 调用附带个人模型 |
| P1 | AI 追问改进（多轮对话支持） | 目标标准化准确率 < 70% |
| P1 | 路线编辑/微调（非融合） | 用户反馈"路线方向对但细节不对" |
| P1 | 复盘后自动调整下周计划 | 用户执行率持续 < 50% |
| P2 | 更好的 UI（非拖拽） | 用户反馈"操作太复杂" |
| P2 | Playwright E2E 测试 | 手动测试开始跟不上 |
| P3 | 三路线（增加混合路线） | 用户反馈"两条路线都不完全合适" |
| P3 | 四象限拖拽 | 用户数量 > 50 且有明确需求 |
| P3 | OpenAPI 契约 | 开始有外部调用需求 |

### MVP 1.0 不做（同原计划）：

- ❌ 不引入 LangGraph、多 Agent、向量数据库
- ❌ 不做周/月复盘
- ❌ 不做复杂长期记忆（RAG）
- ❌ 不做第三方日历集成
- ❌ 不做移动端原生应用
- ❌ 不做文件上传
- ❌ 不做推送通知

---

## Phase 3：长期演进（3-12 个月）

| 时间 | 能力 | 触发条件 |
|---|---|---|
| 3-6 个月 | **Memory 系统**：基于历史对话和行为的长期记忆（RAG + 向量） | Personal Model 数据点 > 1000 |
| 3-6 个月 | **Personal Model 深度学习**：不只统计，而能预测用户行为（"你下周可能会在这个任务上拖延"） | 用户使用 > 30 天 |
| 6-9 个月 | **多目标管理**：2+ 个目标的协调、优先级和资源分配 | 用户主动创建第 2 个目标 |
| 6-9 个月 | **Agent 主动建议**：AI 不只响应，而在检测到风险时主动介入 | 用户留存稳定 |
| 9-12 个月 | **Calendar 集成**：真正融入用户生活，理解时间结构 | 用户请求 > 10 次 |
| 12+ 个月 | **开放 API + 社区**：让其他开发者基于 Personal Model 构建垂直应用 | 用户基数 > 1000 |

---

## AI 核心能力总结

### AI Intelligence Layer 三层架构

```
┌─────────────────────────────────┐
│  Layer 3: Learning (Future)     │ ← 长期记忆、RAG、预测模型
│  AI 越用越懂你                   │
├─────────────────────────────────┤
│  Layer 2: Personal Model (MVP)  │ ← 行为模式、偏好、校准
│  从数据中学习你的模式            │
├─────────────────────────────────┤
│  Layer 1: Reasoning Engine      │ ← Goal Understanding + Route Generation
│  理解你、为你规划                 │
└─────────────────────────────────┘
```

### 核心 AI 设计原则

1. **AI 理解 > AI 生成**：先让 AI 真正理解用户，再让 AI 生成内容。理解不准确，生成无意义。
2. **假设显性化**：AI 的所有推断必须标注来源，用户必须能区分"你说的"和"AI 猜的"。
3. **Personal Model 从 Day 1 开始**：即使最初只是统计数组，也比"以后再做"好 100 倍。数据飞轮需要时间。
4. **结构化输出 + 用户最终确认**：AI 输出格式可靠（Zod 校验），但内容由用户最终确认。AI 是顾问，不是决策者。
5. **每次 AI 调用携带历史**：不是"第一次见你"，而是"基于我目前对你的了解"。

---

## Claude Code 与 Codex 分工

| 阶段 | Claude Code 职责 | Codex 职责 |
|---|---|---|
| **Phase 0** | 设计访谈问题、手工模拟流程、Prompt 原型迭代 | 不需要 |
| **Phase 1 基座** | AI SDK 封装设计、prompt 架构、Zod Schema 设计 | Next.js 脚手架、SQLite 初始化、UI 骨架 |
| **Phase 1 理解引擎** | Goal Understanding Prompt 设计与迭代、追问策略 | 目标输入页 UI、理解结果展示页、API Route 实现 |
| **Phase 1 路线生成** | Route Generation Prompt 设计与差异化验证规则 | 路线比较页 UI、路线选择交互、保存逻辑 |
| **Phase 1 任务+执行** | Task Generation Prompt、复盘 Prompt、Personal Model 字段设计 | 任务确认页、今日执行页、复盘页、Personal Model 采集代码 |
| **Phase 1 测试** | AI 输出质量评估、prompt 效果对比 | 单元测试、E2E 手动测试 |
| **Phase 2** | AI 层架构升级、Personal Model 反馈到 Prompt 的策略 | 用户认证、PostgreSQL 迁移、部署运维 |
| **Phase 3** | Agent 行为设计、Memory 检索策略、多目标协调算法、预测模型设计 | 工程可靠性、性能优化、规模扩展、API 设计 |

**核心原则：**
- Claude Code 负责"AI 怎么变聪明"：prompt、理解引擎、推理策略、Personal Model 算法
- Codex 负责"产品怎么跑起来"：UI、数据库、API 管道、部署
- **不让两个 AI 写同一个文件**，避免重复工作和冲突

---

## 风险与缓解

| # | 风险 | 严重度 | 缓解措施 |
|---|---|---|---|
| 1 | 用户不会持续使用 | 🔴 最高 | Phase 0 先验证需求；MVP 0.1 硬性要求 5 天连续使用才进 Phase 2 |
| 2 | AI 生成内容没有价值 | 🔴 高 | Phase 0 Prompt 原型阶段大量测试；每条建议引用用户画像 |
| 3 | 产品过度复杂 | 🟡 中高 | MVP 0.1 代码行数目标 < 3000；超过即视为 scope creep |
| 4 | 数据壁垒不足 | 🟡 中 | Personal Model 从 Day 1 采集；数据不可简单导出为有用格式 |
| 5 | 开发周期过长 | 🔴 最高 | Phase 1 硬性 4 周上限；每周发布可用版本；设定 kill criteria |

### Kill Criteria（任何一个触发即暂停并重新评估）

1. Phase 0 结束：0 个用户说"我会用"
2. Phase 1 第 2 周末：核心闭环不可用
3. Phase 1 第 4 周末：0 个用户连续使用 5 天
4. Phase 1 第 4 周末：AI 内容"觉得有用"率 < 40%

---

## 稳定接口与枚举（MVP 0.1 冻结）

```typescript
// 目标状态
export type GoalStatus = 'draft' | 'active' | 'completed';

// 任务状态
export type TaskStatus = 'planned' | 'done' | 'skipped' | 'partial';

// 路线状态
export type RouteStatus = 'draft' | 'selected' | 'rejected';

// 路线类型
export type RouteStrategy = 'depth_first' | 'breadth_first';

// 时间块
export type TimeBlock = 'morning' | 'afternoon' | 'evening';

// 四象限
export type Quadrant =
  | 'important_urgent'
  | 'important_not_urgent'
  | 'urgent_not_important'
  | 'not_important_not_urgent';

// 目标类型
export type GoalType =
  | 'skill_acquisition'
  | 'career_change'
  | 'health_fitness'
  | 'finance_investment'
  | 'creative_output'
  | 'relationship'
  | 'learning_education'
  | 'habit_formation'
  | 'other';
```

---

## 30 天执行日历

| 周 | 天 | 核心产出 | 阶段门 |
|---|---|---|---|
| **W1** | 1-7 | Phase 0：访谈 5 人、手工模拟 3 人、Prompt 原型 20+ | ≥2 人说"会用" → W2 |
| **W2** | 8-11 | 工程基座 + AI 理解引擎 | 5 种目标类型测试通过 |
| **W2** | 12-14 | 路线生成 + 任务生成 | 整链路可走通 |
| **W3** | 15-17 | 每日执行 + 复盘 + Personal Model | 闭环完成 |
| **W3** | 18-20 | 部署 + 种子用户测试开始 | 3 个用户上线 |
| **W4** | 21-27 | 种子用户持续使用 7 天 | 每日记录数据 |
| **W4** | 28 | Go/No-Go 决策 | 满足标准 → Phase 2；否则 pivot |

---

## 计划自检结果

- **MVP 0.1 聚焦：** 核心闭环（目标→理解→路线→任务→执行→复盘）在 4 周内可完成。
- **AI 优先：** Goal Understanding Engine、差异化路线 Prompt、Personal Model 从 Day 1 采集是本次修订的核心升级。
- **极简技术栈：** Next.js + SQLite + Vercel AI SDK，单项目全栈，不引入独立后端、Docker、CI、Alembic。
- **数据飞轮：** Personal Model 从第一行代码开始设计采集点，不是"未来版本"的功能。
- **Kill Criteria：** 每个阶段都有明确的退出条件，避免沉没成本陷阱。
- **MVP 1.0 条件触发：** 不预设进入 MVP 1.0，所有 Phase 2 功能由 Phase 1 数据驱动决策。
- **明确不做：** 多 Agent、向量数据库、LangGraph、拖拽、周/月复盘、第三方集成、移动端原生。
