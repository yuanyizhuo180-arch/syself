# AI 个人规划与执行产品市场调研

> 调研日期：2026-07-19（Asia/Shanghai）  
> 调研范围：GitHub 开源项目、产品官网/App Store、Reddit，以及可被搜索引擎验证的 TikTok/YouTube 相关线索。价格均为调研时公开页展示的价格，可能随地区、税费与促销变化。

## 1. 被调研项目的定义

本项目不是普通待办清单，而是面向个人长期目标的 AI 规划闭环：

`目标澄清 → 两条可选路径 → 容量约束下的周计划 → 今日执行 → 快速反思 → 个人模型校准`

因此，竞品按“替代整个闭环的直接竞品”“替代某一环的邻近竞品”“开源/可自建替代方案”划分，而没有把所有待办软件都混入直接竞品。

## 2. 结论摘要

1. **“目标转任务”已高度同质化。** Goals、LifePilot、Archion、PathPilot、GoalPilot 等均把“输入目标—AI 拆成每天可做的事”作为首屏卖点。仅以 AI 拆解和每日任务进入市场，难以形成防御力。
2. **用户真正付费的两条路径不同。** 一类为忙碌职业人士购买“日程自动排程与重排”（Motion、Reclaim、Tiimo）；另一类为个人成长用户购买“低压陪伴、反思和问责”（LifePilot、Journal Ninja、GoalPilot）。本项目更适合从后者切入，再逐步获得前者的排程能力。
3. **最有价值的空位是“解释型个性化”。** 多数产品会重排，但少有产品把“为什么今天给你这 5 个任务、它如何来自你的目标/选择/过去行为、下周会怎样因你的反馈改变”解释清楚。本项目的「假设显性化 + 用户确认 + Personal Model」正好命中这个空位。
4. **不建议首发宣称全能 Life OS。** Reddit 上的近期反馈直接指出“任何目标 → 计划”会被 Notion、Todoist 和通用大模型迅速抹平；更稳妥的切入是聚焦一个高频人群和一个明确结果，例如“有全职工作的转行者/技能学习者，用有限每周时长完成一个项目”。
5. **价格锚点已很明确。** 新兴消费级产品多落在 **US$2–15/月** 或 **US$30–50/年**；日程/团队生产力产品落在 **US$12–20/席/月**。MVP 可采用免费试用/免费一个目标，Pro 订阅约 US$5–9/月（或 US$39–59/年）的验证型定价。

## 3. 商业竞品地图

| 产品（来源） | 主要受众 | 收费情况（公开价） | 主要功能 | 差异化能力 | 与本项目的关系 |
|---|---|---|---|---|---|
| [Goals](https://www.makegoals.app/pricing)（官网、iOS/Android） | 想把个人目标变成日常行动的轻量用户 | 免费：最多 3 个目标、5 次 AI 请求/日；Pro **US$1.99/月** | AI 分步计划、每日行动/签到、连续记录、共享目标 | 极低价、无账号即可开始 | **最直接的低价竞品**；缺少目标澄清、路线取舍、容量与行为建模。 |
| [LifePilot](https://getlifepilot.org/)（官网、App Store、Reddit 发布） | 容易被任务堆积压垮、希望每天被明确告知做什么的人 | 免费 2 个目标；Pro **€4.99/月或 €29.99/年**，7 天试用 | 周度 AI 计划、每日固定 4 个行动、适应式调整、周度洞察、日历同步 | “每天只做 4 件事”，以消除决策疲劳为核心 | **最相似的产品体验**；本项目可用“多路径选择 + 任务完成标准/最低行动 + 更强反思”拉开距离。 |
| [Archion](https://archionapp.com/)（官网、GitHub、MCP） | 个人项目、开发者、创业者 | 免费 1 个活跃目标；Pro **฿290/月**；Team **฿890/月** | 分阶段/每日任务、进度追踪、AI check-in、自动重规划、周报、Markdown 导出、REST/MCP | 将 AI 目标管理产品化为“个人项目经理”，并开放 API/MCP | 直接竞争执行与复盘；它偏项目交付，本项目可偏“个人约束与行为学习”。 |
| [GoalPilot AI](https://goalpilot.net/)（官网、App） | 拖延、需要外部问责的人 | 免费 2 个目标；Pro **US$8/月**；Elite **US$15/月** | AI 教练、目标计划、干扰屏蔽、连续记录、分析、日/周报告 | 问责 + 干扰屏蔽 + 游戏化 | 说明“执行阻力”比生成计划更可变现；可借鉴温和的失败反馈，不必复制游戏化。 |
| [PathPilot AI](https://goalplanner.org/)（官网、iOS/Android） | 学生、考证/学习目标用户 | 14 天免费试用；公开页未显示试用后价格 | 目标分解、里程碑/依赖/工时、适应式日历、资源库、导师匹配、CSV | 将学习目标、内容资源和真人导师纳入路径 | **适合警惕的垂直竞品**；教育/考证是潜在优先切入垂类。 |
| [StrideFlow](https://strideflow.ai/)（官网、iPhone Beta、TikTok/Instagram 链接） | 有工作、家庭、睡眠/恢复约束的目标用户 | 私测期，价格未公布 | 采集可用时间、工作节律、固定承诺与恢复时间；生成可移动的周计划 | 明确反对 streak，强调“计划必须经受真实一周” | 与本项目“容量限制”理念高度一致；其公开页面已把现实约束做成核心叙事。 |
| [Tiimo Co-planner](https://www.tiimoapp.com/product/ai-planning)（官网、iOS/Android/Web） | 神经多样性人群，尤其执行功能与时间感困难的用户 | 基础版免费；报道显示 Pro **US$11.99/月或 US$45/年** | 脑内清单转步骤、时长预估、优先级、语音、例行提醒、对话式改期 | 强视觉化、低认知负荷、面向 ADHD/神经多样性设计 | 最强的“今天怎么执行”竞品；本项目应学习可视化与宽容式重排，避免医疗/诊断宣称。 |
| [Journal Ninja](https://journalninja.com/)（官网、iPhone） | 重视自我成长、情绪觉察和持续反思的用户 | 免费；Pro **₹249/月、₹1,499/年、₹9,999 终身** | 晨晚反思、AI 洞察、每日任务、目标/连续记录、周报、语音日记、隐私导出 | “Mirror / Future You”、多教练语气、私密性承诺 | 替代本项目反思层；其洞察围绕日记，本项目可围绕**真实执行数据**提出建议。 |
| [Gritly](https://www.gritly.app/)（官网、iOS/Android/Web） | 需要目标管理、习惯、家庭/群组协作的泛个人成长用户 | 提供免费起步；公开检索页未列明确金额 | 年/月/周/日目标、AI 教练、智能日历、分析、反思、家庭/群组日历 | “Plan–Act–Rise”全周期与社交/家庭共享 | 功能面较宽，提醒本项目早期必须克制范围，以闭环质量替代功能数量。 |
| [Kibo](https://www.kibo.so/)（官网） | 寻求 AI life coach 与每周承诺的人 | 有公开分层定价页，具体金额以结账页为准 | 目标转结构化行动计划、每周承诺、问责 | 把产品包装为 life coach 而非任务软件 | 是品牌定位参考：情绪上的“被支持”与功能上的“可执行”要同时成立。 |
| [Smart Planner AI](https://smartpln.com/)（官网） | 学生、自由职业者、专业人士及家庭事务管理者 | 公开页未清晰列价 | 将课程/项目/例行/提醒纳入日程，Google Calendar、WhatsApp 提醒、时间块、分析 | WhatsApp 作为交互与提醒入口 | 偏自动排程和外部入口；本项目 MVP 无需先做集成，但后续应把日历作为高优先级验证项。 |
| [Motion](https://www.usemotion.com/pricing?tool=motion)（官网） | 忙碌知识工作者与团队 | 订阅制；以官网结账页实时价格为准 | AI 任务管理、自动日程、项目管理、团队计划、会议与日历整合 | 最成熟的“AI 自动排程”品牌，工作/团队导向 | **预算和体验基准**；不是本项目的首要正面战场，先避免与其日历/团队能力硬碰硬。 |
| [Reclaim](https://reclaim.ai/pricing)（官网） | 已经有 Google/Outlook 日历与任务工具的个人和团队 | Free；Starter **US$12/席/月**，另有 Business | 5 类 AI agent（专注、习惯、缓冲、智能会议等）、任务自动排程、多日历和第三方集成 | “保护时间”而不仅是排任务；深度连接现有工具 | 代表日程自动化赛道；本项目应在连接日历前先证明“什么值得排”。 |
| [Sunsama](https://www.sunsama.com/pricing)（官网） | 希望平静、刻意地安排工作日的知识工作者 | 付费订阅，官网以约 **US$1/工作日** 为价值锚点 | 日计划仪式、工作量估计、任务/日历/邮件整合、反思与计划分享 | 反自动化、强调用户亲自选择的 daily planning ritual | 与本项目“AI 顾问、用户最终确认”高度兼容，是交互原则上的重要参照。 |
| [Taskade](https://www.taskade.com/learn/account/premium-plans)（官网、团队协作） | 自由职业者、小团队、需要 AI 工作流的人 | Free；Starter **US$6/月**；Pro **US$16/月**；Business **US$40/月**（年付口径） | AI agent、自动化、任务/笔记/协作/视频、模板和多工作区 | 从任务工具扩展为可构建 AI 工作流的平台 | 广义替代品；它不以个人行为模型为中心，反而可成为未来的导出/集成对象。 |

### 直接竞品优先级

**P0（必须每月跟踪）**：Goals、LifePilot、Archion、GoalPilot、StrideFlow、Tiimo。它们覆盖了本项目最关键的价值承诺：从目标到今日行动、现实容量、重规划与执行阻力。

**P1（用于借鉴/防守）**：Journal Ninja、PathPilot、Gritly、Kibo、Smart Planner AI。它们分别强在反思、教育垂类、社交目标、AI 教练与外部入口。

**P2（成熟替代品）**：Motion、Reclaim、Sunsama、Taskade。它们的优势是日历/工具生态和品牌，短期不宜作为功能追赶对象。

## 4. GitHub 与可自建替代方案

这些项目未必拥有商业化用户规模，但会降低“个人 AI 操作系统”的复制门槛；同时也暴露了大众用户不愿自己搭建的缺口。

| 项目 | 来源与链接 | 重叠能力 | 对项目的启示 |
|---|---|---|---|
| [Dex](https://github.com/davekilleen/dex) | GitHub；Claude 驱动的 AI Chief of Staff | 周计划、晨晚日志、周复盘、战略规划、关系与任务同步 | 把“个人操作系统”配置成角色专属；本项目可提供更低门槛的开箱即用闭环。 |
| [PAI](https://github.com/mnott/PAI) | GitHub；Personal AI Infrastructure | `/plan` 规划周/月、`/review` 日/周/月复盘、`/journal` 记录 | 证明命令式个人助理已成熟；产品化关键是把输出转成可信、易执行的 UI。 |
| [obsidian-claude-pkm](https://github.com/ballred/obsidian-claude-pkm) | GitHub；Obsidian + Claude Code PKM | 晨间计划、每日回顾、周复盘、目标对齐与行为模式学习 | 与本项目的 Personal Model 设想最相近；应突出无需管理 Markdown/Obsidian 的易用性。 |
| [claude-chief-of-staff](https://github.com/mimurchison/claude-chief-of-staff) | GitHub；Claude Code 个人操作系统 | 个人助理、工作优先级与上下文 | “Chief of Staff”是活跃的开源叙事，适合用于竞品监控但不建议照搬过于企业化的措辞。 |
| [Claudia](https://github.com/kbanc85/claudia) | GitHub；终端 AI Chief of Staff | 承诺跟踪、战略思考、反思、跨工具连接与证据链 | 可借鉴“建议有出处”的证据链；它面向重度技术用户。 |
| [Dayflow](https://github.com/JerryZLiu/Dayflow) | GitHub；local-first 自动工作日志 | 根据实际屏幕行为生成工作时间线、今日重点/阻塞与周复盘 | 为后期“以真实行为而非自述校准计划”提供了一个隐私优先的方向。 |

## 5. 社交媒体与需求信号

### 已验证的信号

- TikTok 的 **“monthly curriculum”** 热潮是很贴近本项目的需求侧信号：用户选择一个月度自我提升主题，用小目标、周度跟踪和月底反思建立柔性结构；报道同时提醒不要把它变成过度优化或消费主义。见 [Marie Claire 对该趋势的拆解](https://www.marieclaire.co.uk/life/health-fitness/monthly-curriculum-trend)。
- [StrideFlow 官网](https://strideflow.ai/)直接链接其 TikTok、Instagram、X，并将传播语句定为“真实一周而非理想一周”；这说明“现实约束、恢复、突发事件”是当前内容营销中可被理解的痛点。
- [LifePilot 的 Reddit 发布帖](https://www.reddit.com/r/IMadeThis/comments/1tavz11/i_built_an_ai_planner_that_tells_you_exactly_what/)把痛点表述为“打开空白页便拖延”，而非“缺少更多任务”；其解决方式是每天仅给 4 个行动。
- [近期 Reddit 讨论](https://www.reddit.com/r/ProductivityApps/comments/1tjhbxr/i_built_an_app_that_can_turn_any_goal_into_a/)出现了非常关键的质疑：通用的“目标 → 完整计划”是否很快会成为每一个待办产品的标配？讨论中给出的可行回答是垂直人群、专属 onboarding、社区和更深的个人化。

### 平台检索限制

TikTok 对自动化检索有 robots 限制，YouTube 对“AI planner”类关键词的搜索结果噪声较高。本次只把能通过官网、App Store、新闻或具体帖子交叉验证的信息写入结论；**没有把无法验证的短视频播放量、评论量或网红推荐作为市场规模证据**。下一轮建议人工采样 30–50 条 TikTok/YouTube Shorts，编码其用户话术、评论中的替代品与愿付价格。

## 6. 市场受众与优先切入建议

| 人群 | 核心 Job-to-be-Done | 现有替代品 | 愿付费信号 | 建议 |
|---|---|---|---|---|
| 有全职工作、推进副业/转行/考证的人 | “我只有有限时间，告诉我本周最值得做什么，漏掉后怎么恢复。” | ChatGPT、Notion、LifePilot、PathPilot、Motion | 为节省规划时间与降低失败感付费 | **首选 ICP**：与项目的目标理解、容量限制、路线选择和复盘全部贴合。 |
| 任务超载的知识工作者 | “把会议、任务和日历排进可执行的一天。” | Motion、Reclaim、Sunsama、Akiflow | 已习惯为日程自动化按月付费 | 第二阶段再进入；需日历集成和高可靠排程。 |
| 神经多样性/执行功能困难人群 | “降低开始任务、记忆步骤与时间估计的摩擦。” | Tiimo、Goblin Tools、Structured | 对视觉化、提醒、低认知负荷高度敏感 | 可作为设计灵感；未经研究与合规准备，不应直接宣称医疗/ADHD 效果。 |
| 自我成长/情绪觉察人群 | “从反思中看见模式，得到温和而具体的下一步。” | Journal Ninja、Reflection、Rosebud | 对隐私、教练语气、日记仪式付费 | 可作为第二条增长线，但不要把 MVP 做成心理健康服务。 |
| 学生/学习者 | “从大纲/考试目标得到可完成的学习路径。” | PathPilot、各类学习计划 App | 目标/截止日期明确、传播性好 | 垂直聚焦时很有潜力，但需要更强的学习资源与课程设计。 |

## 7. 建议的产品定位与差异化

### 不建议的定位

“用 AI 把你的任何目标变成每日任务。”

这是已经被大量低价 App 占领的通用承诺，也很容易被通用大模型和待办工具吸收。

### 建议的首发定位

**“为时间有限的个人目标者，先帮你选一条适合自己的路径，再把它变成这一周真正做得完的行动；每次执行反馈都会让下周更贴合你。”**

它应落实为四个可验证差异：

1. **先理解、后生成。** 明确展示 AI 从用户输入中确认的事实、仍在假设的内容与需用户决定的内容；不把一次 prompt 当作“个性化”。
2. **路线可选择，而不是单一最优解。** 用至少两条真实差异的策略（例如稳妥深耕 vs 探索广度）承认规划存在价值取舍，并把决定权留给用户。
3. **容量与最低行动。** 任务必须有完成标准、预计时长、精力要求和最低行动；周计划默认只占可用时间的一部分，主动预留生活摩擦。
4. **解释型个人模型。** 每次计划调整都给出可理解的原因，例如“你连续两次将高精力任务延后，所以本周先把它安排到上午，并把时长从 90 分钟校准为 60 分钟”。用户可查看、纠正和关闭这些推断。

## 8. MVP 与商业化建议

### 保持的 MVP 核心

- 目标澄清与用户确认
- 两条有真实权衡的路径
- 容量受限的首周任务（含最低行动、完成标准）
- 今日执行、跳过原因与 1 分钟反思
- 基础 Personal Model 数据采集

### 暂缓的能力

- 自动日历重排、跨 SaaS 整合、团队协作、AI agent 市场、复杂长期记忆、完整习惯系统
- 原因：这些正是 Motion/Reclaim/Taskade 的强项，且会把验证周期从“是否提升持续执行”偏移到“是否能替代工具栈”。

### 定价实验（不是上线承诺）

| 方案 | 建议 | 验证什么 |
|---|---|---|
| Free | 1 个活跃目标、每周有限次 AI 重规划、完整执行/反思 | 用户是否形成闭环与留存 |
| Pro | **US$5–9/月** 或 **US$39–59/年**；无限目标/重规划、周度洞察、个人模式解释 | 用户是否愿为“持续适配”而非首个计划付费 |
| 不做早期按量计费 | 暂不单独卖 AI credits | 避免让用户在最需要调整计划时犹豫是否消耗额度 |

## 9. 接下来 30 天的市场验证清单

1. 招募 8–12 位首选 ICP（全职工作 + 一个明确个人目标 + 每周可投入 3–10 小时），连续使用 14 天。
2. 与 LifePilot / Goals 做对照访谈：问“你为什么在第 N 天不打开它”“AI 给出的哪一个建议你改了，为什么”。
3. 给每次 AI 输出增加“有用 / 无用 + 原因”与“我接受 / 我修改 / 我拒绝”的事件采集；这是 Personal Model 的第一批高价值训练/规则数据。
4. 用两个信息页测试定位：A「AI 每日计划」；B「现实约束下的目标路径与每周校准」。比较注册意愿与访谈复述率。预计 B 更能建立差异。
5. 建立竞品月度监控表，P0 产品跟踪：价格、免费额度、首次体验、重规划依据、反思功能、日历集成、隐私承诺。

## 10. 关键来源

### 官方产品与价格

- [Goals 官方价格页](https://www.makegoals.app/pricing)
- [LifePilot 官方网站与价格](https://getlifepilot.org/)
- [Archion 官方网站与价格](https://archionapp.com/)
- [GoalPilot AI 官方网站与价格](https://goalpilot.net/)
- [Tiimo AI Co-planner 功能页](https://www.tiimoapp.com/product/ai-planning)
- [Journal Ninja 官方功能与价格](https://journalninja.com/)
- [Reclaim 官方价格页](https://reclaim.ai/pricing)
- [Sunsama 官方价格页](https://www.sunsama.com/pricing)
- [Taskade 官方方案说明](https://www.taskade.com/learn/account/premium-plans)

### 社交与第三方验证

- [TikTok monthly curriculum 趋势分析](https://www.marieclaire.co.uk/life/health-fitness/monthly-curriculum-trend)
- [LifePilot 在 Reddit 的产品发布](https://www.reddit.com/r/IMadeThis/comments/1tavz11/i_built_an_ai_planner_that_tells_you_exactly_what/)
- [“通用目标规划会否商品化”的 Reddit 讨论](https://www.reddit.com/r/ProductivityApps/comments/1tjhbxr/i_built_an_app_that_can_turn_any_goal_into_a/)
- [Tiimo 的近期产品体验与价格交叉验证](https://www.techradar.com/computing/websites-apps/timo)

### GitHub

- [Dex](https://github.com/davekilleen/dex)
- [PAI](https://github.com/mnott/PAI)
- [obsidian-claude-pkm](https://github.com/ballred/obsidian-claude-pkm)
- [claude-chief-of-staff](https://github.com/mimurchison/claude-chief-of-staff)
- [Claudia](https://github.com/kbanc85/claudia)
- [Dayflow](https://github.com/JerryZLiu/Dayflow)
