import { Tool } from './base_tool';
import { MemoryModule } from '../memory_module';

/**
 * 保存到记忆工具 💾
 * 允许 AI 将关键信息保存到长期记忆中。
 */
export class SaveToMemoryTool implements Tool {
  public name = "saveToMemory";
  public description = "当你获取到了一个在后续任务中可能会用到的关键信息时（例如用户的偏好、预算、姓名、具体日期等），使用此工具将其保存。输入应该是一个 JSON 对象，包含 'key' 和 'value'。";
  private memory: MemoryModule;

  constructor(memory: MemoryModule) {
    this.memory = memory;
  }

  public async execute(input: { key: string; value: any }): Promise<string> {
    if (!input.key || input.value === undefined) {
      return "错误：输入必须是包含 'key' 和 'value' 的 JSON 对象。";
    }
    this.memory.save(input.key, input.value);
    return `信息 [${input.key}] 已成功保存。`;
  }
}

/**
 * 从记忆中读取工具 📖
 * 允许 AI 从长期记忆中读取之前保存的信息。
 */
export class ReadFromMemoryTool implements Tool {
  public name = "readFromMemory";
  public description = "当你需要一个信息，但不确定它是否存在时，可以使用此工具从记忆中读取。输入应该是你想要读取的信息的 'key'。";
  private memory: MemoryModule;

  constructor(memory: MemoryModule) {
    this.memory = memory;
  }

  public async execute(input: { key:string }): Promise<string> {
    if (!input.key) {
        return "错误：输入必须是包含 'key' 的 JSON 对象。"
    }
    const value = this.memory.read(input.key);
    if (value !== null) {
      return `从记忆中读取 [${input.key}] 的结果是: ${JSON.stringify(value)}`;
    } else {
      return `在记忆中没有找到关于 [${input.key}] 的信息。`;
    }
  }
}