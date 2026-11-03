/**
 * HiveMesh Worktree Manager — Creates and manages isolated Git worktrees
 * for each agent in a swarm, ensuring zero file-level conflicts.
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

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

const swarms = new Map<string, SwarmInfo>();

export function createSwarm(
  projectPath: string,
  roles: string[],
  baseBranch = "main"
): SwarmInfo {
  const id = `swarm_${Date.now().toString(36)}`;
  const worktrees: WorktreeInfo[] = [];

  // Ensure we're in a git repo
  try {
    execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "pipe" });
  } catch {
    throw new Error(`Not a git repository: ${projectPath}`);
  }

  // Resolve the base reference
  let baseRef: string;
  try {
    baseRef = execSync(`git rev-parse --verify ${baseBranch}`, {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch {
    // Fallback to HEAD if the specified branch doesn't exist
    baseRef = execSync("git rev-parse HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  }

  for (const role of roles) {
    const branchName = `hivemesh/${id}/${role}`;
    const worktreePath = path.resolve(
      projectPath,
      "..",
      `${path.basename(projectPath)}-hivemesh-${id}-${role}`
    );

    try {
      execSync(
        `git worktree add -b "${branchName}" "${worktreePath}" ${baseRef}`,
        { cwd: projectPath, stdio: "pipe" }
      );

      worktrees.push({
        path: worktreePath,
        branch: branchName,
        role,
        status: "active",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      worktrees.push({
        path: worktreePath,
        branch: branchName,
        role,
        status: "error",
      });
    }
  }

  const swarm: SwarmInfo = { id, projectPath, worktrees, createdAt: Date.now() };
  swarms.set(id, swarm);
  return swarm;
}

export function getSwarmStatus(swarmId?: string): SwarmInfo[] {
  if (swarmId) {
    const swarm = swarms.get(swarmId);
    return swarm ? [swarm] : [];
  }
  return Array.from(swarms.values());
}

export function updateWorktreeStatus(
  swarmId: string,
  role: string,
  status: WorktreeInfo["status"]
): boolean {
  const swarm = swarms.get(swarmId);
  if (!swarm) return false;
  const wt = swarm.worktrees.find((w) => w.role === role);
  if (!wt) return false;
  wt.status = status;
  return true;
}

export function destroySwarm(swarmId: string): { success: boolean; message: string } {
  const swarm = swarms.get(swarmId);
  if (!swarm) {
    return { success: false, message: `Swarm ${swarmId} not found` };
  }

  const errors: string[] = [];

  for (const wt of swarm.worktrees) {
    try {
      execSync(`git worktree remove "${wt.path}" --force`, {
        cwd: swarm.projectPath,
        stdio: "pipe",
      });
    } catch {
      try {
        if (fs.existsSync(wt.path)) {
          fs.rmSync(wt.path, { recursive: true, force: true });
        }
        execSync("git worktree prune", {
          cwd: swarm.projectPath,
          stdio: "pipe",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to remove worktree ${wt.role}: ${msg}`);
      }
    }

    try {
      execSync(`git branch -D "${wt.branch}"`, {
        cwd: swarm.projectPath,
        stdio: "pipe",
      });
    } catch {
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
