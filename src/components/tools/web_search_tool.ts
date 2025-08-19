import { Tool } from './base_tool';

/**
 * 网络搜索工具 🌐
 * 允许 AI 执行网络搜索以获取实时信息。
 */
export class WebSearchTool implements Tool {
  public name = "webSearch";
  public description = "当你需要获取关于时事、最新信息或你不了解的知识时，使用此工具进行网络搜索。输入应该是一个清晰的搜索关键词或问题。";

  /**
   * @description 执行模拟的网络搜索
   * @param input - 要搜索的关键词或问题。
   * @returns {Promise<string>} - 模拟的搜索结果。
   */
  public async execute(input: string): Promise<string> {
    console.log(`[WebSearchTool] 正在执行网络搜索: "${input}" ...`);
    
    // **注意**: 在一个真实的生产级应用中，这里会调用一个真正的搜索引擎API
    // (例如 Google Custom Search API, Tavily API 等)。
    // 为了简化我们的教学项目，我们在这里返回一个“模拟”的搜索结果。
    // 这能让我们在不增加额外API Key复杂性的情况下，完整地测试工具调用的逻辑。
    
    // 模拟不同搜索词返回不同结果
    if (input.toLowerCase().includes("东京") && input.includes("展览")) {
      return `
        搜索结果:
        1.  **森美术馆 "我们的生态：地球与艺术" 特展**: 展出时间至 2025年9月1日。探索环境与艺术的交融，展出多位国际当代艺术家的作品。
        2.  **国立新美术馆 "现代艺术的轨迹"**: 长期展览。梳理了从印象派到21世纪的西方现代艺术发展脉络。
        3.  **东京国立博物馆 "日本国宝展"**: 不定期特别展览，需查询官网确认最新展出信息。
      `;
    } else if (input.toLowerCase().includes("北海道") && input.includes("滑雪场")) {
      return `
        搜索结果:
        - **二世谷滑雪场**: 优点是雪质极佳（粉雪），国际化程度高，雪道丰富。缺点是价格昂贵，人多。
        - **富良野滑雪场**: 优点是风景优美，雪道长且适合中级滑雪者。缺点是夜生活和餐饮选择较少。
        - **留寿都度假村**: 优点是规模大，适合家庭，除了滑雪还有其他娱乐设施。缺点是交通相对不便。
      `;
    }
    
    return `关于“${input}”的搜索结果未找到。请尝试更具体的关键词。`;
  }
}