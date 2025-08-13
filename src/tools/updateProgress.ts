import { ToolConfig, TaskStatus } from '../types/index';
import { ProgressManager } from '../core/progressManager';

export function createUpdateProgressTool(progress: ProgressManager) {
  const config: ToolConfig = { name: 'update_progress', description: '向进度管理模块报告任务进度', category: 'system', schema: { type: 'object', properties: { status: { type: 'string' }, message: { type: 'string' }, data: { type: 'object' } }, required: ['status', 'message'] } };
  async function execute(params: { taskId: string; status: keyof typeof TaskStatus | string; message: string; data?: any; actorId?: string }) {
    const map: Record<string, TaskStatus> = { started: TaskStatus.IN_PROGRESS, in_progress: TaskStatus.IN_PROGRESS, completed: TaskStatus.COMPLETED, failed: TaskStatus.FAILED } as any;
    progress.addProgressUpdate(params.taskId, map[params.status] ?? TaskStatus.IN_PROGRESS, params.message, params.actorId, params.data);
    return { ok: true };
  }
  return { config, execute };
}


