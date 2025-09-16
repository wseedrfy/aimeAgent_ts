import { Tool } from "../type/base_tool";
import { MCPClient, MCPServerConfig } from "../mcp_client";

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
    // 供前端渲染：维护每个 MCP 服务及其工具定义（包含 description 与 input_schema）
    private mcpServersMeta = new Map<string, { name: string; tools: { name: string; description?: string; input_schema?: any }[] }>();

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

            // 使用保留了描述与 Schema 的元信息
            const remoteMetas = await client.getAvailableToolMetas();
            remoteMetas.forEach(meta => {
                console.log(`[UnifiedToolManager] 从 [${serverName}] 发现远程工具: ${meta.name}`);
                this.toolRegistry.set(meta.name, { type: 'mcp', client, serverName });
            });

            // 构建并缓存前端需要的结构
            const uiTools = remoteMetas.map(m => ({
                name: m.name,
                description: m.description,
                input_schema: m.inputSchema,
            }));
            this.mcpServersMeta.set(serverName, { name: serverName, tools: uiTools });
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
    public async getAllToolDescriptions(): Promise<string> {
        let descriptions = "";
        // 为了打印远程工具的描述与参数约束，我们需要向对应客户端查询元数据
        const seen = new Set<string>();
        for (const [name, source] of this.toolRegistry.entries()) {
            if (seen.has(name)) continue;
            seen.add(name);
            if (source.type === 'local') {
                descriptions += `- ${name}: ${source.instance.description}\n`;
            } else {
                const metas = await source.client.getAvailableToolMetas();
                const meta = metas.find(m => m.name === name);
                const desc = meta?.description || `(远程MCP工具) 一个在 [${source.serverName}] 服务器上的工具。`;
                const schema = meta?.inputSchema ? JSON.stringify(meta.inputSchema) : "(无输入参数)";
                descriptions += `- ${name}: ${desc}\n  参数Schema: ${schema}\n`;
            }
        }
        return descriptions;
    }

    /**
     * @description 导出所有工具给 LLM 使用（包含远程的 JSON Schema）
     */
    public async getToolsForLLM(): Promise<Array<{ name: string; description?: string; input_schema?: any }>> {
        const tools: Array<{ name: string; description?: string; input_schema?: any }> = [];
        const handled = new Set<string>();
        for (const [name, source] of this.toolRegistry.entries()) {
            if (handled.has(name)) continue;
            handled.add(name);
            if (source.type === 'local') {
                tools.push({ name, description: source.instance.description, input_schema: { type: 'object', properties: {}, additionalProperties: true } });
            } else {
                const metas = await source.client.getAvailableToolMetas();
                const meta = metas.find(m => m.name === name);
                tools.push({ name, description: meta?.description, input_schema: meta?.inputSchema });
            }
        }
        return tools;
    }

    /**
     * @description 返回前端渲染所需的 MCP 列表结构
     * 形如：[{ name, tools: [{ name, description, input_schema }] }]
     */
    public async getMCPServersForUI(): Promise<Array<{ name: string; tools: { name: string; description?: string; input_schema?: any }[] }>> {
        return Array.from(this.mcpServersMeta.values());
    }

    /**
     * @description 统一的工具执行入口
     */
    public async executeTool(toolName: string, toolInput: { [x: string]: unknown } | undefined | string): Promise<string> {
        const source = this.toolRegistry.get(toolName);
        if (!source) {
            return `错误：统一工具总线中找不到名为 "${toolName}" 的工具。`;
        }

        // 调用本地工具
        if (source.type === 'local') {
            console.log(`[UnifiedToolManager] 正在执行本地工具: ${toolName}`);
            return source.instance.execute(toolInput);
        }

        // 调用远程mcp工具
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