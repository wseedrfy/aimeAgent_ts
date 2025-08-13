import { MainTask, SubTask, TaskStatus, ProgressUpdate, SystemState } from '../types/index';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
  });
}

class Emitter {
  private map = new Map<string, Function[]>();
  on(e: string, fn: Function) { const arr = this.map.get(e) || []; arr.push(fn); this.map.set(e, arr); }
  emit(e: string, ...args: any[]) { (this.map.get(e) || []).forEach(f => f(...args)); }
}

export class ProgressManager extends Emitter {
  private tasks = new Map<string, MainTask>();
  private history = new Map<string, ProgressUpdate[]>();
  private system: SystemState = { activeTasks: [], activeActors: [], systemLoad: 0, lastUpdate: new Date() };
  constructor(private maxHistory = 1000) { super(); }

  createMainTask(title: string, description: string, userId: string, sessionId: string, metadata?: Record<string, any>): MainTask {
    const task: MainTask = { id: uuid(), title, description, status: TaskStatus.PENDING, subTasks: [], createdAt: new Date(), updatedAt: new Date(), userId, sessionId, metadata } as any;
    this.tasks.set(task.id, task); this.history.set(task.id, []); this.updateSystem(); this.emit('taskCreated', task); return task;
  }

  addSubTask(mainTaskId: string, title: string, description: string, priority = 1, dependencies: string[] = [], metadata?: Record<string, any>): SubTask | null {
    const main = this.tasks.get(mainTaskId); if (!main) return null;
    const sub: SubTask = { id: uuid(), title, description, status: TaskStatus.PENDING, priority, dependencies, createdAt: new Date(), updatedAt: new Date(), metadata } as any;
    main.subTasks.push(sub); main.updatedAt = new Date(); this.emit('subTaskAdded', mainTaskId, sub); return sub;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, message?: string, actorId?: string, metadata?: Record<string, any>): boolean {
    const main = this.tasks.get(taskId);
    if (main) { main.status = status; main.updatedAt = new Date(); this.addProgressUpdate(taskId, status, message || '', actorId, metadata); this.updateSystem(); this.emit('taskStatusUpdated', main); return true; }
    for (const m of this.tasks.values()) {
      const st = m.subTasks.find(s => s.id === taskId); if (!st) continue; st.status = status; st.updatedAt = new Date(); m.updatedAt = new Date();
      this.addProgressUpdate(m.id, status, message || '', actorId, metadata); this.checkMainDone(m.id); return true;
    }
    return false;
  }

  addProgressUpdate(taskId: string, status: TaskStatus, message: string, actorId?: string, metadata?: Record<string, any>) {
    const rec: ProgressUpdate = { taskId, status, message, timestamp: new Date(), actorId, metadata } as any;
    const arr = this.history.get(taskId) || []; arr.push(rec); if (arr.length > this.maxHistory) arr.splice(0, arr.length - this.maxHistory); this.history.set(taskId, arr); this.emit('progressUpdated', rec);
  }

  getTask(taskId: string) { return this.tasks.get(taskId) || null; }
  getActiveTasks() { return Array.from(this.tasks.values()).filter(t => [TaskStatus.PENDING, TaskStatus.IN_PROGRESS].includes(t.status)); }
  getProgressHistory(taskId: string) { return this.history.get(taskId) || []; }

  getSystemState(): SystemState { return { ...this.system }; }

  private checkMainDone(mainTaskId: string) {
    const main = this.tasks.get(mainTaskId); if (!main) return;
    const allDone = main.subTasks.every(s => s.status === TaskStatus.COMPLETED);
    const anyFailed = main.subTasks.some(s => s.status === TaskStatus.FAILED);
    if (allDone) this.updateTaskStatus(mainTaskId, TaskStatus.COMPLETED, 'All subtasks completed');
    else if (anyFailed) this.updateTaskStatus(mainTaskId, TaskStatus.FAILED, 'One or more subtasks failed');
  }

  private updateSystem() {
    this.system.activeTasks = this.getActiveTasks();
    const total = this.system.activeTasks.reduce((s, t) => s + t.subTasks.length, 0);
    const running = this.system.activeTasks.reduce((s, t) => s + t.subTasks.filter(x => x.status === TaskStatus.IN_PROGRESS).length, 0);
    this.system.systemLoad = total ? (running / total) * 100 : 0; this.system.lastUpdate = new Date(); this.emit('systemStateUpdated', this.system);
  }
}


