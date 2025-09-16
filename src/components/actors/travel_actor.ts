import { BaseActor } from './base_actor';
import { Task } from '../progress_manager';
import { AIMessage, BasicAIClient } from '../../core/ai_sdk';
import { Tool } from '../tools/base_tool'; // 引入 Tool 接口
import { ToolExecutor } from '../tools/tool_executor'; // 引入新的执行器接口
import { UnifiedToolManager } from '../tools/unified_tool_manager';

/**
 * 旅行专家 ✈️ (工具增强版)
 * 一个配备了工具箱，并能通过 ReAct 模式执行复杂任务的专家。
 */
export class TravelActor extends BaseActor {
  private toolManager: UnifiedToolManager;
  private toolDescriptions: string;   // 缓存工具描述

  /**
   * @description 构造函数，为专家配备工具
   * @param persona - 专家的个性
   * @param aiClient - 智能体
   * @param toolExecutor - 工具执行器,本地工具或者是mcp工具
   * @param allTools - 所有工具
   */
  constructor(persona: string, aiClient: BasicAIClient, toolManager: UnifiedToolManager, allTools: Tool[]) {
    super(persona, aiClient); // 调用父类的构造函数
    this.toolManager = toolManager;
    this.toolDescriptions = this.toolManager.getAllToolDescriptions();
    console.log(`[TravelActor] 专家已就位，并接入了“统一工具总线”。`);
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
      // **新增逻辑**: 如果 AI 决定任务失败
      else if (thoughtProcess.action === 'fail_task') {
        console.log(`[TravelActor] AI 决策: 任务无法完成。`);
        // 我们返回一个特殊格式的字符串，以便总指挥识别
        return `FAIL: ${thoughtProcess.reason || '未知原因'}`;
      }
      else if (thoughtProcess.action === 'tool_call' && thoughtProcess.tool_name && thoughtProcess.tool_input) {
        // 如果 AI 决定使用工具
        const toolName = thoughtProcess.tool_name;
        const toolInput = thoughtProcess.tool_input;
        console.log(`[TravelActor] AI 决策: 使用工具 [${toolName}]，输入为: "${toolInput}"`);

        // 3. 观察 (Observe) - 执行工具并获取结果
        // 专家只需调用“统一总管”，无需关心工具来源
        const toolResult = await this.toolManager.executeTool(toolName, toolInput);

        // 如果工具执行本身出错了，也算作任务失败
        if (toolResult.startsWith("错误：")) {
          return `FAIL: 工具执行失败 - ${toolResult}`;
        }

        console.log(`[TravelActor] 工具 [${toolName}] 返回结果: "${toolResult}"`);
        // 将本次的工具使用和结果存入历史记录，用于下一次思考
        history.push({ role: 'assistant', content: JSON.stringify(thoughtProcess) });
        history.push({ role: 'user', content: `工具执行结果: ${toolResult}` }); // 模拟 'user' 角色提供工具结果
      } else {
        console.log("[TravelActor] AI 决策异常，返回当前思考内容。");
        return `FAIL: AI 无法做出明确决策，最后思考是：${thoughtProcess.thought}`;
      }
    }

    return "FAIL: 执行任务已达到最大循环次数";
  }

  /**
   * @description 思考（Reason）环节：调用 AI 进行决策
   * @param task - 当前任务
   * @param context - 全局上下文
   * @param history - ReAct 循环的历史记录
   * @returns {Promise<any>} - AI 返回的结构化决策（JSON格式）
   */
  private async think(task: Task, context: string, history: AIMessage[]): Promise<any> {
    const toolDescriptions = this.toolDescriptions;

    const responseSchema = {
      type: 'object',
      properties: {
        thought: { type: 'string', description: "我的思考过程：分析当前情况，决定下一步行动。" },
        action: { type: 'string', enum: ['tool_call', 'final_answer', "fail_task"], description: "下一步的行动类型。" },
        tool_name: { type: 'string', description: "如果行动是 tool_call，这里是工具的名称。写了tool_name后，记得在tool_input中填写工具的输入。" },
        tool_input: { type: 'string', description: "如果行动是 tool_call，这里是给工具的输入。写了tool_input后，记得在tool_name中填写工具的名称。" },
        final_answer: { type: 'string', description: "如果行动是 final_answer，这里一定要写，这里是给用户的最终答案。" }
      },
      required: ['thought', 'action']
    };

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `${this.persona}
        你拥有以下工具可用:
        ${toolDescriptions}
        
        **重要指令**: 
        1.你的任务是：根据“项目背景信息”和“历史记录”，完成“当前任务”。
        2.请遵循 ReAct 模式，一步一步地思考。
        3.在每一步，你都必须决定是“使用工具(tool_call)”来获取更多信息,假如要使用工具，你要让用户输入的信息得少而核心精简而且必须在tool_name中填写工具名称，必须在tool_input中填写工具的输入，还是“提供最终答案(final_answer)”，假如是final_answer，请在final_answer中填写最终答案。
        4.如果你认为已经有足够信息，就使用 'final_answer' 来提供最终答案。
        5.如果经过思考和尝试后，你判断任务无法完成（例如，信息互相矛盾、工具返回错误、或任务本身不合逻辑），你就必须使用 'fail_task' 来报告失败，并说明原因。
        请以 JSON 格式返回你的决策。
        `
      },
      {
        role: 'user', content: `
        项目背景信息: ${context}
        ---
        历史记录:
        ${history.map(m => `${m.role}: ${m.content}`).join('\n')}
        ---
        ${history.length !== 0 && "如果在历史记录中工具提供的信息还是不明确，不足以完成当前任务，请继续使用工具来获取更多信息，假如要使用工具，必须在tool_name中填写工具名称，必须在tool_input中填写工具的输入，还是“提供最终答案(final_answer)”，假如是final_answer，一定在final_answer中填写最终答案，而不是别的名字的字段。"}
        ---
        当前任务: ${task.description}
      `}
    ];

    console.log("[TravelActor] 正在请求 Kimi AI 给出执行方案...,请求信息", messages);

    const result = await this.aiClient.chatJSON(messages, responseSchema);
    console.log("[TravelActor] 请求 Kimi AI 给出执行方案...,返回信息", result);

    return result;
  }
}