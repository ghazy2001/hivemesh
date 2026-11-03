/**
 * HiveMesh Blackboard — In-memory shared knowledge store for swarm agents.
 * Agents post insights (discoveries about the codebase) here so other agents
 * can query them instead of re-reading the same files.
 */
export interface Insight {
    id: string;
    topic: string;
    key: string;
    value: string;
    agentId: string;
    createdAt: number;
    ttl: number;
}
export declare class Blackboard {
    private store;
    private counter;
    post(topic: string, key: string, value: string, agentId: string, ttl?: number): Insight;
    query(topic?: string, key?: string): Insight[];
    listTopics(): string[];
    clear(topic?: string): number;
    private cleanup;
}
//# sourceMappingURL=blackboard.d.ts.map