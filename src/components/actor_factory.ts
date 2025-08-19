// 导入我们新的 TravelActor
import { TravelActor } from './actors/travel_actor';
import { Task } from './progress_manager';
import { BaseActor, Actor } from './actors/base_actor';
import { BasicAIClient, createDefaulAIClient, AIMessage } from '../core/ai_sdk';
import { UserInputTool } from './tools/user_input_tool';

/**
 * 演员工厂 🏭 (升级版)
 * 负责根据任务需求，动态地实例化专门的 Actor。
 */
export class ActorFactory {
  private aiClient: BasicAIClient;

  /**
   * @description 构造函数，初始化工厂
   */
  constructor() {
    this.aiClient = createDefaulAIClient();
    console.log("[ActorFactory] 人才市场已开张 (工厂已初始化)。");
  }

  /**
   * @description 根据任务动态创建一个专家 Actor (升级版)
   * @param task - 需要被执行的任务
   * @returns {Promise<Actor>} - 返回一个创建好的、拥有定制人设的 Actor 实例
   */
  public async createActor(task: Task): Promise<Actor> {
    console.log(`[ActorFactory] 收到新任务 "${task.description}"，正在寻找合适的专家...`);

    const persona = await this.generatePersona(task);

    // **新增逻辑：根据任务描述决定创建哪种类型的专家**
    const taskDescription = task.description.toLowerCase();
    const travelKeywords = ['旅行', '机票', '酒店', '航班', '行程', '旅游', "规划", "交通", "游玩", "出行"];

    // 优化点：让ai来看看应该创建已有的哪些专家

    if (travelKeywords.some(keyword => taskDescription.includes(keyword))) {
      console.log("[ActorFactory] 任务与旅行相关，正在创建 [TravelActor] 专家...");
      const userInputTool = new UserInputTool();
      return new TravelActor(persona, this.aiClient, [userInputTool]);
    } else {
      console.log("[ActorFactory] 未匹配到特定领域，正在创建通用 [BaseActor] 专家...");
      return new BaseActor(persona, this.aiClient);
    }
  }
  
  /**
   * @description (这是一个新的辅助函数) 调用 AI 为任务生成人设
   * @param task - 需要生成人设的任务
   * @returns {Promise<string>} - 返回 AI 生成的人设字符串
   */
  private async generatePersona(task: Task): Promise<string> {
    const responseSchema = {
      type: 'object',
      properties: { persona: { type: 'string', description: "为这个任务描述一个最合适的专家角色或人设，请使用第一人称'你是一个...'" }},
      required: ['persona']
    };
    const messages: AIMessage[] = [
      { role: 'system', content: '你是一个顶级的人力资源（HR）总监，特别擅长为复杂的任务找到最合适的虚拟专家角色。你的任务是根据给定的任务描述，设计一个精确的专家“人设”(Persona)。' },
      { role: 'user', content: `请为以下任务设计一个专家人设: "${task.description}"` }
    ];
    try {
      const aiResponse = await this.aiClient.chatJSON(messages, responseSchema);
      return aiResponse.persona || "通用的任务执行者";
    } catch (error) {
      console.error("[ActorFactory] AI 设计人设失败:", error);
      return "通用的任务执行者"; // 返回备用人设
    }
  }
}