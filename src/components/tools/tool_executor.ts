import { Tool } from "./base_tool";

/**
 * @description 工具执行器接口 (Tool Executor Interface)
 * 定义了所有工具执行策略都必须遵守的规范。
 * 它的职责就是接收工具列表，并根据指令执行其中一个。
 */
export interface ToolExecutor {
  /**
   * @description 初始化执行器所需要的所有工具
   * @param tools - 一个包含所有可用工具的数组
   */
  initializeTools(tools: Tool[]): void;

  /**
   * @description 根据名称和输入，执行一个具体的工具
   * @param toolName - 要执行的工具名称
   * @param toolInput - 工具的输入参数
   * @returns {Promise<string>} - 工具执行后返回的文本结果
   */
  execute(toolName: string, toolInput: any): Promise<string>;
}