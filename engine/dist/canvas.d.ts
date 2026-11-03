/**
 * HiveMesh Generative UI Canvas Generator
 * Produces interactive HTML/SVG visualizations of the agent swarm topology,
 * real-time semantic conflicts, contracts, and self-play security radar.
 */
import type { SwarmInfo } from "./worktree-manager.js";
import type { SemanticConflict } from "./ast-watcher.js";
import type { Contract } from "./p2p-mesh.js";
import type { SelfPlayStats } from "./self-play.js";
import type { BlackboardStats } from "./blackboard.js";
export interface CanvasData {
    swarms: SwarmInfo[];
    semanticConflicts: SemanticConflict[];
    contracts: Contract[];
    selfPlayStats?: SelfPlayStats;
    blackboardStats?: BlackboardStats;
}
export declare function generateCanvasHtml(data: CanvasData): string;
//# sourceMappingURL=canvas.d.ts.map