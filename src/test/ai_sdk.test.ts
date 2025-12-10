import { createDefaulAIClient, AIMessage } from '../core/ai_sdk';

async function testAISDK() {
    console.log('🚀 开始测试 AI SDK...\n');

    // 测试 1: 使用默认客户端发送简单文本请求
    console.log('📝 测试 1: chatText - 简单对话');
    try {
        const client = createDefaulAIClient();
        const messages: AIMessage[] = [
            { role: 'user', content: '你好，我叫李雷，1+1等于多少？' }
        ];
        
        const response = await client.chatText(messages);
        console.log('✅ 响应:', response);
        console.log('');
    } catch (error) {
        console.error('❌ 测试 1 失败:', error);
        console.log('');
    }

    // 测试 2: 使用 chatJSON 返回结构化数据
    console.log('📝 测试 2: chatJSON - 结构化输出');
    try {
        const client = createDefaulAIClient();
        const messages: AIMessage[] = [
            { role: 'user', content: '请给我返回一个包含name和age字段的JSON，name是"张三"，age是25' }
        ];
        
        const jsonResponse = await client.chatJSON(messages);
        console.log('✅ JSON 响应:', JSON.stringify(jsonResponse, null, 2));
        console.log('');
    } catch (error) {
        console.error('❌ 测试 2 失败:', error);
        console.log('');
    }

    // 测试 3: 使用 schema 约束的 JSON 输出
    console.log('📝 测试 3: chatJSON with Schema - 带 schema 的结构化输出');
    try {
        const client = createDefaulAIClient();
        const messages: AIMessage[] = [
            { role: 'user', content: '请生成一个人的基本信息' }
        ];
        
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string', description: '姓名' },
                age: { type: 'number', description: '年龄' },
                city: { type: 'string', description: '城市' }
            },
            required: ['name', 'age', 'city']
        };
        
        const jsonResponse = await client.chatJSON(messages, schema);
        console.log('✅ Schema JSON 响应:', JSON.stringify(jsonResponse, null, 2));
        console.log('');
    } catch (error) {
        console.error('❌ 测试 3 失败:', error);
        console.log('');
    }

    // 测试 4: 多轮对话
    console.log('📝 测试 4: 多轮对话');
    try {
        const client = createDefaulAIClient();
        const messages: AIMessage[] = [
            { role: 'system', content: '你是 Kimi，由 Moonshot AI 提供的人工智能助手' },
            { role: 'user', content: '我想去杭州旅游' },
            { role: 'assistant', content: '杭州是个美丽的城市，有西湖等著名景点。' },
            { role: 'user', content: '那推荐几个具体的景点给我' }
        ];
        
        const response = await client.chatText(messages);
        console.log('✅ 多轮对话响应:', response);
        console.log('');
    } catch (error) {
        console.error('❌ 测试 4 失败:', error);
        console.log('');
    }

    console.log('🎉 AI SDK 测试完成！');
}

// 运行测试
testAISDK().catch(console.error);
