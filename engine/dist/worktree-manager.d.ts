/**
 * HiveMesh Worktree Manager — Creates and manages isolated Git worktrees
 * for each agent in a swarm, ensuring zero file-level conflicts.
 * Supports cross-process persistence via .hivemesh/swarms.json.
 */
export interface WorktreeInfo {
    path: string;
    branch: string;
    role: string;
    status: "active" | "completed" | "error";
}
export interface SwarmInfo {
    id: string;
    projectPath: string;
    worktrees: WorktreeInfo[];
    createdAt: number;
}
export declare function createSwarm(projectPath: string, roles: string[], baseBranch?: string): SwarmInfo;
export declare function getSwarmStatus(swarmId?: string, projectPath?: string): SwarmInfo[];
export declare function updateWorktreeStatus(swarmId: string, role: string, status: WorktreeInfo["status"]): boolean;
export declare function destroySwarm(swarmId: string, projectPath?: string): {
    success: boolean;
    message: string;
};
//# sourceMappingURL=worktree-manager.d.ts.map