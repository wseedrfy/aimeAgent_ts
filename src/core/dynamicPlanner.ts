import { AimeAgentConfig, TaskDecompositionResult, SubTask, TaskStatus } from '../types/index';
import { ProgressManager } from './progressManager';

export class DynamicPlanner {
  constructor(private progressManager: ProgressManager, private config: AimeAgentConfig) {}

  async analyzeAndDecompose(userInput: string, userId: string, sessionId: string): Promise<TaskDecompositionResult> {
    const main = this.progressManager.createMainTask(this.extractTitle(userInput), userInput, userId, sessionId, { originalInput: userInput });
    const subTasks = await this.decompose(userInput, main.id);
    const executionPlan = this.generateExecutionPlan(subTasks);
    return { mainTask: main, subTasks, executionPlan };
  }

  private async decompose(userInput: string, mainTaskId: string): Promise<SubTask[]> {
    const rules = this.getRules(userInput);
    const out: SubTask[] = [];
    for (const r of rules) {
      const st = this.progressManager.addSubTask(mainTaskId, r.title, r.description, r.priority, r.dependencies, r.metadata);
      if (st) out.push(st);
    }
    return out;
  }

  private getRules(userInput: string) {
    const txt = userInput.toLowerCase();
    if (txt.includes('露营') || txt.includes('camp')) {
      return [
        { title: '筛选露营地点', description: '根据距离、设施、天气筛选露营地', priority: 10, dependencies: [], metadata: { type: 'location_search' } },
        { title: '制定装备清单', description: '结合设施与天气制定装备清单', priority: 8, dependencies: [], metadata: { type: 'equipment_planning' } },
        { title: '规划行程安排', description: '两天行程（出发/活动/返程）', priority: 6, dependencies: [], metadata: { type: 'itinerary_planning' } },
        { title: '预算控制管理', description: '跟踪预算，控制在阈值内', priority: 7, dependencies: [], metadata: { type: 'budget_management' } }
      ];
    }
    return [
      { title: '信息收集', description: '收集相关信息', priority: 10, dependencies: [], metadata: { type: 'information_gathering' } },
      { title: '方案分析', description: '分析解决方案', priority: 8, dependencies: [], metadata: {} },
      { title: '执行计划', description: '制定执行计划', priority: 6, dependencies: [], metadata: {} }
    ];
  }

  private generateExecutionPlan(subTasks: SubTask[]): string[] {
    const sorted = [...subTasks].sort((a, b) => b.priority - a.priority);
    const plan: string[] = [];
    const done = new Set<string>();
    while (plan.length < sorted.length) {
      for (const t of sorted) {
        if (!done.has(t.id) && t.dependencies.every(d => done.has(d))) {
          plan.push(t.id);
          done.add(t.id);
        }
      }
    }
    return plan;
  }

  async adjustPlan(mainTaskId: string, completedTaskId: string, result: string): Promise<boolean> {
    // 简化：示例中当地点筛选结果出现“80公里/近”时派生预算调整任务
    const needBudgetAdjust = /80公里|近/.test(result);
    if (needBudgetAdjust) {
      this.progressManager.addSubTask(mainTaskId, '调整交通预算', '根据近距离结果调整交通预算', 5, [completedTaskId], { type: 'budget_adjustment' });
      return true;
    }
    return false;
  }

  getTaskOverview(mainTaskId: string) {
    const main = this.progressManager.getTask(mainTaskId);
    if (!main) return null;
    return {
      total: main.subTasks.length,
      completed: main.subTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      inProgress: main.subTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      pending: main.subTasks.filter(t => t.status === TaskStatus.PENDING).length,
      failed: main.subTasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  }

  private extractTitle(input: string) {
    const parts = input.split(' ');
    return parts.length <= 8 ? input : parts.slice(0, 8).join(' ') + '...';
    
  }
}


