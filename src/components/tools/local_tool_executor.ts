import { Tool } from "./base_tool";
import { ToolExecutor } from "./tool_executor";

/**
 * 本地工具执行器 🏠
 * 直接在当前程序内查找并执行工具的策略。
 */
export class LocalToolExecutor implements ToolExecutor {
  private tools: Tool[] = [];

  constructor() {
    console.log("[LocalToolExecutor] “本地执行”策略已就绪。");
  }

  public initializeTools(tools: Tool[]): void {
    this.tools = tools;
  }

  public async execute(toolName: string, toolInput: any): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return `错误：在本地找不到名为 "${toolName}" 的工具。`;
    }
    try {
      console.log(`[LocalToolExecutor] 正在本地执行工具 [${toolName}]...`);
      return await tool.execute(toolInput);
    } catch (error) {
      return `错误：在本地执行工具 "${toolName}" 时失败: ${error}`;
    }
  }
}