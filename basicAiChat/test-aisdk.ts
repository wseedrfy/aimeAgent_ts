import { BasicAIClient, createDefaulAIClient } from './aisdk';

// 添加重试逻辑的包装函数
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            if (error.status === 429 && i < maxRetries - 1) {
                console.log(`⚠️ 遇到速率限制，等待 ${delay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error('达到最大重试次数');
}

async function testBasicAIClient() {
    console.log('🧪 开始测试 BasicAIClient...\n');

    try {
        // 测试默认客户端
        const defaultClient = createDefaulAIClient({ provider: 'openai' });

        // 测试文本生成
        console.log('\n1️⃣ 测试文本生成...');
        try {
            const textResponse = await defaultClient.chatText([
                { role: 'user', content: '请用一句话描述什么是人工智能' }
            ])

            console.log('✅ 文本生成成功:');
            console.log(textResponse);
        } catch (error: any) {
            console.log('❌ 文本生成失败:', error.message);
        }

        // 测试JSON生成
        console.log('\n2️⃣ 测试JSON生成...');
        try {
            const jsonResponse = await defaultClient.chatJSON([
                { role: 'system', content: '你是一个AI助手，请只输出JSON格式的回答' },
                { role: 'user', content: '请给我一个包含姓名、年龄、职业的对象' }
            ], {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                    profession: { type: 'string' }
                },
                required: ['name', 'age', 'profession']
            })
            console.log('✅ JSON生成成功:');
            console.log(JSON.stringify(jsonResponse, null, 2));
        } catch (error: any) {
            console.log('❌ JSON生成失败:', error.message);
        }

        console.log('\n🎉 BasicAIClient 测试完成!\n');

    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

async function testWithCustomOverrides() {
    console.log('⚙️ 开始测试自定义配置覆盖...\n');

    try {
        const client = createDefaulAIClient({ provider: 'openai' });

        // 测试自定义模型和参数
        console.log('1️⃣ 测试自定义配置...');
        try {
            const customResponse = await client.openaiCommonChat([
                { role: 'user', content: '请用一句话总结今天的天气' }
            ], {
                model: 'kimi-k2-0711-preview',
                temperature: 0.1,
                maxTokens: 100
            })
            console.log('✅ 自定义配置测试成功:');
            console.log(customResponse);
        } catch (error: any) {
            console.log('❌ 自定义配置测试失败:', error.message);
        }

        console.log('\n🎉 自定义配置测试完成!\n');

    } catch (error) {
        console.error('❌ 自定义配置测试过程中发生错误:', error);
    }
}

async function main() {
    console.log('🚀 AI SDK 综合测试开始\n');
    console.log('='.repeat(50));

    await testBasicAIClient();
    await testWithCustomOverrides();

    console.log('='.repeat(50));
    console.log('🎊 所有测试完成!');
}

// 运行测试
main().catch(console.error);
