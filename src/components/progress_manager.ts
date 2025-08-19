export interface Task {
    id: number;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    subtasks: Task[];
    result?: string;
}

/**
 * 进度管理模块 📋 (中央白板)
 */
export class ProgressManager {
    private tasks: Task[] = [];
    private nextId = 1;

    /**
     * @description 初始化任务白板，设定总目标
     * @param goal - 顶层的总目标
     * @returns {Task} - 创建的根任务对象
     */
    public initializePlan(goal: string): Task {
        const rootTask: Task = {
            id: this.nextId++,
            description: goal,
            status: 'pending',
            subtasks: [],
        };
        this.tasks = [rootTask];
        console.log(`[ProgressManager] 白板初始化，总目标: ${goal}`);
        return rootTask;
    }

    /**
     * @description 在指定父任务下，一次性添加多个子任务
     * @param parentId - 父任务的 ID
     * @param subtaskDescriptions - 子任务描述的字符串数组
     * @returns {Task[]} - 创建的新子任务对象数组
     */
    public addSubtasks(parentId: number, subtaskDescriptions: string[]): Task[] {
        const parentTask = this.findTask(parentId);
        if (!parentTask) {
            console.error(`[ProgressManager] 错误：找不到父任务 ID: ${parentId}`);
            return [];
        }

        const newSubtasks: Task[] = subtaskDescriptions.map(desc => ({
            id: this.nextId++,
            description: desc,
            status: 'pending',
            subtasks: [],
        }));

        parentTask.subtasks.push(...newSubtasks);
        console.log(`[ProgressManager] 在任务 #${parentId} 下添加了 ${newSubtasks.length} 个子任务。`);
        return newSubtasks;
    }

    /**
     * @description (新增方法) 更新指定任务的状态和结果
     * @param taskId - 要更新的任务的 ID
     * @param status - 新的状态 ('completed' 或 'failed')
     * @param result - 任务执行后产出的结果
     */
    public updateTask(taskId: number, status: 'completed' | 'failed', result: string): void {
        const task = this.findTask(taskId);
        if (task) {
            task.status = status;
            task.result = result;
            console.log(`[ProgressManager] 任务 #${taskId} ('${task.description}') 状态更新为 -> ${status}`);
        } else {
            console.error(`[ProgressManager] 错误：尝试更新一个不存在的任务 ID: ${taskId}`);
        }
    }

    /**
     * @description (新增方法) 从整个任务树中，找到下一个需要处理的、状态为 'pending' 的叶子节点任务
     * @returns {Task | null} - 返回找到的待办任务，如果所有任务都已完成则返回 null
     */
    public getNextPendingTask(): Task | null {
        const findFirstPending = (tasks: Task[]): Task | null => {
            for (const task of tasks) {
                // 如果一个任务是 pending 状态，并且它没有子任务（意味着它是一个可以直接执行的任务），那就返回它
                if (task.status === 'pending' && task.subtasks.length === 0) {
                    return task;
                }

                // 如果它有子任务，就递归地在子任务里寻找
                // 只有当所有子任务都完成后，父任务的状态才会被更新，所以我们不需要检查父任务的状态
                if (task.subtasks.length > 0) {
                    const pendingSubtask = findFirstPending(task.subtasks);
                    if (pendingSubtask) {
                        return pendingSubtask;
                    }
                }
            }
            return null;
        };
        return findFirstPending(this.tasks);
    }

    /**
     * @description (这是一个私有辅助函数) 通过 ID 在整个任务树中递归查找一个任务
     * @param taskId - 要查找的任务 ID
     * @param tasklist - 当前递归层级的任务列表
     * @returns {Task | null} - 找到的任务对象或 null
     */
    private findTask(taskId: number, tasklist: Task[] = this.tasks): Task | null {
        for (const task of tasklist) {
            if (task.id === taskId) return task;
            const foundInSubtasks = this.findTask(taskId, task.subtasks);
            if (foundInSubtasks) return foundInSubtasks;
        }
        return null;
    }

    /**
    * @description 递归地收集所有已完成任务的结果
    * @returns {string[]} - 一个包含所有结果文本的数组
    */
    public getAllCompletedResults(): string[] {
        const results: string[] = [];
        const collect = (tasks: Task[]) => {
            for (const task of tasks) {
                if (task.status === 'completed' && task.result) {
                    // 将任务描述和结果结合起来，为最终报告提供更丰富的上下文
                    results.push(`关于任务“${task.description}”的结果是：${task.result}`);
                }
                if (task.subtasks.length > 0) {
                    collect(task.subtasks);
                }
            }
        };
        collect(this.tasks);
        return results;
    }

    /**
     * @description (新增的触发器函数) 查找一个所有直接子任务都已完成，但自身状态仍为 'pending' 的父任务
     * @returns {Task | null} - 返回需要被复盘的父任务，如果没有则返回 null
     */
    public findParentTaskToReview(): Task | null {
        const findReviewable = (tasks: Task[]): Task | null => {
            for (const task of tasks) {
                // 如果一个任务有子任务，并且它自己还是 pending 状态
                if (task.subtasks.length > 0 && task.status === 'pending') {
                    // 检查它的所有子任务是否都已完成
                    const allChildrenDone = task.subtasks.every(st => st.status === 'completed' || st.status === 'failed');
                    if (allChildrenDone) {
                        return task; // 找到了！就是这个父任务需要被复盘
                    }
                    // 如果子任务没完成，就继续在更深的层级里寻找
                    const reviewableInSubtree = findReviewable(task.subtasks);
                    if (reviewableInSubtree) {
                        return reviewableInSubtree;
                    }
                }
            }
            return null;
        };
        return findReviewable(this.tasks);
    }

    /**
   * @description (全新功能) 为一个即将执行的任务，生成其上下文“项目简报”
   * @param task - 即将被执行的任务
   * @returns {string} - 格式化后的上下文简报字符串
   */
    public getTaskContext(task: Task): string {
        if (this.tasks.length === 0) return "没有总目标。";

        const rootGoal = `总目标: ${this.tasks[0].description}`;
        let siblingResults = "";

        // 找到这个任务的父任务
        const parent = this.findParentOf(task, this.tasks);
        if (parent && parent.subtasks.length > 1) {
            const completedSiblings = parent.subtasks.filter(
                st => st.id !== task.id && st.status === 'completed' && st.result
            );
            if (completedSiblings.length > 0) {
                siblingResults = "\n\n相关已完成任务的成果:\n" + completedSiblings.map(
                    st => `- 关于“${st.description}”：${st.result}`
                ).join('\n');
            }
        }

        return rootGoal + siblingResults;
    }

    /**
     * @description (新的辅助函数) 查找一个任务的父任务
     */
    private findParentOf(childTask: Task, tasks: Task[]): Task | null {
        for (const task of tasks) {
            if (task.subtasks.some(st => st.id === childTask.id)) {
                return task;
            }
            const parent = this.findParentOf(childTask, task.subtasks);
            if (parent) return parent;
        }
        return null;
    }

    /**
    * @description 打印当前整个任务白板的状态，用于调试 (修正版)
    */
    public printProgress(): void {
        console.log("\n--- 任务白板当前状态 ---");
        const printTasks = (tasks: Task[], indent = "") => {
            for (const task of tasks) {
                const icon = task.status === 'completed' ? '[√]' : (task.status === 'failed' ? '[×]' : '[ ]');
                console.log(`${indent}${icon} ${task.description} (ID: ${task.id})`);

                // **新增的修正逻辑：如果任务有结果，就把它打印出来！**
                if (task.result) {
                    // 为了美观，我们给结果加上缩进和前缀
                    const resultPrefix = `${indent}  └──> 成果: `;
                    const formattedResult = task.result.replace(/\n/g, `\n${resultPrefix}`); // 多行结果保持缩进
                    console.log(resultPrefix + formattedResult);
                }

                if (task.subtasks.length > 0) {
                    printTasks(task.subtasks, indent + "  ");
                }
            }
        }
        printTasks(this.tasks);
        console.log("---------------------------\n");
    }
}