import { ProgressManager, Task } from "./components/progress_manager";
import { DynamicPlanner } from "./components/dynamic_planner";
import { ActorFactory } from "./components/actor_factory";
import { BasicAIClient, createDefaulAIClient, AIMessage } from "./core/ai_sdk";
import { MemoryModule } from "./components/memory_module";
import { UnifiedToolManager, MultiMCPServerConfig } from "./components/tools/executor/unified_tool_manager";
import { UserInputTool } from "./components/tools/user_input_tool";

// 新增一个配置类型
export interface AimeFrameworkConfig {
    mcpConfig?: MultiMCPServerConfig; // 如果是 mcp 策略，则需要这个配置
}

// 定义一个类型，用于选择策略
export type ToolExecutionStrategy = "local" | "mcp";
/**
 * Aime 框架总指挥 🚀 (语义决策最终版)
 * 采用“关键词快速筛选 + AI深度决策”的分层模式来判断任务性质。
 */
export class AimeFramework {
    private progressManager: ProgressManager;
    private planner: DynamicPlanner;
    private actorFactory: ActorFactory;
    private aiClient: BasicAIClient;
    private maxTurns: number = 51;
    private memory: MemoryModule;
    private toolManager: UnifiedToolManager; // 使用统一工具管理器
    /**
     * @description 构造函数，初始化所有核心组件
     */
    constructor(private config: AimeFrameworkConfig) {
        this.progressManager = new ProgressManager();
        this.planner = new DynamicPlanner(this.progressManager);
        // this.actorFactory = new ActorFactory();
        this.aiClient = createDefaulAIClient();
        this.memory = new MemoryModule();
        this.toolManager = new UnifiedToolManager(); // 创建“统一总管”

        //将“统一总管”传给工厂
        this.actorFactory = new ActorFactory(this.memory, this.toolManager);
        console.log("[AimeFramework] 总指挥已启动 (统一工具总线版)。");

        console.log("[AimeFramework] 总指挥已启动，所有组件准备就绪。");
    }

    /**
     * @description 框架的主运行函数 (分层决策最终版)
     * @param goal - 用户输入的顶层目标
     */
    public async run(goal: string): Promise<void> {
        // ... 这部分代码和上一版完全相同，无需改动 ...
        console.log(`[AimeFramework] 接收到新目标: "${goal}"，开始运行...`);

        // 在运行开始时，初始化“统一总管”
        await this.initializeTools();

        // run 方法的主循环逻辑
        this.progressManager.initializePlan(goal);

        let turn = 0;
        while (turn < this.maxTurns) {
            turn++;
            console.log(`\n============== Turn ${turn} ==============`);
            this.progressManager.printProgress();

            // **核心升级点 1：优先检查是否有需要复盘的父任务**
            const parentToReview = this.progressManager.findParentTaskToReview();
            console.log("[AimeFramework] 检测到父任务", parentToReview);

            if (parentToReview) {
                console.log(
                    `[AimeFramework] 检测到父任务 #${parentToReview.id} 的子任务已全部完成，优先进行复盘...`
                );
                await this.planner.reviewAndRefinePlan(parentToReview);
                // 复盘后，进入下一个回合，重新评估全局状态
                continue;
            }

            // 如果没有需要复盘的任务，则正常处理下一个待办任务
            const nextTask = this.progressManager.getNextPendingTask();
            if (!nextTask) {
                console.log("[AimeFramework] 所有任务已完成！");
                break;
            }
            console.log(
                `[AimeFramework] 当前处理任务 #${nextTask.id}: "${nextTask.description}"`
            );

            let shouldDecompose = false;
            const simpleDecision = this.isComplexTaskByRules(nextTask);

            if (turn == 1) {
                shouldDecompose = true;
            } else {
                if (simpleDecision === "complex") {
                    console.log("[AimeFramework] (快速决策) -> 任务需要分解。");
                    shouldDecompose = true;
                } else if (simpleDecision === "simple") {
                    console.log("[AimeFramework] (快速决策) -> 任务可直接执行。");
                    shouldDecompose = false;
                } else {
                    console.log(
                        "[AimeFramework] (快速决策) -> 任务性质不明确，启动 [AI裁判] 进行深度分析..."
                    );
                    // **核心升级：在调用 AI 裁判时，传入完整的层级上下文**
                    const parentTask = this.progressManager.findParentOf(
                        nextTask,
                        this.progressManager.getTasks()
                    );
                    shouldDecompose = await this.shouldDecomposeByAI(
                        nextTask,
                        parentTask?.description || null,
                        goal
                    );
                }
            }

            if (shouldDecompose) {
                await this.planner.decomposeTask(nextTask);
            } else {
                // **核心升级：在执行前，先准备好上下文“简报”**
                console.log("[AimeFramework] 正在为专家准备项目简报...");
                const context = this.progressManager.getTaskContext(nextTask);

                const actor = await this.actorFactory.createActor(nextTask);

                console.log(
                    `[AimeFramework] 专家已就位，开始执行任务 (携带项目简报)...`
                );

                const result = await actor.run(nextTask, context);

                //在这里判断专家返回的结果是成功还是失败
                if (result.startsWith('FAIL:')) {
                    // 如果结果以 'FAIL:' 开头，说明任务失败
                    console.log(`[AimeFramework] 检测到任务 #${nextTask.id} 执行失败。`);
                    const reason = result.substring(5); // 提取失败原因
                    this.progressManager.updateTask(nextTask.id, 'failed', reason);
                } else {
                    // 否则，任务成功
                    this.progressManager.updateTask(nextTask.id, 'completed', result);
                }

            }
        }

        if (turn >= this.maxTurns)
            console.log("[AimeFramework] 已达到最大回合数，停止运行。");
        console.log("\n\n========= 最终任务成果 =========");
        this.progressManager.printProgress();

        // 在运行结束后，关闭所有连接
        await this.toolManager.closeAllConnections();

        // 生成最终的整合报告
        await this.synthesizeResults(goal);
    }

    /**
     * @description (第一层决策) 使用关键词语义快速判断任务性质
     * @param task - 需要判断的任务
     * @returns {'complex' | 'simple' | 'ambiguous'}
     */
    private isComplexTaskByRules(task: Task): "complex" | "simple" | "ambiguous" {
        if (task.subtasks.length > 0) return "simple";

        const desc = task.description;
        // const complexKeywords = ['规划', '策划', '安排', '分析', '确定', '研究', '对比', '制定', '设计'];
        const complexKeywords = ["研究", "分析"];
        const simpleKeywords = [
            "列出",
            "查找",
            "查询",
            "获取",
            "购买",
            "预订",
            "发送",
            "确认",
            "检查",
        ];

        if (complexKeywords.some((kw) => desc.includes(kw))) return "complex";
        if (simpleKeywords.some((kw) => desc.includes(kw))) return "simple";

        // 如果没有任何明确的关键词，则认为性质不明确，交由 AI 判断
        return "ambiguous";
        // return 'simple'
    }

    /**
     * @description (第二层决策) 使用 AI 判断一个模棱两可的任务是否需要分解
     * @param task - 需要判断的任务
     * @param originalGoal - 最初的总目标
     * @returns {Promise<boolean>}
     */
    private async shouldDecomposeByAI(
        task: Task,
        parentGoal: string | null,
        originalGoal: string
    ): Promise<boolean> {
        // ... 这个函数和上一版完全相同，无需改动 ...
        const responseSchema = {
            type: "object",
            properties: {
                decision: {
                    type: "string",
                    enum: ["decompose", "execute"],
                    description:
                        "你的判断结果，decompose表示需要分解，execute表示可以立即执行",
                },
                reason: { type: "string", description: "你的判断理由" },
            },
            required: ["decision", "reason"],
        };
        const messages: AIMessage[] = [
            {
                role: "system",
                content: `你是一个任务分析专家。你的工作是根据一个“总目标”和“当前阶段目标”，来判断一个“当前子任务”的性质。
            - 如果这个子任务相对于当前阶段目标来说，是一个还需要拆解的宏观指令，请选择 'decompose'。
            - 如果这个子任务相对于当前阶段目标来说，是一个非常具体、可以立即让一个专家去执行的单一动作，请选择 'execute'。
            你的判断必须紧密围绕“总目标”和“当前阶段目标”来进行。`,
            },
            {
                role: "user",
                content: `
                    **总目标**: 
                    "${originalGoal}"

                    **当前阶段目标 (父任务)**: 
                    "${parentGoal}"

                    ---
                    请判断以下**当前子任务**的性质: 
                    "${task.description}"
              `,
            },
        ];

        try {
            const aiResponse = await this.aiClient.chatJSON(messages, responseSchema);
            console.log(
                `[AimeFramework-AI裁判](基于总目标) 判断理由: ${aiResponse.reason}`
            );
            return aiResponse.decision === "decompose";
        } catch (error) {
            console.error("[AimeFramework-AI裁判] 决策失败:", error);
            return true;
        }
    }

    /**
     * @description (全新功能) 整合所有任务结果，生成一份最终的总结报告
     * @param originalGoal - 最初的总目标，用于给 AI 提供上下文
     */
    private async synthesizeResults(originalGoal: string): Promise<void> {
        console.log("\n\n========= 开始生成最终整合报告... =========");

        // 1. 收集所有已完成任务的结果
        const allResults = this.progressManager.getAllCompletedResults();
        if (allResults.length === 0) {
            console.log("没有可供整合的结果。");
            return;
        }

        // 2. 准备 Prompt，让 Kimi 扮演报告总编
        const messages: AIMessage[] = [
            {
                role: "system",
                content:
                    "你是一位顶级的报告撰写专家和信息整合师。你的任务是根据一个“总目标”和一系列由不同专家提供的“零散的执行结果”，将这些零散信息整合成一份逻辑清晰、内容全面、语言流畅的最终报告。请不要仅仅罗列信息，而是要将它们有机地组织起来，形成一份可以直接交付的完美成果。",
            },
            {
                role: "user",
                content: `
          请根据以下信息，生成最终报告：

          **总目标**: ${originalGoal}

          **零散的执行结果**:
          ${allResults.map((res, index) => `- ${res}`).join("\n")}
        `,
            },
        ];

        try {
            // 3. 调用 Kimi AI 生成报告
            const finalReport = await this.aiClient.chatText(messages);

            console.log("\n\n✅ ========= 最终交付成果 (AI生成) ========= ✅");
            console.log(finalReport);
            console.log("===============================================");
        } catch (error) {
            console.error("[AimeFramework] 生成最终报告失败:", error);
        }
    }

    /**
     * @description (新) 初始化工具管理器，注册所有本地和远程工具
     */
    private async initializeTools(): Promise<void> {
        // 1. 注册所有本地工具
        this.toolManager.registerLocalTool(new UserInputTool());
        // (未来还可以注册更多本地工具...)

        // 2. 如果有 MCP 配置，则注册所有远程服务器
        if (this.config.mcpConfig) {
            await this.toolManager.registerMCPServers(this.config.mcpConfig);
        }
    }

    // **重要**: 我们需要稍微修改一下 buildFullContext 来从 toolManager 获取信息
    private buildFullContext(task: Task) {
        // ...
        // 这个函数现在可以变得更简单，因为它只需要从 progressManager 和 memory 中获取信息
        // Actor 会从 toolManager 自己获取工具列表
        // ...
    }
}
