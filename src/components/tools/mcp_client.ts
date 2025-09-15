import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * @description 定义启动一个 MCP 服务器所需的配置
 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

/**
 * MCP 客户端 🌐 (动态启动版)
 * 可以根据配置，启动并连接到任何一个通过 stdio 通信的 MCP 服务器。
 */
export class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private availableTools: string[] = [];
  private connected: boolean = false;

  constructor() {
    this.mcp = new Client({ name: "aime-agent-mcp-client", version: "1.0.0" });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * @description (全新升级) 根据动态配置连接到工具服务器
   * @param config - 包含 command 和 args 的服务器启动配置
   */
  public async connect(config: MCPServerConfig): Promise<void> {
    try {
      // **核心修正**: 在这里过滤掉 undefined 的环境变量
      const cleanEnv: Record<string, string> = {};
      if (config.env) {
        for (const key in config.env) {
          const value = config.env[key];
          if (value !== undefined) {
            cleanEnv[key] = value;
          }
        }
      }

      console.log("cleanEnv", cleanEnv);

      console.error(
        `[MCPClient] 正在使用命令 "${config.command} ${config.args.join(
          " "
        )}" 启动服务器...`
      );
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: cleanEnv,
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.availableTools = toolsResult.tools.map((tool) => tool.name);

      this.connected = true;
      console.error(
        `[MCPClient] 已成功连接到工具服务器，可用工具: ${this.availableTools.join(
          ", "
        )}`
      );
    } catch (e) {
      this.connected = false;
      console.error("[MCPClient] 连接到 MCP 工具服务器失败:", e);
      throw e;
    }
  }
  /**
   * @description 调用一个远程工具
   * @param toolName - 要调用的工具名称
   * @param toolArgs - 工具的参数
   */
  public async callTool(toolName: string, toolArgs: any): Promise<string> {
    if (!this.availableTools.includes(toolName)) {
      return `错误：远程工具服务器上没有名为 "${toolName}" 的工具。`;
    }
    try {
      const result = await this.mcp.callTool({
        name: toolName,
        arguments: toolArgs,
      });

      // MCP 返回的结果是一个复杂的对象，我们提取其中的文本部分
      // 修复 result.content 的类型为未知的问题，增加类型判断和容错处理
      if (Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0];
        if (content && typeof content === "object" && content.type === "text") {
          return content.text;
        }
        return JSON.stringify(result.content);
      }
      // 如果 content 不是数组或为空，直接返回字符串化的内容
      return JSON.stringify(result.content);
    } catch (e) {
      console.error(`[MCPClient] 调用远程工具 ${toolName} 失败:`, e);
      return `调用远程工具 ${toolName} 失败。`;
    }
  }

  /**
   * @description 关闭连接
   */
  public async close(): Promise<void> {
    await this.mcp.close();
    this.connected = false; // **修改点**：关闭连接后，更新状态
    console.error("[MCPClient] 已与工具服务器断开连接。");
  }

  /**
 * @description 获取此客户端连接的服务器上所有可用的工具名称
 */
  public async getAvailableTools(): Promise<string[]> {
    return this.availableTools;
  }
}
