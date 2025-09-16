import { UnifiedToolManager, MultiMCPServerConfig } from "../components/tools/unified_tool_manager";

async function main() {
  console.log("--- Dump MCP Servers for UI ---");

  const servers: MultiMCPServerConfig = {
    "test_server": {
      command: "npx",
      args: ["tsx", "src/mcp/test_server.ts"],
    },
    "math": {
      command: "npx",
      args: ["tsx", "src/mcp/math_server.ts"],
    },
    "hangzhou-weather": {
      command: "npx",
      args: ["tsx", "src/mcp/hangzhou_weather.ts"],
    },
  };

  const manager = new UnifiedToolManager();
  await manager.registerMCPServers(servers);

  const ui = await manager.getMCPServersForUI();
  console.log(JSON.stringify(ui, null, 2));

  await manager.closeAllConnections();
}

main().catch((err) => {
  console.error("Dump MCP Servers for UI 失败:", err);
  process.exit(1);
});


