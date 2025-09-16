import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function main() {
  const server = new McpServer({ name: "hangzhou-weather", version: "1.0.0" });

  // 工具：query-hangzhou-weather
  // 输入：query（可选），当用户输入包含“杭州”或“天气”或为空时，返回今天日期与固定温度 26 度。
  server.tool(
    "query-hangzhou-weather",
    "查询杭州天气，返回今天日期与温度 26 度",
    {
      query: z
        .string()
        .optional()
        .describe("查询文本，例如：查询杭州天气"),
    },
    async ({ query }) => {
      const today = formatDateYYYYMMDD(new Date());
      const shouldAnswer =
        !query || /杭州|天气/.test(query);
      if (!shouldAnswer) {
        return {
          content: [
            {
              type: "text",
              text: "仅支持查询杭州天气，请输入包含‘杭州’或‘天气’的查询文本。",
            },
          ],
        };
      }

      const text = `${today} 杭州温度 26 度`;
      return { content: [{ type: "text", text }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] hangzhou-weather 服务器已在 stdio 上运行");
}

main().catch((error) => {
  console.error("[MCP] hangzhou-weather 服务器启动失败:", error);
  process.exit(1);
});


