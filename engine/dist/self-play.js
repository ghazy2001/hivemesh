/**
 * HiveMesh Automated Adversarial Self-Play Engine
 * Executes automated Red-Team vs Blue-Team verification loops:
 * - Runs adversarial attack tests against builder branches
 * - Evaluates exploit success vs defensive robustness
 * - Returns actionable remediation reports for builder agents
 */
import { execSync } from "child_process";
import * as fs from "fs";
class SelfPlayManager {
    history = [];
    counter = 0;
    /**
     * Executes a red-team test against a builder's worktree.
     */
    runRound(worktreePath, targetRole, adversaryRole, testCommand, testFilePath) {
        const roundId = `sp_${++this.counter}_${Date.now().toString(36)}`;
        const startTime = Date.now();
        if (!fs.existsSync(worktreePath)) {
            return {
                roundId,
                targetRole,
                adversaryRole,
                status: "EXECUTION_ERROR",
                testFile: testFilePath || "unknown",
                durationMs: 0,
                output: `Worktree path not found: ${worktreePath}`,
                timestamp: Date.now(),
            };
        }
        try {
            // Execute the test command in the target worktree
            const output = execSync(testCommand, {
                cwd: worktreePath,
                encoding: "utf-8",
                stdio: "pipe",
                timeout: 60000, // 60s max
            });
            // If test exits with 0, code withstood the adversarial test!
            const result = {
                roundId,
                targetRole,
                adversaryRole,
                status: "DEFENDED",
                testFile: testFilePath || "adversarial-suite",
                durationMs: Date.now() - startTime,
                output: output.slice(-2000), // Keep last 2k chars
                timestamp: Date.now(),
            };
            this.history.push(result);
            return result;
        }
        catch (err) {
            const execErr = err;
            const combinedOutput = `${execErr.stdout || ""}\n${execErr.stderr || ""}\n${execErr.message || ""}`.trim();
            // Test failed -> Adversary found a vulnerability / edge-case failure!
            const remediation = this.generateRemediationAdvice(combinedOutput);
            const result = {
                roundId,
                targetRole,
                adversaryRole,
                status: "VULNERABLE",
                testFile: testFilePath || "adversarial-suite",
                durationMs: Date.now() - startTime,
                output: combinedOutput.slice(-2500),
                remediationAdvice: remediation,
                timestamp: Date.now(),
            };
            this.history.push(result);
            return result;
        }
    }
    generateRemediationAdvice(errorOutput) {
        const advice = [];
        if (/TypeError|Cannot read propert|is undefined|is null/i.test(errorOutput)) {
            advice.push("Null-pointer or undefined access detected: add defensive optional chaining (?.) and null checks.");
        }
        if (/Timeout|timed out|did not resolve/i.test(errorOutput)) {
            advice.push("Potential race condition or unhandled async promise deadlock detected.");
        }
        if (/401|403|Unauthorized|Forbidden/i.test(errorOutput)) {
            advice.push("Authorization boundary issue: check token validation, role guards, or workspace tenancy.");
        }
        if (/Expected.*to.*equal|AssertionError/i.test(errorOutput)) {
            advice.push("Contract / logic mismatch: assertion failed on expected edge-case inputs.");
        }
        if (advice.length === 0) {
            advice.push("Review test stack trace and ensure all input boundary cases (empty, extreme lengths, malformed payloads) are handled.");
        }
        return advice.join(" ");
    }
    getHistory(targetRole) {
        if (targetRole) {
            return this.history.filter((r) => r.targetRole === targetRole);
        }
        return this.history;
    }
    getStats() {
        const total = this.history.length;
        const defended = this.history.filter((r) => r.status === "DEFENDED").length;
        const vulnerable = this.history.filter((r) => r.status === "VULNERABLE").length;
        const rate = total > 0 ? `${((defended / total) * 100).toFixed(1)}%` : "0.0%";
        return {
            totalRounds: total,
            defendedCount: defended,
            vulnerableCount: vulnerable,
            resistanceRate: rate,
        };
    }
}
export const selfPlay = new SelfPlayManager();
//# sourceMappingURL=self-play.js.map