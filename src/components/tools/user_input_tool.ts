import { Tool } from './type/base_tool';
import * as readline from 'readline/promises'; // 引入 Node.js 的原生交互模块

/**
 * 用户输入工具 🙋‍♂️
 * 一个允许 AI 在信息不足时，暂停任务并向真实用户提问的工具。
 */
export class UserInputTool implements Tool {
  public name = "askUser";
  public description = "当你需要额外信息才能完成任务时，使用此工具向用户提问。输入应该是你需要向用户提出的具体问题。";

  /**
   * @description 执行向用户提问的动作
   * @param input - 一个字符串，即要向用户提出的问题。
   * @returns {Promise<string>} - 用户在命令行中输入的回答。
   */
  public async execute(input: string): Promise<string> {
    // 创建一个接口来读取命令行输入
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 打印问题并等待用户输入
    console.log("\n-------------------------");
    const answer = await rl.question(`🤔 [智能体向您提问]: ${input}\n> `);
    console.log("-------------------------");

    // 关闭接口
    rl.close();
    
    return answer;
  }
}