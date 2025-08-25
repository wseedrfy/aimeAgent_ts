import { ActorFactory } from './actor_factory';
import { MemoryModule } from './memory_module';
import { Task } from './progress_manager';
import { LocalToolExecutor } from './tools/local_tool_executor';

/**
 * @description 测试 ActorFactory 的创建流程
 */
async function testActorFactory() {
  console.log("--- 开始测试 ActorFactory ---");

  // 1. 创建一个 ActorFactory 的实例
  const factory = new ActorFactory(new MemoryModule(), new LocalToolExecutor());

  // 2. 模拟一个从“白板”上取下来的任务
  const sampleTask: Task = {
    id: 101,
    description: "分析日本东京地区三大主要航空公司的机票价格、准点率和客户评价，为家庭旅行推荐性价比最高的选项。",
    status: 'pending',
    subtasks: []
  };

  try {
    // 3. 让工厂为这个任务创建一个 Actor
    console.log(`\n正在为任务: "${sampleTask.description}" 创建专家...`);
    const expertActor = await factory.createActor(sampleTask);

    // 4. 验证结果：打印出 AI 为这个 Actor 生成的人设
    console.log("\n--- ActorFactory 测试成功 ---");
    console.log("✅ 成功创建了专家 Actor!");
    console.log(`✨ AI 生成的人设 (Persona): "${expertActor.persona}"`);

  } catch (error) {
    console.error("\n--- ActorFactory 测试失败 ---", error);
  }
}

// 运行测试
testActorFactory();