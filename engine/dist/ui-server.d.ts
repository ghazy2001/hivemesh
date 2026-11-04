/**
 * HiveMesh Companion UI Server
 * Ultra-fast zero-dependency HTTP server with Server-Sent Events (SSE).
 * Serves 100% real data from Git, Worktrees, AST Watcher, and SQLite FTS5 Blackboard.
 * Powers the real-time Orchestrator command deck and human-in-the-loop steering.
 */
import * as http from "http";
export interface BrainConversation {
    id: string;
    mtime: number;
}
export interface BrainOperation {
    tool: string;
    summary: string;
    label: string;
    stepIndex: number;
}
export interface SubagentExecutionStep {
    tool: string;
    summary: string;
    label: string;
    time?: string;
}
export interface BrainSubagent {
    id?: string;
    role: string;
    type: string;
    prompt: string;
    mission: string;
    action: string;
    status: string;
    files: string[];
    steps: SubagentExecutionStep[];
}
export interface BrainState {
    activeId: string;
    allConvs: BrainConversation[];
    prompt: string;
    recentOps: BrainOperation[];
    subagents: BrainSubagent[];
    activeTasks: Array<{
        taskId: string;
        updatedAt: number;
        status: string;
    }>;
}
export declare function getAntigravityBrainState(selectedId?: string): BrainState | null;
export declare function broadcastEvent(event: string, data: any): void;
export declare function inferDynamicRoles(prompt: string): {
    roles: string[];
    plan: Record<string, string>;
};
export declare function startUiServer(requestedPort?: number, autoOpen?: boolean): Promise<{
    port: number;
    server: http.Server;
}>;
//# sourceMappingURL=ui-server.d.ts.map