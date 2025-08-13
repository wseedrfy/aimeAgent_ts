## Aime Agent（LSJ 版本）

目标：复现并增强 Aime 框架，用一个贴近生活的完整场景「策划一场家庭周末露营（2大1小）」来展示动态多智能体系统的端到端运作。该任务包含选址、装备、行程、预算等多环节，并对天气变化等动态信息具备自适应能力。

### 目录结构

```
lsj-demo/aime-agent/
├── src/
│   ├── core/
│   │   ├── dynamicPlanner.ts          # 动态规划器（大脑）
│   │   ├── actorFactory.ts            # 智能体工厂
│   │   ├── dynamicActor.ts            # 动态智能体（ReAct）
│   │   └── progressManager.ts         # 进度管理模块（共享记忆/任务看板）
│   ├── types/
│   │   └── index.ts                   # 类型定义
│   ├── tools/
│   │   ├── updateProgress.ts          # 进度更新系统工具（系统内置）
│   │   ├── webSearch.ts               # 网络搜索工具（MCP/HTTP）
│   │   ├── weatherTool.ts             # 天气查询工具（MCP/HTTP）
│   │   └── mapTool.ts                 # 地图距离工具（MCP，如百度地图）
│   ├── utils/
│   │   ├── logger.ts                  # 日志工具
│   │   └── helpers.ts                 # 辅助函数
│   ├── index.ts                       # 出口（创建实例、导出类型与核心类）
│   └── aimeAgent.ts                   # 主入口（系统协调器）
├── examples/
│   ├── campingPlanner.ts              # 露营规划示例
│   └── basicExample.ts                # 基础示例
├── package.json
├── tsconfig.json
└── README.md
```

---

### 从 mock 到真实实现：分阶段落地计划

下述计划遵循“可运行优先”的策略：先完成稳定的可用 mock 骨架（已就绪），再逐步替换为真实 LLM 推理与 MCP 工具调用。每一步都尽量保证可运行、可观察、可回滚。

#### Phase 0：对齐现状与运行链路（已完成）
- 基于 `examples/basicExample.ts` 与 `examples/campingPlanner.ts`，从入口一路跟进：`AimeAgent.processRequest` → `DynamicPlanner.analyzeAndDecompose` → `ActorFactory.createActorForTask` → `DynamicActor.executeTask (ReAct)` → `ProgressManager`。
- 维持 mock 的 ReAct 工具返回，确保端到端响应结构稳定（含 `success/message/mainTaskId/executionTime/metadata`）。

#### Phase 1：重构目录与类型边界（已完成）
- 拆分为 `core/`、`types/`、`tools/`、`utils/`，保证职责清晰：
  - `core/*` 不依赖具体外部服务；
  - `tools/*` 仅负责具体外部能力封装（MCP/HTTP/SDK），并提供同构接口；
  - `utils/*` 提供日志与通用方法；
  - `types/*` 汇总所有类型与接口。

#### Phase 2：可插拔工具机制（半完成）
- 目标：`ActorFactory` 从“仅选择工具 schema”升级为“可执行工具注册中心”。
- 设计：
  - `ToolRuntime` 接口：定义 `name/description/schema/category` 与可选 `execute(params, context)`。
  - `ActorFactory` 注册 `ToolRuntime`，`DynamicActor.callTool` 改为优先调用 `ToolRuntime.execute`，退化时才使用 mock。
- 产出：
  - `src/tools/*.ts` 提供标准化导出：`createWebSearchTool() / createWeatherTool() / createMapTool() / createUpdateProgressTool(progressManager)`。

#### Phase 3：引入真实 LLM 推理（ReAct）
- 目标：把 `DynamicActor.performReasoning/performObservation` 从规则字符串生成升级为真实 LLM 调用（可选 OpenAI/Bedrock/Anthropic）。
- 设计：
  - `ReasoningProvider` 接口：`generateReasoning(prompt, state)`；
  - 在 `AimeAgentConfig` 中注入 `reasoningProvider`，默认使用 mock，生产使用真实 LLM；
  - Prompt 策略：根据 `roleTemplate + context + progress + lastAction/lastObservation` 生成思考链条。
- 最小闭环：第一轮使用 LLM 产出“策略/下一步行动”，`DynamicActor` 解析出 `tool_call / analysis`。

#### Phase 4：MCP 工具接入（地图/天气/搜索）
- 地图（距离过滤 ≤ 300km）：优先选用 MCP（如“百度地图 MCP”），否则采用公开 HTTP API 并本地计算球面距离。
- 天气：选 MCP（或和风天气/公共气象 API）。
- Web 搜索与评价抓取：选 MCP（如 Tavily/Serper/自建 MCP 爬虫），对“儿童设施/安全性/围栏/室内活动区”等关键词做抽取。
- 接口一致：`execute(params, context)` 返回结构化数据，便于 `observation` 分析。

#### Phase 5：知识检索（露营地 KB）
- 目标：加载“上海周边露营地数据库（100+）”，提供基础字段（经纬度、设施、儿童友好度、价位区间、是否室内活动区）。
- 方案：
  - 简单版：本地 JSON + 关键词/条件过滤；
  - 进阶版：向量检索（FAISS/SQLite + embedding），按相关度召回候选。
- `ActorFactory` 在 `location_search` 注入该 KB 作为默认上下文。

#### Phase 6：进度管理与结论报告标准化
- 已具备 `update_progress` 系统工具；完善“结构化任务结论”：
  - 状态更新（完成/失败）、
  - 结论摘要、
  - 引用指针（文件/URL/记录 ID）。
- 在 `DynamicPlanner.adjustPlan` 中利用结论自动派生“交通预算调整”等二次任务。

#### Phase 7：可观测性与评测
- 指标：每轮 ReAct 的 tokens、工具延时、成功率、计划调整次数、预算约束的违约率等。
- 可视化：把 `ProgressManager` 的数据做成简单 CLI/网页看板（后续）。

---

### 露营任务完整演示（ReAct 摘要）

1) 任务分解（家庭露营总策划）
- 子任务1：筛选上海周边 300 公里内亲子露营地（儿童设施、安全、卫生间）。
- 子任务2：结合设施与天气，制定装备清单（必备/可选）。
- 子任务3：两天行程规划（出发、活动、返程）。
- 子任务4：预算跟踪（确保 ≤ 2000 元）。

2) 调度子任务1（明确需求：≤300km、周六晴/周日小雨、儿童设施）

3) 工厂实例化“亲子露营地筛选专家”
- 工具：`mapTool`、`weatherTool`、`webSearch`、`updateProgress`、露营地 KB。

4) ReAct 执行（推理 → 行动 → 观察）
- 推理：圈定 300km 范围，排除中雨以上区域，优先儿童设施、安全、室内活动区。
- 行动：地图筛 28 个 → 天气过滤剩 16 个 → 评价抽取与距离校验 → 候选 3 个（淀山湖/太湖畔/杭州湾湿地）。
- 观察：记录要点与证据。

5) 进度更新
- “已筛选 28 个，天气过滤后 16 个”。
- “候选 3 个：淀山湖（80km，儿童设施全）、太湖畔（280km，室内区）、杭州湾（200km，性价比高）”。

6) 评估与迭代
- 动态规划器接收结论，标记完成并派生“交通预算调整”子任务；随后调度装备与行程相关任务。

---

### 快速开始

1) 安装与构建

```bash
pnpm i # 或 npm i / yarn
pnpm build
```

2) 运行示例（建议使用 ts-node 或先构建）

```bash
pnpm ts-node examples/campingPlanner.ts
```

---

### 后续工作清单（优先级由高到低）

- 接入真实 LLM 推理（Phase 3）。
- MCP 工具标准化并打通执行链（Phase 4）。
- 引入露营地 KB 的结构化检索（Phase 5）。
- 结构化结论报告与自动计划调整（Phase 6）。
- 指标采集与可视化（Phase 7）。

参考：
- 原仓库：`https://github.com/jiahao-jayden/aime-agent`
- 论文：`https://arxiv.org/pdf/2507.11988`


