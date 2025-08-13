import { SubTask, DynamicActorConfig, ActorExecutionResult, ReactLoopState, TaskStatus } from '../types/index';
import { ProgressManager } from './progressManager';

type ReactStep = 'reasoning' | 'action' | 'observation';

export class DynamicActor {
  private reactState: ReactLoopState;
  private executionLog: Array<{ step: ReactStep; content: string; timestamp: Date; data?: any }> = [];

  constructor(private config: DynamicActorConfig, private progressManager: ProgressManager) {
    this.reactState = {
      currentStep: 'reasoning',
      iteration: 0,
      maxIterations: config.constraints.maxIterations || 6,
      isCompleted: false,
      lastAction: null,
      lastObservation: null,
      context: { ...config.context }
    };
  }

  async executeTask(subTask: SubTask): Promise<ActorExecutionResult> {
    this.progressManager.updateTaskStatus(subTask.id, TaskStatus.IN_PROGRESS, `${this.config.role} 开始执行`);
    await this.updateProgress('started', `开始执行任务: ${subTask.title}`);

    const start = Date.now();
    try {
      const exec = await this.runReactLoop(subTask);
      const result: ActorExecutionResult = {
        taskId: subTask.id,
        actorId: this.config.id,
        status: exec.success ? 'completed' : 'failed',
        result: exec.result,
        reasoning: exec.reasoning,
        executionTime: Date.now() - start,
        iterations: this.reactState.iteration,
        logs: this.executionLog,
        metadata: { toolsUsed: exec.toolsUsed }
      };
      this.progressManager.updateTaskStatus(subTask.id, exec.success ? TaskStatus.COMPLETED : TaskStatus.FAILED, exec.result);
      await this.updateProgress(exec.success ? 'completed' : 'failed', exec.result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.progressManager.updateTaskStatus(subTask.id, TaskStatus.FAILED, msg);
      await this.updateProgress('failed', msg);
      return {
        taskId: subTask.id,
        actorId: this.config.id,
        status: 'failed',
        result: msg,
        reasoning: '异常中止',
        executionTime: Date.now() - start,
        iterations: this.reactState.iteration,
        logs: this.executionLog,
        metadata: { error: true }
      };
    }
  }

  private async runReactLoop(subTask: SubTask) {
    const toolsUsed: string[] = [];
    let finalResult = '';
    let finalReasoning = '';
    while (!this.reactState.isCompleted && this.reactState.iteration < this.reactState.maxIterations) {
      this.reactState.iteration++;
      switch (this.reactState.currentStep) {
        case 'reasoning':
          finalReasoning = await this.performReasoning(subTask);
          this.reactState.currentStep = 'action';
          break;
        case 'action': {
          const actionResult = await this.performAction(subTask);
          if (actionResult.toolUsed) toolsUsed.push(actionResult.toolUsed);
          this.reactState.lastAction = actionResult.action;
          this.reactState.currentStep = 'observation';
          break; }
        case 'observation': {
          const obs = await this.performObservation();
          this.reactState.lastObservation = obs;
          if (this.shouldCompleteTask(obs)) {
            this.reactState.isCompleted = true;
            finalResult = this.generateFinalResult();
          } else {
            this.reactState.currentStep = 'reasoning';
          }
          break; }
      }
      await this.updateProgress('in_progress', `第${this.reactState.iteration}轮 ${this.reactState.currentStep} 完成`);
    }
    if (!this.reactState.isCompleted) {
      finalResult = this.generatePartialResult();
      finalReasoning += '（达到最大迭代次数，部分完成）';
    }
    return { success: this.reactState.isCompleted, result: finalResult, reasoning: finalReasoning, toolsUsed };
  }

  private async performReasoning(subTask: SubTask): Promise<string> {
    const type = subTask.metadata?.type || 'general';
    let text = `分析任务"${subTask.title}" 类型:${type} 工具:${this.config.tools.map(t => t.name).join(', ')}`;
    this.log('reasoning', text);
    return text;
  }

  private async performAction(subTask: SubTask) {
    const type = subTask.metadata?.type || 'general';
    if (type === 'location_search' && this.reactState.iteration === 1) {
      const res = await this.callTool('map_search', { query: '上海周边露营地', center: '上海', radius: 300 });
      const desc = '搜索露营地点';
      this.log('action', `${desc} - 结果:${JSON.stringify(res).slice(0, 200)}`, { result: res });
      return { action: desc, result: res, toolUsed: 'map_search' };
    }
    if (type === 'location_search' && this.reactState.iteration === 2) {
      const res = await this.callTool('weather_api', { location: '上海周边', days: 3 });
      const desc = '获取天气预报';
      this.log('action', `${desc} - 结果:${JSON.stringify(res).slice(0, 200)}`, { result: res });
      return { action: desc, result: res, toolUsed: 'weather_api' };
    }
    const res = await this.callTool('web_search', { query: subTask.title, num_results: 5 });
    const desc = '搜索相关信息';
    this.log('action', `${desc} - 结果:${JSON.stringify(res).slice(0, 200)}`, { result: res });
    return { action: desc, result: res, toolUsed: 'web_search' };
  }

  private async performObservation(): Promise<string> {
    const last = this.executionLog[this.executionLog.length - 1]?.data?.result;
    let obs = '行动完成，待分析。';
    if (last?.locations) obs = `找到${last.locations.length}个营地，淀山湖露营地距离近设施完善。`;
    else if (last?.forecast) obs = '天气：周六晴、周日小雨。';
    else if (last?.results) obs = `搜索到${last.results.length}条相关信息。`;
    this.log('observation', obs);
    return obs;
  }

  private shouldCompleteTask(observation: string): boolean {
    const keywords = ['完成', '找到', '成功', '满足要求'];
    const ok = keywords.some(k => observation.includes(k));
    return this.reactState.iteration >= 3 && ok;
  }

  private generateFinalResult(): string {
    const actions = this.executionLog.filter(x => x.step === 'action');
    const lastData = actions[actions.length - 1]?.data?.result;
    let text = `任务"${this.config.context.taskTitle}"执行完成。\n`;
    if (lastData) text += `\n最终数据：${JSON.stringify(lastData, null, 2)}`;
    return text;
  }

  private generatePartialResult(): string {
    return `任务"${this.config.context.taskTitle}"部分完成（达到迭代上限）。`;
  }

  private async updateProgress(status: string, message: string, data?: any) {
    const map: Record<string, TaskStatus> = { started: TaskStatus.IN_PROGRESS, in_progress: TaskStatus.IN_PROGRESS, completed: TaskStatus.COMPLETED, failed: TaskStatus.FAILED };
    this.progressManager.addProgressUpdate(this.config.taskId, map[status] ?? TaskStatus.IN_PROGRESS, message, this.config.id, { role: this.config.role, iteration: this.reactState.iteration, ...data });
    return { success: true };
  }

  private async callTool(toolName: string, params: any) {
    // 目前为 mock，后续将由 tools 目录中的 ToolRuntime 接管
    switch (toolName) {
      case 'map_search':
        return { locations: [
          { name: '淀山湖露营地', distance: 80, facilities: ['儿童游乐区', '卫生间', '围栏'] },
          { name: '苏州太湖畔营地', distance: 280, facilities: ['室内活动区', '卫生间'] },
          { name: '杭州湾湿地营地', distance: 200, facilities: ['观鸟台', '步道'] }
        ]};
      case 'weather_api':
        return { forecast: [ { date: '周六', weather: '晴', temperature: '20-28°C' }, { date: '周日', weather: '小雨', temperature: '18-25°C' } ] };
      case 'web_search':
        return { results: [ { title: '相关信息1', url: 'http://example1.com', snippet: '摘要1' }, { title: '相关信息2', url: 'http://example2.com', snippet: '摘要2' } ] };
      default:
        return { ok: true };
    }
  }

  private log(step: ReactStep, content: string, data?: any) {
    this.executionLog.push({ step, content, timestamp: new Date(), data });
  }

  getCurrentState(): ReactLoopState { return { ...this.reactState }; }
}


