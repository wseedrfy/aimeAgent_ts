import type { ToolConfig } from '../types/index';

export function createWeatherTool() {
  const config: ToolConfig = { name: 'weather_api', description: '天气查询', category: 'weather', schema: { type: 'object', properties: { location: { type: 'string' }, days: { type: 'number' } }, required: ['location'] } };
  async function execute(params: { location: string; days?: number }) {
    // TODO: 替换为 MCP/HTTP 实现
    return { forecast: [ { date: '周六', weather: '晴', temperature: '20-28°C' }, { date: '周日', weather: '小雨', temperature: '18-25°C' } ] };
  }
  return { config, execute };
}


