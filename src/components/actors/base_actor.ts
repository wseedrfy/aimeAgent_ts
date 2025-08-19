import { BasicAIClient, AIMessage } from '../../core/ai_sdk';
import { Task } from '../progress_manager';

/**
 * @description 定义一个 Actor 的核心属性和能力
 */
export interface Actor {
    persona: string; // 定义这个 Actor 的人设或角色
    run(task: Task, context: string): Promise<string>; // 定义 Actor 执行任务的入口
}

/**
 * 基础演员类 🤖
 * 所有具体演员的父类，提供了一些通用的属性和方法。
 */
export class BaseActor implements Actor {
    public persona: string;
    protected aiClient: BasicAIClient;

    /**
     * @description 构造函数，初始化一个基础 Actor
     * @param persona - 这个 Actor 被赋予的人设
     * @param aiClient - 用于与 LLM 通信的 AI 客户端
     */
    constructor(persona: string, aiClient: BasicAIClient) {
        this.persona = persona;
        this.aiClient = aiClient;
        console.log(`[BaseActor] 一个新的专家被创建, 角色: "${this.persona}"`);
    }

    /**
     * @description 默认的 run 方法，具体的 Actor 需要重写这个方法来实现自己的逻辑
     * @param task - 需要执行的具体任务
     * @returns {Promise<string>} - 返回任务执行的结果
     */
    public async run(task: Task, context: string): Promise<string> {
        console.log(`[BaseActor] 专家 "${this.persona}" 已就位, 开始执行任务: "${task.description}"`);

        // **核心升级：在 Prompt 中加入完整的上下文信息**
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: this.persona
            },
            {
                role: 'user',
                content: `
                    请根据以下背景信息，来完成当前任务。请只返回最核心、最直接的结果。

                    ---
                    **项目背景信息 (上下文)**:
                    ${context}
                    ---
                    **当前需要你完成的具体任务**:
                    ${task.description}
                `
            }
        ];

        try {
            console.log("[BaseActor] 正在请求 Kimi AI 给出执行方案...,请求信息", messages);
            // 2. 调用 Kimi AI，让它以专家的身份思考并给出结果
            // 这里我们使用 chatText，因为我们期望得到的是一段描述性的文本结果
            const result = await this.aiClient.chatText(messages);

            console.log(`[BaseActor] Kimi AI (在有上下文的情况下)  返回了执行结果。`);
            return result;

        } catch (error) {
            console.error(`[BaseActor] 专家执行任务时出错:`, error);
            return `执行任务 "${task.description}" 失败。`;
        }
    }
}