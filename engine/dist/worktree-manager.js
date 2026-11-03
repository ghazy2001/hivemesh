/**
 * HiveMesh Worktree Manager — Creates and manages isolated Git worktrees
 * for each agent in a swarm, ensuring zero file-level conflicts.
 */
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
const swarms = new Map();
export function createSwarm(projectPath, roles, baseBranch = "main") {
    const id = `swarm_${Date.now().toString(36)}`;
    const worktrees = [];
    // Ensure we're in a git repo
    try {
        execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "pipe" });
    }
    catch {
        throw new Error(`Not a git repository: ${projectPath}`);
    }
    // Resolve the base reference
    let baseRef;
    try {
        baseRef = execSync(`git rev-parse --verify ${baseBranch}`, {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: "pipe",
        }).trim();
    }
    catch {
        // Fallback to HEAD if the specified branch doesn't exist
        baseRef = execSync("git rev-parse HEAD", {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: "pipe",
        }).trim();
    }
    for (const role of roles) {
        const branchName = `hivemesh/${id}/${role}`;
        const worktreePath = path.resolve(projectPath, "..", `${path.basename(projectPath)}-hivemesh-${id}-${role}`);
        try {
            execSync(`git worktree add -b "${branchName}" "${worktreePath}" ${baseRef}`, { cwd: projectPath, stdio: "pipe" });
            worktrees.push({
                path: worktreePath,
                branch: branchName,
                role,
                status: "active",
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            worktrees.push({
                path: worktreePath,
                branch: branchName,
                role,
                status: "error",
            });
        }
    }
    const swarm = { id, projectPath, worktrees, createdAt: Date.now() };
    swarms.set(id, swarm);
    return swarm;
}
export function getSwarmStatus(swarmId) {
    if (swarmId) {
        const swarm = swarms.get(swarmId);
        return swarm ? [swarm] : [];
    }
    return Array.from(swarms.values());
}
export function updateWorktreeStatus(swarmId, role, status) {
    const swarm = swarms.get(swarmId);
    if (!swarm)
        return false;
    const wt = swarm.worktrees.find((w) => w.role === role);
    if (!wt)
        return false;
    wt.status = status;
    return true;
}
export function destroySwarm(swarmId) {
    const swarm = swarms.get(swarmId);
    if (!swarm) {
        return { success: false, message: `Swarm ${swarmId} not found` };
    }
    const errors = [];
    for (const wt of swarm.worktrees) {
        try {
            execSync(`git worktree remove "${wt.path}" --force`, {
                cwd: swarm.projectPath,
                stdio: "pipe",
            });
        }
        catch {
            try {
                if (fs.existsSync(wt.path)) {
                    fs.rmSync(wt.path, { recursive: true, force: true });
                }
                execSync("git worktree prune", {
                    cwd: swarm.projectPath,
                    stdio: "pipe",
                });
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                errors.push(`Failed to remove worktree ${wt.role}: ${msg}`);
            }
        }
        try {
            execSync(`git branch -D "${wt.branch}"`, {
                cwd: swarm.projectPath,
                stdio: "pipe",
            });
        }
        catch {
            // Branch might not exist
        }
    }
    swarms.delete(swarmId);
    if (errors.length > 0) {
        return {
            success: false,
            message: `Swarm destroyed with errors: ${errors.join("; ")}`,
        };
    }
    return { success: true, message: `Swarm ${swarmId} destroyed successfully` };
}
//# sourceMappingURL=worktree-manager.js.map