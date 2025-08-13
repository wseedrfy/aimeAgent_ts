import type { SubTask, ActorFactoryConfig, ToolConfig, DynamicActorConfig } from '../types/index';

export class ActorFactory {
  private toolRegistry: Map<string, ToolConfig> = new Map();
  private roleTemplates: Map<string, any> = new Map();
  constructor(private config: ActorFactoryConfig) {
    this.initTools();
    this.initRoles();
  }

  private initTools() {
    const defs: ToolConfig[] = [
      { name: 'map_search', description: '地图搜索与距离计算', category: 'location' },
      { name: 'weather_api', description: '天气查询', category: 'weather' },
      { name: 'web_search', description: '网络搜索', category: 'search' },
      { name: 'review_search', description: '评价抓取', category: 'search' },
      { name: 'budget_calculator', description: '预算计算', category: 'finance' },
      { name: 'route_planner', description: '路线规划', category: 'navigation' },
      { name: 'update_progress', description: '进度更新系统工具', category: 'system' }
    ];
    for (const d of defs) this.toolRegistry.set(d.name, d);
  }

  private initRoles() {
    this.roleTemplates.set('camping_location_expert', {
      name: '亲子露营地筛选专家',
      systemPrompt: '根据家庭需求筛选最合适的露营地点，并定期报告进度。',
      tools: ['map_search', 'weather_api', 'web_search', 'review_search', 'update_progress']
    });
    this.roleTemplates.set('equipment_planner', {
      name: '家庭露营装备规划师',
      systemPrompt: '结合设施/天气/儿童需求制定装备清单，区分必备/可选，控制预算。',
      tools: ['web_search', 'weather_api', 'budget_calculator', 'update_progress']
    });
    this.roleTemplates.set('itinerary_planner', {
      name: '家庭露营行程规划师',
      systemPrompt: '制定两天行程，兼顾安全、趣味与儿童作息。',
      tools: ['route_planner', 'web_search', 'weather_api', 'update_progress']
    });
    this.roleTemplates.set('budget_manager', {
      name: '露营预算管理师',
      systemPrompt: '实时跟踪费用，确保在预算范围内。',
      tools: ['budget_calculator', 'web_search', 'update_progress']
    });
    this.roleTemplates.set('general_researcher', {
      name: '信息研究专员',
      systemPrompt: '收集分析信息，生成结构化报告。',
      tools: ['web_search', 'update_progress']
    });
  }

  createActorForTask(subTask: SubTask): DynamicActorConfig {
    const taskType = this.analyzeTaskType(subTask);
    const template = this.selectRoleTemplate(taskType);
    const tools = this.selectTools(taskType, subTask);
    return {
      id: `actor_${subTask.id}`,
      taskId: subTask.id,
      role: template.name,
      systemPrompt: `${template.systemPrompt}\n当前任务：${subTask.title}\n描述：${subTask.description}`,
      tools,
      context: {
        taskId: subTask.id,
        taskTitle: subTask.title,
        taskDescription: subTask.description,
        metadata: subTask.metadata || {}
      },
      expertise: [],
      constraints: { maxIterations: 6 },
      metadata: { taskType }
    };
  }

  private analyzeTaskType(subTask: SubTask): string {
    const m = subTask.metadata?.type;
    if (m) return m;
    const t = (subTask.title + subTask.description).toLowerCase();
    if (t.includes('地点') || t.includes('筛选')) return 'location_search';
    if (t.includes('装备') || t.includes('清单')) return 'equipment_planning';
    if (t.includes('行程')) return 'itinerary_planning';
    if (t.includes('预算')) return 'budget_management';
    return 'general_task';
  }

  private selectRoleTemplate(taskType: string) {
    const map: Record<string, string> = {
      location_search: 'camping_location_expert',
      equipment_planning: 'equipment_planner',
      itinerary_planning: 'itinerary_planner',
      budget_management: 'budget_manager',
      general_task: 'general_researcher'
    };
    return this.roleTemplates.get(map[taskType] || 'general_researcher');
  }

  private selectTools(taskType: string, subTask: SubTask): ToolConfig[] {
    const toolMap: Record<string, string[]> = {
      location_search: ['map_search', 'weather_api', 'web_search', 'review_search'],
      equipment_planning: ['web_search', 'weather_api', 'budget_calculator'],
      itinerary_planning: ['route_planner', 'web_search', 'weather_api'],
      budget_management: ['budget_calculator', 'web_search'],
      general_task: ['web_search']
    };
    const names = new Set([...(toolMap[taskType] || ['web_search']), 'update_progress', ...(subTask.metadata?.tools || [])]);
    const tools: ToolConfig[] = [];
    names.forEach(n => { const t = this.toolRegistry.get(n); if (t) tools.push(t); });
    return tools;
  }

  registerTool(tool: ToolConfig) { this.toolRegistry.set(tool.name, tool); }
  registerRoleTemplate(key: string, tpl: any) { this.roleTemplates.set(key, tpl); }
}


