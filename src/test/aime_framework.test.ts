import { AimeFramework } from '../aime_framework';

/**
 * @description 端到端测试：测试 AimeFramework 从接收目标到规划再到执行的完整流程
 */
async function testFullFlow() {
  console.log("--- 开始端到端测试 AimeFramework ---");

  const framework = new AimeFramework({ strategy: 'local' });
  const userGoal = "明天两个人在杭州怎么玩，玩一天，晚上有个人去听演唱会，一个不听";

  try {
    await framework.run(userGoal);
    console.log("\n--- AimeFramework 端到端测试成功 ---");
  } catch (error) {
    console.error("\n--- AimeFramework 端到端测试失败 ---", error);
  }
}

testFullFlow();