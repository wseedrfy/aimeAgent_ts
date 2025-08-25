import 'dotenv/config';
import { AnthropicChatBuilder, createAnthropicMCPClient } from './mcp_sdk';

async function main() {
    const client = createAnthropicMCPClient({
        apiKey: process.env.API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL
    });

    const builder = new AnthropicChatBuilder()
        .system('你是一个有帮助的中文助手。')
        .user('用一句话介绍上海。');

    try {
        const reply = await builder.send(client, {
            model: process.env.MODEL_ID,
            maxTokens: 200
        });
        console.log('\n=== Anthropic Chat Reply ===\n');
        console.log(reply);
    } catch (err: any) {
        console.error('调用 Anthropic 失败:', err?.message || err);
        process.exitCode = 1;
    }
}

main();


