import 'dotenv/config';
import OpenAI from 'openai';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIClientOptions {
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
    [key: string]: any;
}

// 轻量 AI 客户端：使用 OpenAI SDK，支持纯 JSON 输出
export class BasicAIClient {
    private model: string;
    private temperature: number;
    private maxTokens: number;
    private openai: OpenAI;

    constructor(opts: AIClientOptions = {}) {
        this.model = opts.model || process.env.MODEL_ID || 'kimi-k2-turbo-preview';
        this.temperature = opts.temperature ?? parseFloat(process.env.TEMPERATURE || '0.6');
        this.maxTokens = opts.maxTokens ?? parseInt(process.env.MAX_TOKENS || '4000');

        this.openai = new OpenAI({
            apiKey: opts.apiKey || process.env.API_KEY || '',
            baseURL: opts.baseURL || process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1'
        });
    }

    async chatJSON(messages: AIMessage[], schema?: Record<string, any>): Promise<any> {
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

    async chatText(messages: AIMessage[]): Promise<string> {
        const openaiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
        const resp = await this.openai.chat.completions.create({
            model: this.model,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            messages: openaiMsgs
        });
        return resp.choices?.[0]?.message?.content || '';
    }

    async openaiCommonChat(messages: AIMessage[], overrides?: ChatOverrideOptions): Promise<string> {
        const client = (overrides?.apiKey || overrides?.baseURL) 
            ? new OpenAI({
                apiKey: overrides.apiKey || process.env.API_KEY || '',
                baseURL: overrides.baseURL || process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1'
            })
            : this.openai;

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
            throw new Error('无法解析 JSON');
        }
    }
}

// 默认导出创建client的函数
export function createDefaulAIClient(overrides: AIClientOptions = {}): BasicAIClient {
    const apiKey = overrides.apiKey || process.env.API_KEY;
    const baseURL = overrides.baseURL || process.env.OPENAI_BASE_URL || "https://api.moonshot.cn/v1";
    const model = overrides.model || process.env.MODEL_ID || "kimi-k2-turbo-preview";
    
    return new BasicAIClient({ apiKey, baseURL, model, ...overrides });
}
