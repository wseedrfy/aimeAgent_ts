import { MCPClient, MCPServerConfig } from '../mcp_client';

// 没用

/**
 * @description 定义多 MCP 服务器的 JSON 配置格式
 */
export interface MultiMCPServerConfig {
  [serverName: string]: MCPServerConfig;
}

/**
 * 多 MCP 服务器管理器 🚢
 * 负责启动、管理和路由到多个不同的 MCP 工具服务器。
 */
export class MultiMCPManager {
  private clients = new Map<string, MCPClient>(); // 保存所有服务器的客户端实例
  private toolToServerMap = new Map<string, string>(); // 工具注册表： toolName -> serverName
  private isInitialized = false;

  constructor() {
    console.log("[MultiMCPManager] “舰队指挥官”已就位。");
  }

  /**
   * @description 根据配置，启动所有 MCP 服务器并建立工具注册表
   * @param config - 包含多个服务器配置的 JSON 对象
   */
  public async initialize(config: MultiMCPServerConfig): Promise<void> {
    if (this.isInitialized) return;
    console.log("[MultiMCPManager] 开始启动所有工具服务器...");
    
    for (const serverName in config) {
      const serverConfig = config[serverName];
      const client = new MCPClient();
      try {
        await client.connect(serverConfig);
        this.clients.set(serverName, client);
        
        // 将该服务器提供的所有工具，注册到我们的“工具注册表”中
        const tools = await client.getAvailableTools();
        tools.forEach(toolName => {
          this.toolToServerMap.set(toolName, serverName);
        });
        console.log(`[MultiMCPManager] 服务器 [${serverName}] 启动成功。`);

      } catch (error) {
        console.error(`[MultiMCPManager] 启动服务器 [${serverName}] 失败:`, error);
      }
    }
    this.isInitialized = true;
    console.log("[MultiMCPManager] 所有工具服务器均已启动，工具注册表构建完成。");
    console.log("当前工具注册表:", Object.fromEntries(this.toolToServerMap));
  }

  /**
   * @description 根据工具名称，智能地调用正确的服务器
   * @param toolName - 要调用的工具名称
   * @param toolInput - 工具的输入参数
   */
  public async callTool(toolName: string, toolInput: any): Promise<string> {
    const serverName = this.toolToServerMap.get(toolName);
    if (!serverName) {
      return `错误：工具注册表中没有找到名为 "${toolName}" 的工具。`;
    }
    
    const client = this.clients.get(serverName);
    if (!client) {
      return `错误：找到了工具 "${toolName}" 属于服务器 "${serverName}"，但无法找到该服务器的客户端实例。`;
    }

    console.log(`[MultiMCPManager] 正在将工具调用 [${toolName}] 路由到服务器 [${serverName}]...`);
    return client.callTool(toolName, toolInput);
  }

  /**
   * @description 关闭所有服务器连接
   */
  public async closeAll(): Promise<void> {
    console.log("[MultiMCPManager] 正在关闭所有工具服务器连接...");
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.isInitialized = false;
  }
}