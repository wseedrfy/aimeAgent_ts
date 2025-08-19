// 以下导出若干"Agent"封装，统一返回 JSON。后续可替换为更细的 schema。

import { AIMessage, createDefaulAIClient } from './aisdk';

export async function decomposeTaskAgent(input: string, context?: Record<string, any>, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是任务分解专家。请仅输出 JSON。' },
        { role: 'user', content: `请将任务分解为子任务，包含title、description、priority、dependencies（数组）。\n上下文:${JSON.stringify(context || {})}\n任务:${input}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            subtasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'number' },
                        dependencies: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['title', 'description', 'priority', 'dependencies']
                }
            }
        },
        required: ['subtasks']
    });
}

export async function taskTypeAnalyzerAgent(input: string, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是任务类型分析器，只输出 JSON。' },
        { role: 'user', content: `识别任务类型（如 location_search / equipment_planning / itinerary_planning / budget_management / information_gathering）。输入:${input}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            type: { type: 'string' },
            confidence: { type: 'number' }
        },
        required: ['type']
    });
}

export async function roleTemplateAgent(subTaskTitle: string, taskType: string, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是角色模板生成器，只输出 JSON。' },
        { role: 'user', content: `根据任务类型为子任务「${subTaskTitle}」选择合适角色并列出需用工具。taskType=${taskType}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            roleName: { type: 'string' },
            tools: { type: 'array', items: { type: 'string' } }
        },
        required: ['roleName', 'tools']
    });
}

export async function reasoningAgent(context: Record<string, any>, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是 ReAct 推理模块。只输出 JSON。' },
        { role: 'user', content: `请基于上下文决定下一步行动：{ type: 'tool_call'|'analysis', toolName?, parameters?, analysisType? }。上下文:${JSON.stringify(context || {})}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            type: { type: 'string' },
            toolName: { type: 'string' },
            parameters: { type: 'object' },
            analysisType: { type: 'string' },
            rationale: { type: 'string' }
        },
        required: ['type']
    });
}

export async function toolParamPlannerAgent(toolset: string[], goal: string, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是工具参数规划器。只输出 JSON。' },
        { role: 'user', content: `目标:${goal}\n可用工具:${toolset.join(', ')}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            plan: { type: 'array', items: { type: 'object', properties: { tool: { type: 'string' }, parameters: { type: 'object' } }, required: ['tool', 'parameters'] } }
        },
        required: ['plan']
    });
}

export async function observationSummarizerAgent(lastResult: any, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是观察摘要器，只输出 JSON。' },
        { role: 'user', content: `请对以下结果生成简短观察：${JSON.stringify(lastResult || {})}` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            observation: { type: 'string' },
            signals: { type: 'array', items: { type: 'string' } }
        },
        required: ['observation']
    });
}

export async function completionJudgeAgent(goal: string, observation: string, client = createDefaulAIClient()) {
    const messages: AIMessage[] = [
        { role: 'system', content: '你是完成判定器，只输出 JSON。' },
        { role: 'user', content: `目标:${goal}\n观察:${observation}\n请判断是否可判定完成。` }
    ];
    return client.chatJSON(messages, {
        type: 'object',
        properties: {
            shouldComplete: { type: 'boolean' },
            reasons: { type: 'array', items: { type: 'string' } }
        },
        required: ['shouldComplete']
    });
}

// 拆解任务agent

// 分析任务类型agent

// 角色模版agent

// 推理agent 想下一步怎么做、用什么工具、理由是什么

// 调用工具agent 调用工具返回结果 function call或者mcp

// 观察agent 观察结果

// 是否完成任务