/**
 * HiveMesh Blackboard — High-Performance Shared Knowledge Store
 * Powered by Node.js native SQLite with FTS5 (Full-Text Search) and BM25 ranking.
 * Enables zero-token discovery reuse across swarm agents.
 */
export interface Insight {
    id: string;
    topic: string;
    key: string;
    value: string;
    agentId: string;
    createdAt: number;
    ttl: number;
    relevanceScore?: number;
}
export interface BlackboardStats {
    totalInsights: number;
    totalTopics: number;
    activeAgents: string[];
    topicsBreakdown: Record<string, number>;
}
export declare class Blackboard {
    private db;
    private counter;
    constructor();
    private initSchema;
    post(topic: string, key: string, value: string, agentId: string, ttl?: number): Insight;
    query(topic?: string, key?: string, search?: string): Insight[];
    search(naturalQuery: string, topicFilter?: string): Insight[];
    private fallbackLikeSearch;
    listTopics(): Array<{
        topic: string;
        count: number;
    }>;
    getStats(): BlackboardStats;
    clear(topic?: string): number;
    private cleanup;
}
//# sourceMappingURL=blackboard.d.ts.map