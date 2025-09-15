import { AimeFramework, AimeFrameworkConfig } from '../aime_framework';
import { MultiMCPServerConfig } from '../components/tools/multi_mcp_manager';

/**
 * @description 端到端测试：测试 AimeFramework 的多 MCP 策略
 */
async function testMultiMCPStrategy() {
  console.log("--- 开始测试 AimeFramework 的多 MCP 策略 ---");

  // 1. 定义我们的“服务器舰队”配置
  const mcpConfig: MultiMCPServerConfig = {
    // 我们只启动一个我们自己写的服务器作为示例
    "my_tool_server": {
      command: "npx",
      args: ["tsx", "src/tool_server.ts"]
    }
    // 未来您可以按格式在这里添加更多服务器，比如：
    // "memory_server": {
    //   command: "npx",
    //   args: ["-y", "@modelcontextprotocol/server-memory"]
    // }
  };

  // 2. 创建 AimeFramework 的总配置
  const frameworkConfig: AimeFrameworkConfig = {
    strategy: 'mcp',
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