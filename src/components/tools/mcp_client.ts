import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * @description 定义启动一个 MCP 服务器所需的配置
 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  /**
   * 可选：直接提供服务器脚本路径（.js 或 .py）。
   * 若未提供 command/args，将自动根据扩展名选择运行时：
   *  - .js -> 使用 Node（process.execPath）
   *  - .py -> 使用 Python（win32: python，其它: python3）
   */
  script?: string;
}

/**
 * MCP 客户端 🌐 (动态启动版)
 * 可以根据配置，启动并连接到任何一个通过 stdio 通信的 MCP 服务器。
 */
export class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private availableToolNames: string[] = [];
  private availableToolsMeta: { name: string; description?: string; inputSchema?: any }[] = [];
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
      // 解析最终要使用的命令与参数（支持 script 快捷配置）
      let finalCommand = config.command;
      let finalArgs = config.args;

      if ((!finalCommand || !finalArgs || finalArgs.length === 0) && config.script) {
        const scriptPath = config.script;
        const isJs = scriptPath.endsWith('.js');
        const isPy = scriptPath.endsWith('.py');
        if (!isJs && !isPy) {
          throw new Error('Server script must be a .js or .py file');
        }
        finalCommand = isPy ? (process.platform === 'win32' ? 'python' : 'python3') : process.execPath;
        finalArgs = [scriptPath];
      }

      if (!finalCommand || !finalArgs || finalArgs.length === 0) {
        throw new Error('Invalid MCPServerConfig: either provide command/args or a valid script (.js | .py)');
      }

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
        `[MCPClient] 正在使用命令 "${finalCommand} ${finalArgs.join(
          " "
        )}" 启动服务器...`
      );
      this.transport = new StdioClientTransport({
        command: finalCommand,
        args: finalArgs,
        env: cleanEnv,
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.availableToolsMeta = toolsResult.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: (tool as any).inputSchema,
      }));
      this.availableToolNames = this.availableToolsMeta.map((t) => t.name);

      this.connected = true;
      console.error(
        `[MCPClient] 已成功连接到工具服务器，可用工具: ${this.availableToolNames.join(
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
    if (!this.availableToolNames.includes(toolName)) {
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
    return this.availableToolNames;
  }

  /**
   * @description 获取包含 description 与 inputSchema 的远程工具元数据
   */
  public async getAvailableToolMetas(): Promise<{ name: string; description?: string; inputSchema?: any }[]> {
    return this.availableToolsMeta;
  }

  /**
   * @description 以大模型可直接使用的格式返回工具定义（例如可直接作为 Anthropic tools 参数）
   */
  public async getToolsForLLM(): Promise<Array<{ name: string; description?: string; input_schema?: any }>> {
    return this.availableToolsMeta.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  /**
   * @description 根据名称获取单个工具的 JSON Schema（若存在）
   */
  public async getToolSchemaByName(name: string): Promise<any | undefined> {
    return this.availableToolsMeta.find((t) => t.name === name)?.inputSchema;
  }
}
