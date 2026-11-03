/**
 * HiveMesh Dashboard — Generates a live Markdown mission control dashboard
 * showing swarm status, AST changes, contracts, and shared knowledge.
 */
import type { SwarmInfo } from "./worktree-manager.js";
import type { Insight } from "./blackboard.js";
import type { Contract } from "./p2p-mesh.js";
import type { ASTReport } from "./ast-watcher.js";
export interface DashboardData {
    swarms: SwarmInfo[];
    insights: Insight[];
    contracts: Contract[];
    astReports: ASTReport[];
}
export declare function generateDashboard(data: DashboardData): string;
//# sourceMappingURL=dashboard.d.ts.map