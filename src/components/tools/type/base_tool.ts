/**
 * @description 工具接口 (Tool Interface)
 * 定义了所有工具都必须遵守的规范。
 * 每个工具都必须有名称、功能描述和执行方法。
 */
export interface Tool {
    /**
     * @description 工具的唯一名称，供 AI 调用。应使用英文驼峰式命名。
     * @example "webSearch", "calculator", "askUser"
     */
    name: string;
  
    /**
     * @description 工具功能的详细描述。
     * 这段描述会展示给 AI，AI 将根据它来判断在何种情况下应该使用此工具。
     * 描述的越清晰、准确，AI 的决策能力就越强。
     */
    description: string;
  
    /**
     * @description 工具的执行入口。
     * @param input - 工具执行时所需的输入参数。
     * @returns {Promise<string>} - 工具执行后返回的文本结果。
     */
    execute(input: any): Promise<string>;
  }