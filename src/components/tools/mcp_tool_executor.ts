import { Tool } from "./base_tool";
import { ToolExecutor } from "./tool_executor";
import { MCPClient } from "./mcp_client";
import { MCPServerConfig } from "./mcp_client";

/**
 * MCP 工具执行器 📡
 * 通过 MCP 客户端，调用一个远程工具服务器来执行工具的策略。
 */
export class MCPToolExecutor implements ToolExecutor {
    private mcpClient: MCPClient;
    private mcpServerConfig: MCPServerConfig;

    constructor(mcpServerConfig: MCPServerConfig) {
        this.mcpClient = new MCPClient();
        this.mcpServerConfig = mcpServerConfig;
        console.log("[MCPToolExecutor] “MCP远程执行”策略已就绪。");
    }

    // 这个策略不需要 initializeTools，因为工具是在服务器端的
    public initializeTools(tools: Tool[]): void {
        // 留空
    }

    /**
     * @description 将工具执行请求转发给 MCP 客户端
     */
    public async execute(toolName: string, toolInput: any): Promise<string> {
        // 在第一次执行时连接服务器
        if (!this.mcpClient.isConnected()) {
            await this.mcpClient.connect(this.mcpServerConfig);
        } else {
            console.log("[MCPToolExecutor] 已连接到 MCP 工具服务器。");
        }

        // MCP 的工具输入需要是键值对，我们需要做一点转换
        // 例如，askUser 工具的输入是 "question": "..."
        // 我们需要将 actor 传来的 toolInput (字符串) 包装一下
        let formattedInput = toolInput;
        if (typeof toolInput === 'string') {
            if (toolName === 'askUser') formattedInput = { question: toolInput };
            if (toolName === 'webSearch') formattedInput = { query: toolInput };
        }

        return this.mcpClient.callTool(toolName, formattedInput);
    }

    public async close(): Promise<void> {
        await this.mcpClient.close();
    }
}