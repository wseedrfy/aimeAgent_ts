import { AimeAgent } from '../src/aimeAgent';
async function main() {
    const config = {
        dynamicPlanner: { enabled: true, maxSubTasks: 10 },
        actorFactory: { availableTools: [], knowledgeBases: [], defaultRole: 'general', maxRetries: 3 },
        progressManagement: { enabled: true, updateInterval: 1000, maxHistory: 1000 },
        logging: { level: 'info', enableTaskLogging: true, enableActorLogging: true, enableProgressLogging: true }
    };
    const agent = new AimeAgent(config);
    const res = await agent.processRequest('帮我策划一个简单出游方案', 'u1', 's1');
    console.log(res);
}
main();
