项目：AIME Agent（简版复现）

参考论文：`https://arxiv.org/pdf/2507.11988`

本项目以可读、可运行为目标，复现一个“规划-执行-复盘-整合”的多智能体工作流，支持本地工具与 MCP 工具的统一接入。

### 目录结构
- `src/aime_framework.ts`: 总指挥，驱动全流程（初始化 → 规划/执行循环 → 复盘 → 结果整合）。
- `src/components/progress_manager.ts`: 任务白板，管理任务/子任务、状态、结果与上下文简报。
- `src/components/dynamic_planner.ts`: 动态规划器，调用 LLM 将任务拆解与复盘补强。
- `src/components/actor_factory.ts`: 演员工厂，按任务动态创建专家（如通用 `BaseActor`、`TravelActor`）。
- `src/components/actors/base_actor.ts`: 通用执行者，基于上下文产出文本结果。
- `src/components/actors/travel_actor.ts`: 工具增强执行者，采用 ReAct（思考→动作→观察）并可调用工具。
- `src/components/tools/executor/unified_tool_manager.ts`: 统一工具总线，管理本地与 MCP 工具并统一执行入口。
- `src/components/tools/mcp_client.ts`: MCP 客户端，按命令/脚本启动并连接 MCP 服务器，列举与调用工具。
- `src/core/ai_sdk.ts`: 轻量 AI 客户端（OpenAI/Anthropic 协议切换），支持严格 JSON 与文本输出。
- `src/core/mcp_sdk.ts`: Anthropic 适配的 MCP 客户端（独立封装）。
- `src/mcp/*`: 示例 MCP 服务器脚本（如天气、数学）。
- `src/test/*`: 轻量测试/示例入口。

### 数据流（高层概览）
1. 输入目标 → `AimeFramework.run(goal)` 启动。
2. 初始化工具：`UnifiedToolManager` 注册本地工具与按配置连接 MCP 服务器。
3. 建立白板：`ProgressManager.initializePlan(goal)` 生成根任务。
4. 回合循环：
   - `findParentTaskToReview()` 若父任务子项完成则触发 `DynamicPlanner.reviewAndRefinePlan` 复盘/补强；
   - 否则 `getNextPendingTask()` 取叶子任务：
     - 快速规则判定/LLM 判定是否需要拆解；
     - 需拆解 → `DynamicPlanner.decomposeTask()`；
     - 可执行 → `ActorFactory.createActor()` 产出专家；
       - `BaseActor.run()` 直接产出文本；
       - `TravelActor.run()` 走 ReAct：`think()` 选择 `tool_call`/`final_answer`/`fail_task`；如 `tool_call` → `UnifiedToolManager.executeTool()` → 结果回填到思考历史继续迭代。
   - 子任务完成/失败 → `ProgressManager.updateTask()` 记录状态与结果。
5. 循环结束：关闭所有 MCP 连接 → `synthesizeResults()` 汇总全部完成任务结果，生成最终报告。

### 环境准备
1. Node.js 18+（推荐 20+）
2. 包管理：pnpm 或 npm
3. 可选：配置 LLM 与 MCP 环境变量

建议环境变量（可放 `.env`）：
```
API_KEY=你的LLM密钥
OPENAI_BASE_URL=https://api.moonshot.cn/v1
MODEL_ID=kimi-k2-0711-preview
```
说明：
- `src/core/ai_sdk.ts` 的默认工厂 `createDefaulAIClient` 读取 `API_KEY` 与 `OPENAI_BASE_URL`，默认模型为 `kimi-k2-0711-preview`。
- 如切换到 Anthropic，请在调用时传入 `{ provider: 'anthropic' }` 或设置对应环境变量。

### 安装与运行
1) 安装依赖：
```bash
pnpm i
```

2) 运行核心流程示例（建议新建一个示例入口，或直接在交互中调用框架）：
示例调用（TypeScript 伪代码，供参考）：
```ts
import { AimeFramework } from './src/aime_framework';

const framework = new AimeFramework({
  // 可选：MCP 配置
  // mcpConfig: {
  //   weatherServer: { script: 'src/mcp/hangzhou_weather.ts' },
  // }
});

await framework.run('规划一次杭州三日游并给出行程与预算');
```

3) 运行内置示例/测试：
- 直接执行某个 ts 文件（需全局或本地 ts-node/tsx，可自行选择）：
```bash
npx ts-node src/test/mcp_client_smoke.test.ts
```
或
```bash
npx ts-node src/test/aime_framework.test.ts
```

如使用 `tsx`：
```bash
npx tsx src/test/aime_framework.test.ts
```

说明：`package.json` 当前未内置完整脚本，请按上述命令直接运行对应文件。

### MCP 使用说明（统一工具总线）
- 通过 `UnifiedToolManager.registerLocalTool(tool)` 注册本地工具（示例：`UserInputTool`）。
- 通过 `UnifiedToolManager.registerMCPServers(config)` 批量连接多个 MCP 服务器：
  - 配置项示例：
  ```ts
  const mcpConfig = {
    weatherServer: { script: 'src/mcp/hangzhou_weather.js' },
    mathServer: { command: 'node', args: ['src/mcp/math_server.js'] },
  };
  ```
- `TravelActor` 在 `think()` 阶段会读取 `getAllToolDescriptions()` 并按 JSON 决策选择 `tool_call`，最终由 `executeTool(name, input)` 统一执行，无需区分本地/MCP。

### 开发要点
- 任务流转由 `ProgressManager` 统一管理，任何执行结果需要通过 `updateTask()` 回写。
- 若子任务全部完成，总指挥会优先触发父任务复盘（可能新增补强子任务）。
- ReAct 工具调用失败或信息不足时，`TravelActor` 将返回 `FAIL:` 前缀，框架据此标记失败并进入补救/复盘流程。

### 许可
MIT
