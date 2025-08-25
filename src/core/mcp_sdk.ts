import { Anthropic } from '@anthropic-ai/sdk';

export type MCPChatRole = 'system' | 'user' | 'assistant';

export interface MCPChatMessage {
    role: MCPChatRole;
    content: string;
}

export interface MCPClientOptions {
    apiKey?: string;
    baseURL?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface MCPChatOverrides {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
    [key: string]: any;
}

export class AnthropicMCPClient {
    private anthropic: Anthropic;
    private model: string;
    private temperature: number;
    private maxTokens: number;

    constructor(options: MCPClientOptions = {}) {
        const apiKey = options.apiKey || process.env.API_KEY || '';
        const baseURL = options.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
        this.model = options.model || process.env.ANTHROPIC_MODEL_ID || 'claude-3-5-sonnet-latest';
        this.temperature = options.temperature ?? 0.7;
        this.maxTokens = options.maxTokens ?? 1000;

        this.anthropic = new Anthropic({ apiKey, baseURL });
    }

    async chat(messages: MCPChatMessage[], overrides?: MCPChatOverrides): Promise<string> {
        return this.anthropicCommonChat(messages, overrides);
    }

    async anthropicCommonChat(messages: MCPChatMessage[], overrides?: MCPChatOverrides): Promise<string> {
        const client = overrides?.apiKey || overrides?.baseURL
            ? new Anthropic({
                apiKey: overrides.apiKey || process.env.API_KEY || '',
                baseURL: overrides.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
            })
            : this.anthropic;

        const sysMsg = messages.find(m => m.role === 'system');
        const userAssistantMsgs = messages.filter(m => m.role !== 'system');

        const { model, temperature, maxTokens, apiKey, baseURL, ...extra } = overrides || {};

        const resp = await client.messages.create({
            model: model || this.model,
            max_tokens: maxTokens ?? this.maxTokens,
            temperature: temperature ?? this.temperature,
            system: sysMsg?.content || '',
            messages: userAssistantMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            ...extra
        });

        const anyResp = resp as any;
        if (Array.isArray(anyResp?.content)) {
            const textBlock = anyResp.content.find((b: any) => b?.type === 'text');
            if (textBlock?.text) return textBlock.text as string;
        }
        return '';
    }

    async chatText(messages: MCPChatMessage[]): Promise<string> {
        return this.anthropicCommonChat(messages);
    }

    async chatJSON(messages: MCPChatMessage[], schema?: Record<string, any>): Promise<any> {
        const sysMsg = messages.find(m => m.role === 'system');
        const userAssistantMsgs = messages.filter(m => m.role !== 'system');

        const toolName = 'aime_json_output';
        const inputSchema = schema || {
            type: 'object',
            properties: {},
            additionalProperties: true
        };

        const resp = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            system: sysMsg?.content || '',
            tools: [
                {
                    name: toolName,
                    description: '输出严格的 JSON 结果（由 input_schema 定义）',
                    input_schema: inputSchema as any
                }
            ],
            tool_choice: { type: 'tool', name: toolName } as any,
            messages: userAssistantMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        });

        const anyResp = resp as any;
        if (anyResp?.stop_reason === 'tool_use' && Array.isArray(anyResp.content)) {
            const tub = anyResp.content.find((b: any) => b?.type === 'tool_use' && b?.name === toolName);
            if (tub && tub.input) return tub.input;
        }

        const textBlock = (anyResp?.content || []).find((b: any) => b?.type === 'text');
        const text: string = textBlock?.text || '';
        return this.safeParseJSON(text);
    }

    private safeParseJSON(text: string): any {
        try {
            return JSON.parse(text);
        } catch {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                const candidate = text.slice(start, end + 1);
                return JSON.parse(candidate);
            }
            throw new Error('Invalid JSON from model response');
        }
    }
}

export class AnthropicChatBuilder {
    private messages: MCPChatMessage[] = [];

    system(content: string): this {
        this.messages.push({ role: 'system', content });
        return this;
    }

    user(content: string): this {
        this.messages.push({ role: 'user', content });
        return this;
    }

    assistant(content: string): this {
        this.messages.push({ role: 'assistant', content });
        return this;
    }

    getMessages(): MCPChatMessage[] {
        return [...this.messages];
    }

    async send(client?: AnthropicMCPClient, overrides?: MCPChatOverrides): Promise<string> {
        const finalClient = client || createAnthropicMCPClient();
        return finalClient.chat(this.messages, overrides);
    }
}

export function createAnthropicMCPClient(overrides: MCPClientOptions = {}): AnthropicMCPClient {
    return new AnthropicMCPClient(overrides);
}

// 与 ai_sdk 保持一致的默认工厂
export function createDefaulMCPClient(overrides: MCPClientOptions = {}) {
    const apiKey = process.env.API_KEY || '';
    let baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    let model = process.env.MODEL_ID || process.env.ANTHROPIC_MODEL_ID || 'claude-3-5-sonnet-latest';
    return new AnthropicMCPClient({ apiKey, baseURL, model, ...overrides });
}


