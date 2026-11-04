/**
 * HiveMesh Live UI Server
 * Lightweight zero-dependency HTTP server with Server-Sent Events (SSE)
 * providing real-time 3D Neural Swarm orchestration, human-in-the-loop steering,
 * and live worktree lifecycle management.
 */
import * as http from "http";
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