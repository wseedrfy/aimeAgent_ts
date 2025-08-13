import type { ToolConfig } from '../types/index';

export function createMapTool() {
  const config: ToolConfig = { name: 'map_search', description: '地图搜索与距离计算', category: 'location', schema: { type: 'object', properties: { query: { type: 'string' }, center: { type: 'string' }, radius: { type: 'number' } }, required: ['query'] } };
  async function execute(params: { query: string; center?: string; radius?: number }) {
    // TODO: 替换为 MCP/HTTP 实现
    return { locations: [
      { name: '淀山湖露营地', distance: 80, facilities: ['儿童游乐区', '卫生间', '围栏'] },
      { name: '苏州太湖畔营地', distance: 280, facilities: ['室内活动区', '卫生间'] },
      { name: '杭州湾湿地营地', distance: 200, facilities: ['观鸟台', '步道'] }
    ] };
  }
  return { config, execute };
}


