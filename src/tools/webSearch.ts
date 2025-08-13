import type { ToolConfig } from '../types/index';

export function createWebSearchTool() {
  const config: ToolConfig = { name: 'web_search', description: '网络搜索工具', category: 'search', schema: { type: 'object', properties: { query: { type: 'string' }, num_results: { type: 'number' } }, required: ['query'] } };
  async function execute(params: { query: string; num_results?: number }) {
    // TODO: 替换为 MCP/HTTP 实现
    return { results: [ { title: '相关信息1', url: 'http://example1.com', snippet: '摘要1' }, { title: '相关信息2', url: 'http://example2.com', snippet: '摘要2' } ] };
  }
  return { config, execute };
}


