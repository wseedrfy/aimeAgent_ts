import { MultiMCPServerConfig, UnifiedToolManager } from "../components/tools/unified_tool_manager";
import { MCPServerConfig } from "../components/tools/mcp_client";
import { UserInputTool } from "../components/tools/user_input_tool";

async function main() {
  console.log("--- 使用 UnifiedToolManager 测试多 MCP 服务器 ---");

  const config: MultiMCPServerConfig = {
    "test_server": {
      command: "npx",
      args: ["tsx", "src/mcp/test_server.ts"]
    },
    "math": {
      command: "npx",
      args: ["tsx", "src/mcp/math_server.ts"]
    },
    "hangzhou-weather": {
      command: "npx",
      args: ["tsx", "src/mcp/hangzhou_weather.ts"]
    }
  };
 

  const manager = new UnifiedToolManager();

  // 注册三台服务器并自动发现工具
  await manager.registerMCPServers(config);
  // 注册本地工具
  manager.registerLocalTool(new UserInputTool());

  console.log("所有工具描述:", manager.getAllToolDescriptions());

  // 1) math.calculate
  const calc = await manager.executeTool("askUser", "请告诉我1+1等于多少");
  console.log("askUser =>", calc);

  // 2) math.calculate
  const calc2 = await manager.executeTool("calculate", { expression: "1 + 1" });
  console.log("calculate(1+1) =>", calc2);

  // 2) 杭州天气
  const hz = await manager.executeTool("query-hangzhou-weather", { query: "查询杭州天气" });
  console.log("hangzhou-weather =>", hz);

  await manager.closeAllConnections();
}

main().catch((err) => {
  console.error("UnifiedToolManager 测试失败:", err);
  process.exit(1);
});


