简单复现字节跳动的论文aime-agent，论文地址：https://arxiv.org/pdf/2507.11988

继续完善开发中

运行：

`pnpm i`

测试运行

`npx tsx  src/aime_framework.test.ts`

mcp测试运行

`npx tsx src/mcp_client_smoke.test.ts`

测试文件

1. 支持单mcp
3. 支持本地调用工具
4. 自主组装agent，自主规划步骤，自主，阶段性检查
