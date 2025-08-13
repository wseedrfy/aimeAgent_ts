import { AimeAgentConfig, AimeResponse, SubTask, TaskDecompositionResult, ActorExecutionResult, TaskStatus } from './types/index.js';
import { ProgressManager } from './core/progressManager.js';
import { DynamicPlanner } from './core/dynamicPlanner.js';
import { ActorFactory } from './core/actorFactory.js';
import { DynamicActor } from './core/dynamicActor.js';

export class AimeAgent {
  private config: AimeAgentConfig;
  private progressManager: ProgressManager;
  private dynamicPlanner: DynamicPlanner;
  private actorFactory: ActorFactory;
  private activeActors: Map<string, DynamicActor> = new Map();

  constructor(config: AimeAgentConfig) {
    this.config = config;
    this.progressManager = new ProgressManager(config.progressManagement.maxHistory);
    this.dynamicPlanner = new DynamicPlanner(this.progressManager, config);
    this.actorFactory = new ActorFactory(config.actorFactory);
  }

  async processRequest(userInput: string, userId: string, sessionId: string): Promise<AimeResponse> {
    const start = Date.now();
    try {
      const plan = await this.dynamicPlanner.analyzeAndDecompose(userInput, userId, sessionId);
      const execResults = await this.executeTaskPlan(plan);
      return this.generateResponse(plan, execResults, Date.now() - start);
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : String(e),
        mainTaskId: '',
        executionTime: Date.now() - start,
        metadata: { error: true }
      };
    }
  }

  private async executeTaskPlan(plan: TaskDecompositionResult): Promise<ActorExecutionResult[]> {
    const results: ActorExecutionResult[] = [];
    for (const taskId of plan.executionPlan) {
      const sub = plan.subTasks.find(t => t.id === taskId);
      if (!sub) continue;
      const res = await this.executeSubTask(sub);
      results.push(res);
      if (res.status === 'completed') {
        await this.dynamicPlanner.adjustPlan(plan.mainTask.id, sub.id, res.result);
      }
    }
    return results;
  }

  private async executeSubTask(subTask: SubTask): Promise<ActorExecutionResult> {
    const actorCfg = this.actorFactory.createActorForTask(subTask);
    const actor = new DynamicActor(actorCfg, this.progressManager);
    this.activeActors.set(actorCfg.id, actor);
    try {
      return await actor.executeTask(subTask);
    } finally {
      this.activeActors.delete(actorCfg.id);
    }
  }

  private generateResponse(plan: TaskDecompositionResult, results: ActorExecutionResult[], time: number): AimeResponse {
    const completed = results.filter(r => r.status === 'completed');
    const failed = results.filter(r => r.status === 'failed');
    const success = failed.length === 0 && completed.length > 0;
    const message = `任务"${plan.mainTask.title}"处理完成：成功 ${completed.length}，失败 ${failed.length}`;
    this.progressManager.updateTaskStatus(plan.mainTask.id, success ? TaskStatus.COMPLETED : TaskStatus.FAILED, message);
    return { success, message, mainTaskId: plan.mainTask.id, subTaskResults: results, executionTime: time, metadata: { totalSubTasks: plan.subTasks.length } };
  }
}


