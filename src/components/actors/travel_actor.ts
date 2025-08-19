import { BaseActor } from './base_actor';
import { Task } from '../progress_manager';
import { AIMessage, BasicAIClient } from '../../core/ai_sdk';
import { Tool } from '../tools/base_tool'; // 引入 Tool 接口

/**
 * 旅行专家 ✈️ (工具增强版)
 * 一个配备了工具箱，并能通过 ReAct 模式执行复杂任务的专家。
 */
export class TravelActor extends BaseActor {
  private tools: Tool[]; // 专家拥有的工具箱

  /**
   * @description 构造函数，为专家配备工具
   */
  constructor(persona: string, aiClient: BasicAIClient, tools: Tool[] = []) {
    super(persona, aiClient); // 调用父类的构造函数
    this.tools = tools;
    console.log(`[TravelActor] 专家已配备 ${this.tools.map(tool => tool.name).join(', ')} 工具。`);
  }

  /**
   * @description 重写的 run 方法，实现了 ReAct (Reason + Act) 的核心逻辑
   * @param task - 需要执行的任务
   * @param context - 全局上下文信息
   * @returns {Promise<string>} - 任务的最终执行结果
   */
  public async run(task: Task, context: string): Promise<string> {
    console.log(`[TravelActor] 专家 "${this.persona}" 已就位, 开始 ReAct 模式执行任务: "${task.description}"`);

    // ReAct 循环的历史记录，用于保存每一步的思考和观察
    let history: AIMessage[] = [];
    const maxLoops = 5; // 设置一个最大循环次数，防止意外的无限循环

    for (let i = 0; i < maxLoops; i++) {
      console.log(`\n--- ReAct Loop: Turn ${i + 1} ---`);

      // 1. 思考 (Reason)
      const thoughtProcess = await this.think(task, context, history);
      
      // 2. 决策与行动 (Act)
      if (thoughtProcess.action === 'final_answer') {
        // 如果 AI 认为可以直接回答了
        console.log(`[TravelActor] AI 决策: 已有足够信息，提供最终答案。`);
        return thoughtProcess.final_answer;
      } 
        else if (thoughtProcess.action === 'tool_call' && thoughtProcess.tool_name && thoughtProcess.tool_input) {
        // 如果 AI 决定使用工具
        const toolName = thoughtProcess.tool_name;
        const toolInput = thoughtProcess.tool_input;
        console.log(`[TravelActor] AI 决策: 使用工具 [${toolName}]，输入为: "${toolInput}"`);

        // 3. 观察 (Observe) - 执行工具并获取结果
        const toolResult = await this.executeTool(toolName, toolInput);
        console.log(`[TravelActor] 工具 [${toolName}] 返回结果: "${toolResult}"`);

        // 将本次的工具使用和结果存入历史记录，用于下一次思考
        history.push({ role: 'assistant', content: JSON.stringify(thoughtProcess) });
        history.push({ role: 'user', content: `工具执行结果: ${toolResult}` }); // 模拟 'user' 角色提供工具结果
      } else {
        console.log("[TravelActor] AI 决策异常，返回当前思考内容。");
        return `无法做出明确决策，我的最后思考是：${thoughtProcess.thought}`;
      }
    }

    return "执行任务已达到最大循环次数，但仍未得出最终答案。";
  }

  /**
   * @description 思考（Reason）环节：调用 AI 进行决策
   * @param task - 当前任务
   * @param context - 全局上下文
   * @param history - ReAct 循环的历史记录
   * @returns {Promise<any>} - AI 返回的结构化决策（JSON格式）
   */
  private async think(task: Task, context: string, history: AIMessage[]): Promise<any> {
    const toolDescriptions = this.tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');

    const responseSchema = {
      type: 'object',
      properties: {
        thought: { type: 'string', description: "我的思考过程：分析当前情况，决定下一步行动。" },
        action: { type: 'string', enum: ['tool_call', 'final_answer'], description: "下一步的行动类型。" },
        tool_name: { type: 'string', description: "如果行动是 tool_call，这里是工具的名称。" },
        tool_input: { type: 'string', description: "如果行动是 tool_call，这里是给工具的输入。" },
        final_answer: { type: 'string', description: "如果行动是 final_answer，这里是给用户的最终答案。" }
      },
      required: ['thought', 'action']
    };

    const messages: AIMessage[] = [
      { role: 'system', content: `${this.persona}\n\n你拥有以下工具可用:\n${toolDescriptions}\n\n你的任务是：根据“项目背景信息”和“历史记录”，完成“当前任务”。请遵循 ReAct 模式，一步一步地思考。在每一步，你都必须决定是“使用工具(tool_call)”来获取更多信息,假如要使用工具，你要让用户输入的信息得少而核心精简而且必须在tool_name中填写工具名称，必须在tool_input中填写工具的输入，还是“提供最终答案(final_answer)”，假如是final_answer，请在final_answer中填写最终答案。请以 JSON 格式返回你的决策。` },
      { role: 'user', content: `
        项目背景信息: ${context}
        ---
        历史记录:
        ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
        ---
        ${history.length !== 0 && "如果在历史记录中工具提供的信息还是不明确，不足以完成当前任务，请继续使用工具来获取更多信息，假如要使用工具，必须在tool_name中填写工具名称，必须在tool_input中填写工具的输入，还是“提供最终答案(final_answer)”，假如是final_answer，请在final_answer中填写最终答案。"}
        ---
        当前任务: ${task.description}
      `}
    ];

    console.log("[TravelActor] 正在请求 Kimi AI 给出执行方案...,请求信息", messages);

    const result = await this.aiClient.chatJSON(messages, responseSchema);
    console.log("[TravelActor] 请求 Kimi AI 给出执行方案...,返回信息", result);

    return result;
  }

  /**
   * @description 执行工具
   * @param toolName - 要执行的工具名称
   * @param toolInput - 工具的输入
   * @returns {Promise<string>} - 工具执行的结果
   */
  private async executeTool(toolName: string, toolInput: any): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return `错误：找不到名为 "${toolName}" 的工具。`;
    }
    try {
      return await tool.execute(toolInput);
    } catch (error) {
      return `错误：执行工具 "${toolName}" 时失败: ${error}`;
    }
  }
}