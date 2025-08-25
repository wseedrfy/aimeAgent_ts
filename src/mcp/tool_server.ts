import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 导入我们已经写好的所有工具类和记忆模块
import { UserInputTool } from '../components/tools/user_input_tool.js';
import { WebSearchTool } from '../components/tools/web_search_tool.js';
import { SaveToMemoryTool, ReadFromMemoryTool } from '../components/tools/memory_tools.js';
import { MemoryModule } from '../components/memory_module.js';

/**
 * 我们的 Aime 智能体专用的“工具箱”服务器。
 * 它通过 MCP 协议，将所有工具能力作为服务暴露出去。
 */
async function createToolServer() {
  console.log("[ToolServer] 正在启动 Aime 工具箱服务器...");

  // 1. 创建一个全局唯一的记忆模块，供所有记忆工具使用
  const memory = new MemoryModule();

  // 2. 创建 MCP 服务器实例
  const server = new McpServer({
    name: "aime-tool-server",
    version: "1.0.0",
  });

  // 3. 将我们所有的工具注册到服务器上
  
  // -- 用户输入工具 --
  const userInputTool = new UserInputTool();
  server.registerTool("askUser", {
      title: "向用户提问",
      description: userInputTool.description,
      inputSchema: { question: z.string() }
    },
    async ({ question }) => ({
      content: [{ type: "text", text: await userInputTool.execute(question) }]
    })
  );

  // -- 网络搜索工具 --
  const webSearchTool = new WebSearchTool();
  server.registerTool("webSearch", {
      title: "网络搜索",
      description: webSearchTool.description,
      inputSchema: { query: z.string() }
    },
    async ({ query }) => ({
      content: [{ type: "text", text: await webSearchTool.execute(query) }]
    })
  );

  // -- 保存到记忆工具 --
  const saveToMemoryTool = new SaveToMemoryTool(memory);
  server.registerTool("saveToMemory", {
      title: "保存到记忆",
      description: saveToMemoryTool.description,
      inputSchema: { key: z.string(), value: z.any() }
    },
    async ({ key, value }) => ({
      content: [{ type: "text", text: await saveToMemoryTool.execute({ key, value }) }]
    })
  );

  // -- 从记忆中读取工具 --
  const readFromMemoryTool = new ReadFromMemoryTool(memory);
  server.registerTool("readFromMemory", {
      title: "从记忆中读取",
      description: readFromMemoryTool.description,
      inputSchema: { key: z.string() }
    },
    async ({ key }) => ({
      content: [{ type: "text", text: await readFromMemoryTool.execute({ key }) }]
    })
  );
  
  // 4. 启动服务器，并使用 stdio (标准输入/输出) 作为通信方式
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // 使用 console.error 打印日志，因为它不会干扰 stdio 通信
  console.error("[ToolServer] Aime 工具箱服务器已成功运行在 stdio 上。");
}

createToolServer().catch((error) => {
  console.error("[ToolServer] 启动失败:", error);
  process.exit(1);
});