import { MultiMCPManager, MultiMCPServerConfig } from "../components/tools/executor/multi_mcp_manager";

async function main() {
  console.log("--- 使用 MultiMCPManager 测试多 MCP 服务器 ---");

  const config: MultiMCPServerConfig = {
    "test_server": {
      command: "npx",
      args: ["tsx", "src/mcp/test_server.ts"]
    },
    "math": {
      "command": "npx",
      "args": ["tsx", "src/mcp/math_server.ts"]
    },
    "hangzhou-weather": {
      "command": "npx",
      "args": ["tsx", "src/mcp/hangzhou_weather.ts"]
    }
  };

  const manager = new MultiMCPManager();
  await manager.initialize(config);

  // 1) 测试 math.calculate (1+1)
  const calcText = await manager.callTool("calculate", { expression: "1+1" });
  console.log("math.calculate(1+1) =>", calcText);

  // 2) 测试 hangzhou-weather.query-hangzhou-weather
  const weatherText = await manager.callTool("query-hangzhou-weather", { query: "查询杭州天气" });
  console.log("hangzhou-weather =>", weatherText);

  await manager.closeAll();
}

main().catch((err) => {
  console.error("MultiMCPManager 测试失败:", err);
  process.exit(1);
});


