/**
 * 记忆模块 🧠
 * 一个简单的键值对存储，作为智能体的长期工作记忆。
 * 所有专家 Actor 将共享同一个记忆模块实例。
 */
export class MemoryModule {
    private memory: Map<string, any>;
  
    constructor() {
      this.memory = new Map<string, any>();
      console.log("[MemoryModule] 长期记忆模块已激活。");
    }
  
    /**
     * @description 将一个键值对存入记忆
     * @param key - 信息的键（例如 "budget"）
     * @param value - 信息的值（例如 "5000元"）
     */
    public save(key: string, value: any): void {
      this.memory.set(key, value);
      console.log(`[MemoryModule] 记忆已更新: [${key}] ->`, value);
    }
  
    /**
     * @description 从记忆中读取一个键的值
     * @param key - 要读取的键
     * @returns {any} - 返回找到的值，如果找不到则返回 null
     */
    public read(key: string): any {
      return this.memory.get(key) || null;
    }
  
    /**
     * @description (辅助功能) 读取所有记忆，用于上下文提供
     * @returns {string} - 格式化后的所有记忆内容
     */
    public readAll(): string {
      if (this.memory.size === 0) {
        return "目前没有存储任何记忆。";
      }
      let memoryString = "";
      this.memory.forEach((value, key) => {
        memoryString += `- ${key}: ${JSON.stringify(value)}\n`;
      });
      return memoryString;
    }
  }