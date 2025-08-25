import { AimeFramework } from './aime_framework';
import { MCPServerConfig } from './components/tools/mcp_client';

/**
 * @description 测试 AimeFramework 的 MCP 策略执行流程
 */
async function testMCPStrategy() {
  console.log("--- 开始测试 AimeFramework 的 MCP 策略 ---");

  // 1. 定义我们自己的工具服务器的启动配置
  const myToolServerConfig: MCPServerConfig = {
    command: "npx",
    args: ["tsx", "src/mcp/test_server.ts"]
  };

  // 2. 创建 AimeFramework 实例，明确指定使用 'mcp' 策略，并传入配置
  const framework = new AimeFramework('mcp', myToolServerConfig);

  const userGoal = "为我的北海道滑雪之旅，获取一个合适的预算建议。";

  // 为了让测试可控，我们减少最大回合数
  // @ts-ignore
  framework.maxTurns = 5;

  try {
    await framework.run(userGoal);
    console.log("\n--- AimeFramework MCP 策略测试成功 ---");
  } catch (error) {
    console.error("\n--- AimeFramework MCP 策略测试失败 ---", error);
  } finally {
    // **重要**：我们需要一种方式来关闭由 MCPExecutor 启动的子进程
    // 这是一个更高级的话题，目前需要手动结束测试进程 (Ctrl+C)
    console.log("\n测试结束。如果工具服务器仍在运行，请手动停止 (Ctrl+C)。");
  }
}

testMCPStrategy();