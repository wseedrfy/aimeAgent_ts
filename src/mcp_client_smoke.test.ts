import { MCPClient } from './components/tools/mcp_client';
import type { MCPServerConfig } from './components/tools/mcp_client';

async function main() {

  const mcpConfig: MCPServerConfig = {
    command: "npx",
    args: ["tsx", "src/mcp/test_server.ts"]
  };

  const client = new MCPClient();
  try {
    console.error('[SmokeTest] 准备连接 MCP 服务器...');
    await client.connect(mcpConfig);
    console.error('[SmokeTest] 已连接 MCP 服务器。');

    console.error('[SmokeTest] 开始调用 askUser...');
    const askUserResult = await client.callTool('askUser', {
      question: '请一次性告诉我：出发日期、返程日期、同行人数（共几人）',
    });
    console.log('[SmokeTest] askUser 返回:', askUserResult);

    console.error('[SmokeTest] 开始调用 webSearch...');
    const webResult = await client.callTool('webSearch', { query: '北京 上海 往返 机票 酒店 两天 安排' });
    console.log('[SmokeTest] webSearch 返回:', webResult);
  } catch (err) {
    console.error('[SmokeTest] 运行失败:', err);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

main().catch((e) => {
  console.error('[SmokeTest] 未捕获异常:', e);
  process.exit(1);
});


