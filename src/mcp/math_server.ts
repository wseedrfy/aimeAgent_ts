import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 一个简单的四则运算 MCP 服务器：支持加减乘除
// 工具：
// 1) calculate: 计算表达式（仅包含数字与 + - * / 和空格）
// 2) add: 两数相加
// 3) subtract: 两数相减
// 4) multiply: 两数相乘
// 5) divide: 两数相除（支持除零错误提示）

function safeEvaluateExpression(expression: string): number {
  // 仅允许数字、运算符与小数点与空格
  const sanitized = expression.replace(/\s+/g, "");
  if (!/^[-+*/().\d]+$/.test(sanitized)) {
    throw new Error("表达式包含非法字符，仅允许数字与 + - * / . ()");
  }

  // 使用手写解析器或受限 eval。这里实现一个极简解析：
  // 为简洁与鲁棒性，这里采用 new Function 但前置强校验，禁止字母与特殊字符。
  // 注意：生产环境应替换为确定性的表达式解析器。
  // eslint-disable-next-line no-new-func
  const fn = new Function(`return (${sanitized});`);
  const result = fn();
  if (typeof result !== "number" || Number.isNaN(result)) {
    throw new Error("表达式计算结果不是有效数字");
  }
  return result;
}

async function main() {
  const server = new McpServer({ name: "math", version: "1.0.0" });

  // 1) calculate
  server.tool(
    "calculate",
    "计算一个只包含数字与 + - * / 的算术表达式",
    {
      expression: z
        .string()
        .min(1)
        .describe("算术表达式，例如: 1+2*3/4 - 5"),
    },
    async ({ expression }) => {
      try {
        const value = safeEvaluateExpression(expression);
        return {
          content: [
            {
              type: "text",
              text: String(value),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `计算失败: ${err?.message || err}`,
            },
          ],
          isError: true,
        } as any;
      }
    }
  );

  // 2) add
  server.tool(
    "add",
    "两数相加",
    {
      a: z.number().describe("加数 a"),
      b: z.number().describe("加数 b"),
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    })
  );

  // 3) subtract
  server.tool(
    "subtract",
    "两数相减 (a - b)",
    {
      a: z.number().describe("被减数 a"),
      b: z.number().describe("减数 b"),
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a - b) }],
    })
  );

  // 4) multiply
  server.tool(
    "multiply",
    "两数相乘",
    {
      a: z.number().describe("因数 a"),
      b: z.number().describe("因数 b"),
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a * b) }],
    })
  );

  // 5) divide
  server.tool(
    "divide",
    "两数相除 (a / b)",
    {
      a: z.number().describe("被除数 a"),
      b: z.number().describe("除数 b"),
    },
    async ({ a, b }) => {
      if (b === 0) {
        return {
          content: [
            { type: "text", text: "除数不能为 0" },
          ],
          isError: true,
        } as any;
      }
      return { content: [{ type: "text", text: String(a / b) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] math 服务器已在 stdio 上运行");
}

main().catch((error) => {
  console.error("[MCP] math 服务器启动失败:", error);
  process.exit(1);
});


