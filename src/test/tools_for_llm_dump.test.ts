import { UnifiedToolManager, MultiMCPServerConfig } from "../components/tools/executor/unified_tool_manager";

async function main() {
  console.log("--- Dump LLM Tools (包含远程工具的 JSON Schema) ---");

  const servers: MultiMCPServerConfig = {
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
  await manager.registerMCPServers(servers);

  const desc = await manager.getAllToolDescriptions();
  console.log("\n[全部工具描述]\n" + desc);

  const llmTools = await manager.getToolsForLLM();
  console.log("\n[用于大模型的 tools 参数]\n" + JSON.stringify(llmTools, null, 2));

  await manager.closeAllConnections();
}

main().catch((err) => {
  console.error("Dump LLM Tools 失败:", err);
  process.exit(1);
});


