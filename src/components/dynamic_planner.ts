import { ProgressManager, Task } from './progress_manager';
import { BasicAIClient, createDefaulAIClient, AIMessage } from '../core/ai_sdk';

/**
 * 动态规划器 🧑‍💼
 * Aime 框架的核心组件之一。
 * 负责接收高层目标，并利用大语言模型（LLM）将其分解为可执行的子任务。
 */
export class DynamicPlanner {
    private progressManager: ProgressManager;
    private aiClient: BasicAIClient;

    /**
     * @description 构造函数，初始化规划器
     * @param progressManager - 进度管理器实例，用于操作任务列表
     */
    constructor(progressManager: ProgressManager) {
        this.progressManager = progressManager;
        this.aiClient = createDefaulAIClient(); // 从 ai_sdk 创建 Kimi 客户端
        console.log("[DynamicPlanner] 规划器已初始化，并连接到 Kimi AI。");
    }

    /**
     * @description 分解一个给定的任务，利用 AI 生成子任务列表
     * @param taskToDecompose - 需要被分解的父任务对象
     * @returns {Promise<void>} - 一个在任务分解和更新完成后解决的 Promise
     */
    public async decomposeTask(taskToDecompose: Task): Promise<void> {
        console.log(`[DynamicPlanner] 收到分解任务请求: #${taskToDecompose.id} "${taskToDecompose.description}"`);

        // 1. 定义我们希望 AI 返回的 JSON 格式
        const responseSchema = {
            type: 'object',
            properties: {
                subtasks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: "一系列清晰、可执行的子任务步骤"
                }
            },
            required: ['subtasks']
        };

        // 2. 准备发送给 Kimi 的消息（Prompt Engineering）
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: '你是一个顶级的项目规划专家。你的任务是把一个高层级的目标分解成一系列更小、更具体的、可执行的子任务，子任务要核心有效就行，不要太多，不要重复，不要冗余。请以JSON格式返回结果。'
            },
            {
                role: 'user',
                content: `请将以下任务分解成子任务列表: "${taskToDecompose.description}"`
            }
        ];

        try {
            console.log("[DynamicPlanner] 正在调用 Kimi AI 进行思考...");
            // 3. 调用 AI，并要求它返回符合我们定义的 schema 的 JSON
            const aiResponse = await this.aiClient.chatJSON(messages, responseSchema);

            const subtaskDescriptions: string[] = aiResponse.subtasks || [];
            console.log("ai返回的结果", aiResponse);


            if (subtaskDescriptions.length > 0) {
                // 4. 将 AI 返回的子任务列表添加到我们的“白板”上
                this.progressManager.addSubtasks(taskToDecompose.id, subtaskDescriptions);
                console.log(`[DynamicPlanner] Kimi AI 成功分解了任务，生成了 ${subtaskDescriptions.length} 个子任务。`);
            } else {
                console.log("[DynamicPlanner] Kimi AI 返回了空的子任务列表，无需操作。");
            }

        } catch (error) {
            console.error("[DynamicPlanner] 调用 Kimi AI 失败:", error);
            // 在这里可以添加失败处理逻辑，比如标记任务失败等
        }
    }

    /**
     * @description (全新功能) 复盘一个父任务的完成情况，并决定是否需要调整计划
     * @param parentTask - 需要被复盘的父任务，此时它的所有直接子任务都已完成
     * @returns {Promise<boolean>} - 如果计划有变动（增加了新任务）则返回 true
     */
    public async reviewAndRefinePlan(parentTask: Task): Promise<boolean> {
        console.log(`[DynamicPlanner] 正在对父任务 #${parentTask.id} ("${parentTask.description}") 进行阶段性复盘...`);

        // 1. 收集所有子任务的成果
        const successfulResults = parentTask.subtasks
            .filter(st => st.status === 'completed')
            .map(st => `子任务“${st.description}”的成果是：${st.result || '没有产出'}`
            ).join('\n');
        const failedTasks = parentTask.subtasks
            .filter(st => st.status === 'failed');

        // 如果没有失败的任务，就走原来的“圆满完成”逻辑
        if (failedTasks.length === 0) {
            console.log(`[DynamicPlanner-AI总监] 所有子任务均已成功，评估是否可以关闭父任务...`);
            const childResults = parentTask.subtasks
                .map(st => `子任务“${st.description}”的成果是：${st.result || '没有产出'}`
                ).join('\n');


            // 2. 定义 AI 需要返回的决策格式
            const responseSchema = {
                type: 'object',
                properties: {
                    assessment: { type: 'string', description: '对当前阶段成果的简要评估总结。' },
                    status: { type: 'string', enum: ['completed', 'needs_revision'], description: "判断父任务是'completed'(已彻底完成)还是'needs_revision'(需要修订或补充)。" },
                    new_subtasks: { type: 'array', items: { type: 'string' }, description: "如果需要修订，请列出需要新增的子任务列表。" },
                },
                required: ['assessment', 'status']
            };

            // 3. 准备 Prompt，让 AI 扮演一个严格的项目总监
            const messages: AIMessage[] = [
                {
                    role: 'system',
                    content: '你是一位顶级的项目管理总监，极其注重细节和最终成果的质量。你的任务是审查一个阶段性目标及其所有子任务的执行成果，然后判断这个阶段性目标是否已“圆满完成”，或者是否“需要补充或修正”。'
                },
                {
                    role: 'user',
                    content: `
                    请审查以下项目阶段的完成情况：

                    **阶段性总目标**: "${parentTask.description}"

                    **已完成的子任务及其成果**:
                    ${childResults}

                    **审查要求**:
                    1.  总结一下目前的进展 (assessment)。
                    2.  判断该阶段性总目标是否已经彻底完成 (status: 'completed')，还是说根据现有成果来看，还需要补充一些新的任务才能真正圆满 (status: 'needs_revision')。
                    3.  如果需要补充，请在 'new_subtasks' 字段中列出需要新增的具体任务。
                    `
                }
            ];

            try {
                console.log("[DynamicPlanner] 正在请求 Kimi AI 进行复盘决策...");
                const aiResponse = await this.aiClient.chatJSON(messages, responseSchema);
                console.log(`[DynamicPlanner-AI总监] 评估意见: ${aiResponse.assessment}`);

                if (aiResponse.status === 'needs_revision' && aiResponse.new_subtasks?.length > 0) {
                    console.log(`[DynamicPlanner-AI总监] 决策: 计划需要修订，已新增 ${aiResponse.new_subtasks.length} 个任务。`);
                    // 将 AI 认为需要补充的新任务添加到白板上
                    this.progressManager.addSubtasks(parentTask.id, aiResponse.new_subtasks);
                    return true; // 计划有变动
                } else {
                    console.log(`[DynamicPlanner-AI总监] 决策: 阶段性目标已圆满完成。`);
                    // 如果 AI 认为已经完成，我们就正式把这个父任务的状态也标记为完成
                    this.progressManager.updateTask(parentTask.id, 'completed', aiResponse.assessment);
                    return false; // 计划无变动
                }
            } catch (error) {
                console.error("[DynamicPlanner] AI 复盘失败:", error);
                return false;
            }
        } else {

            // 2. **核心逻辑**: 如果有失败的任务，准备专门的 Prompt 来制定补救计划
            const failureInfo = failedTasks
                .map(st => `子任务“${st.description}”失败了，原因是：${st.result || '未知原因'}`)
                .join('\n');

            const responseSchema = {
                type: 'object',
                properties: {
                    analysis: { type: 'string', description: '对失败原因的简要分析。' },
                    remedial_plan: { type: 'array', items: { type: 'string' }, description: "为解决这些失败而制定的、全新的、可执行的子任务列表。" },
                },
                required: ['analysis', 'remedial_plan']
            };

            const messages: AIMessage[] = [
                {
                    role: 'system',
                    content: '你是一位顶级的、经验丰富的项目危机处理专家。你收到了一个阶段性报告，其中部分子任务失败了。你的工作是：1.分析失败的根本原因。2.制定一个清晰、具体、可执行的补救计划（新的子任务列表），以确保项目能最终成功。'
                },
                {
                    role: 'user',
                    content: `
                    **阶段性总目标**: "${parentTask.description}"

                    **已成功的子任务成果**:
                    ${successfulResults || '无'}

                    **失败的子任务及原因**:
                    ${failureInfo}

                    请根据以上情况，制定一个补救计划。
                `
                }
            ];

            try {
                console.log("[DynamicPlanner] 检测到失败任务，正在请求 Kimi AI 制定补救计划...");
                const aiResponse = await this.aiClient.chatJSON(messages, responseSchema);
                console.log(`[DynamicPlanner-危机专家] 失败分析: ${aiResponse.analysis}`);

                if (aiResponse.remedial_plan?.length > 0) {
                    console.log(`[DynamicPlanner-危机专家] 决策: 已生成 ${aiResponse.remedial_plan.length} 个新的补救任务。`);
                    // 将 AI 制定的新计划添加到白板上
                    // **注意**: 我们将新任务添加到父任务下，让系统在下一轮循环中去执行它们
                    this.progressManager.addSubtasks(parentTask.id, aiResponse.remedial_plan);
                    return true; // 计划有变动
                } else {
                    console.log(`[DynamicPlanner-危机专家] 决策: 无法制定补救计划，父任务失败。`);
                    this.progressManager.updateTask(parentTask.id, 'failed', `无法从子任务的失败中恢复: ${aiResponse.analysis}`);
                    return false;
                }
            } catch (error) {
                console.error("[DynamicPlanner] AI 制定补救计划失败:", error);
                return false;
            }
        }
    }
}