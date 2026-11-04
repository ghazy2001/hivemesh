/**
 * HiveMesh Live UI Server
 * Lightweight zero-dependency HTTP server with Server-Sent Events (SSE)
 * for real-time mission control, swarm monitoring, and visual topology.
 */
import * as http from "http";
export declare function broadcastEvent(event: string, data: any): void;
export declare function startUiServer(requestedPort?: number, autoOpen?: boolean): Promise<{
    port: number;
    server: http.Server;
}>;
//# sourceMappingURL=ui-server.d.ts.map