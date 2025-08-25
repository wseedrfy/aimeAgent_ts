import { TravelActor } from './travel_actor';
import { createDefaulAIClient } from '../../core/ai_sdk';
import { Task } from '../progress_manager';
import { UserInputTool } from '../tools/user_input_tool';
import { WebSearchTool } from '../tools/web_search_tool'; // 引入新工具

import { LocalToolExecutor } from '../tools/local_tool_executor';
/**
 * @description 测试 TravelActor 在拥有多个工具时，是否能做出正确的决策
 */
async function testMultiToolActor() {
  console.log("--- 开始测试 TravelActor 的多工具决策能力 ---");
  
  // 1. 模拟一个更复杂的、需要结合搜索和用户偏好的任务
  const sampleTask: Task = {
    id: 401,
    description: "为用户推荐一个目前在东京最适合他的艺术展览。",
    status: 'pending',
    subtasks: []
  };

  const context = "总目标: 策划一次东京之旅。用户的个人兴趣尚未明确。";
  
  // 2. 创建所有工具的实例
  const aiClient = createDefaulAIClient();
  const userInputTool = new UserInputTool();
  const webSearchTool = new WebSearchTool();

  // 3. 创建 TravelActor 实例，并把**所有**工具都“装”给它
  const persona = "你是一名知识渊博且善于沟通的东京旅行向导。";
  const toolExecutor = new LocalToolExecutor();
  // **注意**：工具箱里现在有两个工具了！
  const travelExpert = new TravelActor(persona, aiClient, toolExecutor, [userInputTool, webSearchTool]);

  try {
    const result = await travelExpert.run(sampleTask, context);

    console.log("\n--- TravelActor 多工具测试成功 ---");
    console.log(`✅ 专家最终返回的答案是:`);
    console.log(result);

  } catch(error) {
    console.error("\n--- TravelActor 多工具测试失败 ---", error);
  }
}

// 运行测试
testMultiToolActor();