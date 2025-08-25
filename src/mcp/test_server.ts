import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 只能调用mcp内部的函数作为工具
/**
 * 我们的 Aime 智能体专用的“工具箱”服务器。
 * 它通过 MCP 协议，将所有工具能力作为服务暴露出去。
 */
async function createToolServer() {
  console.log("[ToolServer] 正在启动 Aime 工具箱服务器...");

  // 2. 创建 MCP 服务器实例
  const server = new McpServer({
    name: "aime-tool-server",
    version: "1.0.0",
  });

  const callme = ()=>{
    return "被调用啦啦"
  }

  // 3. 将我们所有的工具注册到服务器上
  // -- 用户输入工具 --
  server.registerTool("askUser", {
      title: "向用户提问",
      description: "向用户提问获得所需信息",
      inputSchema: { question: z.string() }
    },
    async ({ question }) => ({
      content: [{ type: "text", text: callme() }]
    })
  );

  // 
  const callme2 = ()=>{
    return "被调用啦啦2"
  }

  // -- 网络搜索工具 --
  server.registerTool("webSearch", {
      title: "网络搜索",
      description: "网络搜索",
      inputSchema: { query: z.string() }
    },
    async ({ query }) => ({
      content: [{ type: "text", text: callme2() }]
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