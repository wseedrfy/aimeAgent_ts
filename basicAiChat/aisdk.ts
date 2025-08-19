import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

export type AIProvider = 'openai' | 'anthropic';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIClientOptions {
    provider?: AIProvider; // ؤ openai
    apiKey?: string;
    baseURL?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatOverrideOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
    [key: string]: any; // A� e�v��p
}

// 轻量 AI 客户端：可切换 OpenAI / Anthropic 协议，使用官方 SDK，支持纯 JSON 输出
export class BasicAIClient {
    private provider: AIProvider;
    private model: string;
    private temperature: number;
    private maxTokens: number;
    private openai?: OpenAI;
    private anthropic?: Anthropic;

    constructor(opts: AIClientOptions = {}) {
        this.provider = opts.provider || 'openai';
        this.model =
            opts.model ||
            (this.provider === 'openai'
                ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
                : (process.env.ANTHROPIC_MODEL_ID || 'claude-3-5-sonnet-latest'));
        this.temperature = opts.temperature ?? parseFloat(process.env.TEMPERATURE || '0.7');
        this.maxTokens = opts.maxTokens ?? parseInt(process.env.MAX_TOKENS || '1000');

        if (this.provider === 'openai') {
            this.openai = new OpenAI({
                apiKey: opts.apiKey || process.env.OPENAI_API_KEY || '',
                baseURL: opts.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
            });
        } else {
            this.anthropic = new Anthropic({
                apiKey: opts.apiKey || process.env.ANTHROPIC_API_KEY || '',
                baseURL: opts.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
            });
        }
    }
    async chatJSON(messages: AIMessage[], schema?: Record<string, any>): Promise<any> {
        if (this.provider === 'openai') {
            return this.openaiChatJSON(messages, schema);
        }
        return this.anthropicChatJSON(messages, schema);
    }


    async chatText(messages: AIMessage[]): Promise<string> {
        if (this.provider === 'openai') {
            return this.openaiChatText(messages);
        }
        return this.anthropicChatText(messages);
    }

    async openaiCommonChat(messages: AIMessage[], overrides?: ChatOverrideOptions): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized and no API key provided');
        }

        const client = (overrides?.apiKey || overrides?.baseURL) 
            ? new OpenAI({
                apiKey: overrides.apiKey || process.env.OPENAI_API_KEY || '',
                baseURL: overrides.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
            })
            : this.openai!;

        const openaiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
        const { model, temperature, maxTokens, apiKey, baseURL, ...extraParams } = overrides || {};
        
        const resp = await client.chat.completions.create({
            model: model || this.model,
            temperature: temperature ?? this.temperature,
            max_tokens: maxTokens ?? this.maxTokens,
            messages: openaiMsgs,
            ...extraParams
        });
        return resp.choices?.[0]?.message?.content || '';
    }
 
    async anthropicCommonChat(messages: AIMessage[], overrides?: ChatOverrideOptions): Promise<string> {
        if (!this.anthropic) {
            throw new Error('Anthropic client not initialized and no API key provided');
        }

        const client = (overrides?.apiKey || overrides?.baseURL)
            ? new Anthropic({
                apiKey: overrides.apiKey || process.env.ANTHROPIC_API_KEY || '',
                baseURL: overrides.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
            })
            : this.anthropic!;

        const sysMsg = messages.find(m => m.role === 'system');
        const userAssistantMsgs = messages.filter(m => m.role !== 'system');
        const { model, temperature, maxTokens, apiKey, baseURL, ...extraParams } = overrides || {};
        
        const resp = await client.messages.create({
            model: model || this.model,
            max_tokens: maxTokens ?? this.maxTokens,
            temperature: temperature ?? this.temperature,
            system: sysMsg?.content || '',
            messages: userAssistantMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            ...extraParams
        });
        return (resp as any)?.content?.[0]?.text || '';
    }

    private async openaiChatJSON(messages: AIMessage[], schema?: Record<string, any>): Promise<any> {
        if (!this.openai) throw new Error('OpenAI client not initialized');
        const openaiMsgs = messages.map(m => ({ role: m.role, content: m.content }));

        const request: any = {
            model: this.model,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            messages: openaiMsgs
        };

        request.response_format = schema
            ? { type: 'json_schema', json_schema: { name: 'AIMESchema', schema, strict: true } }
            : { type: 'json_object' };

        const resp = await this.openai.chat.completions.create(request);
        const text: string = resp.choices?.[0]?.message?.content || '';
        return this.safeParseJSON(text);
    }

    private async anthropicChatJSON(messages: AIMessage[], schema?: Record<string, any>): Promise<any> {
        if (!this.anthropic) throw new Error('Anthropic client not initialized');
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

        // 读取 tool_use 块中的 input 作为最终 JSON
        const anyResp = resp as any;
        if (anyResp?.stop_reason === 'tool_use' && Array.isArray(anyResp.content)) {
            const tub = anyResp.content.find((b: any) => b?.type === 'tool_use' && b?.name === toolName);
            if (tub && tub.input) return tub.input;
        }

        const textBlock = (anyResp?.content || []).find((b: any) => b?.type === 'text');
        const text: string = textBlock?.text || '';
        return this.safeParseJSON(text);
    }

    private async openaiChatText(messages: AIMessage[]): Promise<string> {
        if (!this.openai) throw new Error('OpenAI client not initialized');
        const openaiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
        const resp = await this.openai.chat.completions.create({
            model: this.model,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            messages: openaiMsgs
        });
        return resp.choices?.[0]?.message?.content || '';
    }

    private async anthropicChatText(messages: AIMessage[]): Promise<string> {
        if (!this.anthropic) throw new Error('Anthropic client not initialized');
        const sysMsg = messages.find(m => m.role === 'system');
        const userAssistantMsgs = messages.filter(m => m.role !== 'system');
        const resp = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            system: sysMsg?.content || '',
            messages: userAssistantMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        });
        return (resp as any)?.content?.[0]?.text || '';
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
            throw new Error('!�*��� JSON');
        }
    }
}

// anthropic
export function createDefaulAIClient(overrides: AIClientOptions = {}) {
    const apiKey = "sk-7lQUxJymZixxcGYfF64v6jxd0P1RlC4jQ2s1tuj5DjAJfquS";
    const baseURL = "https://api.moonshot.cn/v1";
    const model = "kimi-k2-0711-preview";
    return new BasicAIClient({ apiKey, baseURL, model, provider: overrides.provider || 'anthropic', ...overrides });
}