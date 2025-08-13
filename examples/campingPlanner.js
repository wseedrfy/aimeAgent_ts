import { AimeAgent } from '../src/aimeAgent';
async function main() {
    const config = {
        dynamicPlanner: { enabled: true, maxSubTasks: 10 },
        actorFactory: { availableTools: [], knowledgeBases: ['camp_sites_shanghai.json'], defaultRole: 'general', maxRetries: 3 },
        progressManagement: { enabled: true, updateInterval: 1000, maxHistory: 1000 },
        logging: { level: 'info', enableTaskLogging: true, enableActorLogging: true, enableProgressLogging: true }
    };
    const agent = new AimeAgent(config);
    const userInput = '本周末（周六-周日）带家人（2大1小，孩子5岁）去上海周边露营，需要安全、有趣且预算控制在2000元内，帮我规划全程方案';
    const res = await agent.processRequest(userInput, 'user123', 'session456');
    console.log(JSON.stringify(res, null, 2));
}
main();
