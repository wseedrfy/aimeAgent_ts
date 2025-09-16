import { Tool } from "../type/base_tool";
import { ToolExecutor } from "../type/tool_executor";
import { MultiMCPManager } from "./multi_mcp_manager"; // 引入“舰队指挥官”

// 没用

/**
 * MCP 工具执行器 📡 (指挥官版)
 * 它不再自己管理连接，而是将所有请求委托给 MultiMCPManager。
 */
export class MCPToolExecutor implements ToolExecutor {
  private manager: MultiMCPManager; // **修改点**: 持有的是指挥官的引用

  constructor(manager: MultiMCPManager) { // **修改点**: 构造函数接收指挥官实例
    this.manager = manager;
    console.log("[MCPToolExecutor] “MCP远程执行”策略已就绪，并听从“舰队指挥官”的调度。");
  }

  /**
   * @description 这个策略下的工具是在远程服务器上动态发现的，所以此方法留空。
   */
  public initializeTools(tools: Tool[]): void {
    //
  }
  
  /**
   * @description (已升级) 将工具执行请求直接转发给“舰队指挥官”
   */
  public async execute(toolName: string, toolInput: any): Promise<string> {
    // MCP 的工具输入需要是键值对，我们在这里做一点自动包装
    let formattedInput = toolInput;
    // 这里好像是多此一举
    if (typeof toolInput === 'string') {
        // 这是一个简化版，未来可以做得更通用
        if (toolName === 'askUser') formattedInput = { question: toolInput };
        if (toolName === 'webSearch') formattedInput = { query: toolInput };
        if (toolName === 'readFromMemory') formattedInput = { key: toolInput };
    }
    
    // 将请求委托给指挥官
    return this.manager.callTool(toolName, formattedInput);
  }

  /**
   * @description 指挥官会统一关闭所有连接，所以此方法留空或委托
   */
  public async close(): Promise<void> {
    // 可以选择在这里调用 manager.closeAll()，或者由 AimeFramework 在最后统一调用
  }
}