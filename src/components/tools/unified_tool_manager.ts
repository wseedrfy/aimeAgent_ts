import { Tool } from "./base_tool";
import { MCPClient, MCPServerConfig } from "./mcp_client";

// 定义工具的来源类型
type ToolSource =
    | { type: 'local', instance: Tool }
    | { type: 'mcp', client: MCPClient, serverName: string };

/**
 * @description 定义多 MCP 服务器的 JSON 配置格式
 */
export interface MultiMCPServerConfig {
    [serverName: string]: MCPServerConfig;
}

/**
 * 统一工具管理器 🔌
 * 系统的“统一工具总线”，负责注册、管理和执行来自任何来源（本地或MCP）的工具。
 */
export class UnifiedToolManager {
    // 一个“工具户口本”，记录了每个工具的名称和它的来源信息
    private toolRegistry = new Map<string, ToolSource>();
    // 记录所有 MCP 客户端，以便统一关闭
    private mcpClients: MCPClient[] = [];

    constructor() {
        console.log("[UnifiedToolManager] “统一工具总线”已启动。");
    }

    /**
     * @description 注册一个本地工具
     */
    public registerLocalTool(tool: Tool): void {
        console.log(`[UnifiedToolManager] 正在注册本地工具: ${tool.name}`);
        this.toolRegistry.set(tool.name, { type: 'local', instance: tool });
    }

    /**
     * @description 注册一个远程 MCP 工具服务器，并自动发现其上的所有工具
     */
    public async registerMCPServer(serverName: string, config: MCPServerConfig): Promise<void> {
        console.log(`[UnifiedToolManager] 正在注册并连接远程 MCP 服务器: ${serverName}`);
        const client = new MCPClient();
        try {
            await client.connect(config);
            this.mcpClients.push(client);

            const remoteTools = await client.getAvailableTools();
            remoteTools.forEach(toolName => {
                console.log(`[UnifiedToolManager] 从 [${serverName}] 发现远程工具: ${toolName}`);
                this.toolRegistry.set(toolName, { type: 'mcp', client, serverName });
            });
        } catch (error) {
            console.error(`[UnifiedToolManager] 注册 MCP 服务器 ${serverName} 失败:`, error);
        }
    }

    /**
     * @description 注册多个mcp
     */
    public async registerMCPServers(servers: MultiMCPServerConfig): Promise<void> {
        for (const serverName in servers) {
            await this.registerMCPServer(serverName, servers[serverName]);
        }
    }

    /**
     * @description 获取所有已注册工具的描述列表，供 AI 思考时使用
     */
    public getAllToolDescriptions(): string {
        let descriptions = "";
        this.toolRegistry.forEach((source, name) => {
            // 我们需要一种方式从 MCP 工具获取描述，这是一个待办事项
            // 为简化，我们暂时只描述本地工具
            if (source.type === 'local') {
                descriptions += `- ${name}: ${source.instance.description}\n`;
            } else {
                descriptions += `- ${name}: (远程MCP工具) 一个在 [${source.serverName}] 服务器上的工具。\n`;
            }
        });
        return descriptions;
    }

    /**
     * @description 统一的工具执行入口
     */
    public async executeTool(toolName: string, toolInput: any): Promise<string> {
        const source = this.toolRegistry.get(toolName);
        if (!source) {
            return `错误：统一工具总线中找不到名为 "${toolName}" 的工具。`;
        }

        if (source.type === 'local') {
            console.log(`[UnifiedToolManager] 正在执行本地工具: ${toolName}`);
            return source.instance.execute(toolInput);
        }
        else if (source.type === 'mcp') {
            console.log(`[UnifiedToolManager] 正在将请求路由到远程 MCP 服务器 [${source.serverName}]...`);
            // 参数打包逻辑，我们之前已经移到了 Actor 的大脑里，所以这里可以直接传递
            return source.client.callTool(toolName, toolInput);
        }

        return "未知的工具来源类型。";
    }

    /**
     * @description 关闭所有 MCP 连接
     */
    public async closeAllConnections(): Promise<void> {
        await Promise.all(this.mcpClients.map(client => client.close()));
    }
}