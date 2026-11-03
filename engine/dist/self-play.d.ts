/**
 * HiveMesh Automated Adversarial Self-Play Engine
 * Executes automated Red-Team vs Blue-Team verification loops:
 * - Runs adversarial attack tests against builder branches
 * - Evaluates exploit success vs defensive robustness
 * - Returns actionable remediation reports for builder agents
 */
export interface SelfPlayRoundResult {
    roundId: string;
    targetRole: string;
    adversaryRole: string;
    status: "DEFENDED" | "VULNERABLE" | "EXECUTION_ERROR";
    testFile: string;
    durationMs: number;
    output: string;
    remediationAdvice?: string;
    timestamp: number;
}
export interface SelfPlayStats {
    totalRounds: number;
    defendedCount: number;
    vulnerableCount: number;
    resistanceRate: string;
}
declare class SelfPlayManager {
    private history;
    private counter;
    /**
     * Executes a red-team test against a builder's worktree.
     */
    runRound(worktreePath: string, targetRole: string, adversaryRole: string, testCommand: string, testFilePath?: string): SelfPlayRoundResult;
    private generateRemediationAdvice;
    getHistory(targetRole?: string): SelfPlayRoundResult[];
    getStats(): SelfPlayStats;
}
export declare const selfPlay: SelfPlayManager;
export {};
//# sourceMappingURL=self-play.d.ts.map