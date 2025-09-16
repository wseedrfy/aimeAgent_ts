import { AimeFramework, AimeFrameworkConfig } from '../aime_framework';
import { MultiMCPServerConfig } from '../components/tools/executor/multi_mcp_manager';

/**
 * @description 端到端测试：测试 AimeFramework 的多 MCP 策略
 */
async function testMultiMCPStrategy() {
  console.log("--- 开始测试 AimeFramework 的多 MCP 策略 ---");

  // 1. 定义我们的“服务器舰队”配置
  const mcpConfig: MultiMCPServerConfig = {
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

  // 2. 创建 AimeFramework 的总配置
  const frameworkConfig: AimeFrameworkConfig = {
    mcpConfig: mcpConfig
  };

  // 3. 创建 AimeFramework 实例，传入总配置
  const framework = new AimeFramework(frameworkConfig);

  const userGoal = "为我的北海道滑雪之旅，获取一个合适的预算建议。";
  
  try {
    await framework.run(userGoal);
    console.log("\n--- AimeFramework 多 MCP 策略测试成功 ---");
  } catch (error) {
    console.error("\n--- AimeFramework 多 MCP 策略测试失败 ---", error);
  }
}

testMultiMCPStrategy();