export enum TaskStatus { PENDING='pending', IN_PROGRESS='in_progress', COMPLETED='completed', FAILED='failed', CANCELLED='cancelled' }

export interface SubTask { id: string; title: string; description: string; status: TaskStatus; priority: number; dependencies: string[]; assignedActorId?: string; result?: string; createdAt: Date; updatedAt: Date; metadata?: Record<string, any>; }

export interface MainTask { id: string; title: string; description: string; status: TaskStatus; subTasks: SubTask[]; createdAt: Date; updatedAt: Date; userId: string; sessionId: string; metadata?: Record<string, any>; }

export interface ProgressUpdate { taskId: string; status: TaskStatus; message: string; timestamp: Date; actorId?: string; metadata?: Record<string, any>; }

export interface ToolConfig { name: string; description: string; category: string; schema?: { type: string; properties?: Record<string, any>; required?: string[] } }

export interface ActorFactoryConfig { availableTools: ToolConfig[]; knowledgeBases: string[]; defaultRole: string; maxRetries: number; }

export interface DynamicActorConfig { id: string; taskId: string; role: string; systemPrompt: string; tools: ToolConfig[]; context: Record<string, any>; expertise: string[]; constraints: Record<string, any>; metadata: Record<string, any>; }

export interface ReactLoopState { currentStep: 'reasoning'|'action'|'observation'; iteration: number; maxIterations: number; isCompleted: boolean; lastAction: string | null; lastObservation: string | null; context: Record<string, any>; }

export interface AimeAgentConfig { dynamicPlanner: { enabled: boolean; maxSubTasks: number; planningPrompt?: string; }; actorFactory: ActorFactoryConfig; progressManagement: { enabled: boolean; updateInterval: number; maxHistory: number; }; logging: { level: 'debug'|'info'|'warn'|'error'; enableTaskLogging: boolean; enableActorLogging: boolean; enableProgressLogging: boolean; }; }

export interface TaskDecompositionResult { mainTask: MainTask; subTasks: SubTask[]; executionPlan: string[]; }

export interface ActorExecutionResult { taskId: string; actorId: string; status: 'completed'|'failed'|'partial'; result: string; reasoning: string; executionTime: number; iterations: number; logs: any[]; metadata: Record<string, any>; }

export interface AimeResponse { success: boolean; message: string; mainTaskId: string; subTaskResults?: ActorExecutionResult[]; executionTime: number; metadata: Record<string, any>; }

export interface ToolCallResult { toolName: string; success: boolean; result?: any; error?: string; executionTime: number; }

export interface KnowledgeQueryResult { query: string; results: Array<{ content: string; relevance: number; source: string; }>; totalResults: number; }

export interface SystemState { activeTasks: MainTask[]; activeActors: string[]; systemLoad: number; lastUpdate: Date; }


