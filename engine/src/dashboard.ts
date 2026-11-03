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

export function generateDashboard(data: DashboardData): string {
  const lines: string[] = [];

  lines.push("# 🐝 HiveMesh Mission Control");
  lines.push("");
  lines.push(`> Last updated: ${new Date().toISOString()}`);
  lines.push("");

  // Swarm Status
  if (data.swarms.length === 0) {
    lines.push("## 📡 No Active Swarms");
    lines.push("");
    lines.push("Use `hivemesh_create_swarm` to create a new swarm.");
    return lines.join("\n");
  }

  for (const swarm of data.swarms) {
    lines.push(`## 🔷 Swarm: \`${swarm.id}\``);
    lines.push(`- **Project:** \`${swarm.projectPath}\``);
    lines.push(
      `- **Created:** ${new Date(swarm.createdAt).toLocaleString()}`
    );
    lines.push(`- **Workers:** ${swarm.worktrees.length}`);
    lines.push("");

    // Worker table
    lines.push("| Status | Role | Branch | Path |");
    lines.push("|:-------|:-----|:-------|:-----|");

    for (const wt of swarm.worktrees) {
      const statusIcon =
        wt.status === "active"
          ? "🟢"
          : wt.status === "completed"
            ? "✅"
            : "🔴";
      lines.push(
        `| ${statusIcon} ${wt.status} | **${wt.role}** | \`${wt.branch}\` | \`${wt.path}\` |`
      );
    }
    lines.push("");
  }

  // AST Changes
  const allChanges = data.astReports.flatMap((r) =>
    r.changes.map((c) => ({ ...c, role: r.role }))
  );
  if (allChanges.length > 0) {
    lines.push("## 🔬 AST Changes Detected");
    lines.push("");
    lines.push("| ⚠️ Type | Name | Change | File | By |");
    lines.push("|:--------|:-----|:-------|:-----|:---|");
    for (const c of allChanges.slice(0, 20)) {
      const icon =
        c.changeType === "added"
          ? "🟩"
          : c.changeType === "modified"
            ? "🟨"
            : "🟥";
      lines.push(
        `| ${icon} ${c.type} | \`${c.name}\` | ${c.changeType} | \`${c.file}\` | ${c.role} |`
      );
    }
    if (allChanges.length > 20) {
      lines.push(`| ... | ... | ... | ... | ... |`);
      lines.push("");
      lines.push(`> Showing 20 of ${allChanges.length} changes.`);
    }
    lines.push("");
  }

  // Contracts
  if (data.contracts.length > 0) {
    lines.push("## 🤝 P2P Contracts");
    lines.push("");
    lines.push("| Status | Type | From → To | Spec |");
    lines.push("|:-------|:-----|:----------|:-----|");
    for (const c of data.contracts) {
      const statusIcon =
        c.status === "proposed"
          ? "🟡"
          : c.status === "accepted"
            ? "🟢"
            : "🔴";
      const specPreview =
        c.spec.length > 60 ? c.spec.slice(0, 57) + "..." : c.spec;
      lines.push(
        `| ${statusIcon} ${c.status} | ${c.type} | **${c.fromAgent}** → **${c.toAgent}** | \`${specPreview}\` |`
      );
    }
    lines.push("");
  }

  // Blackboard Insights
  if (data.insights.length > 0) {
    const topics = [...new Set(data.insights.map((i) => i.topic))];
    lines.push("## 📋 Shared Blackboard");
    lines.push("");
    for (const topic of topics) {
      lines.push(`### 📌 ${topic}`);
      lines.push("");
      const topicInsights = data.insights.filter((i) => i.topic === topic);
      lines.push("| Key | Value | By | Time |");
      lines.push("|:----|:------|:---|:-----|");
      for (const ins of topicInsights.slice(0, 10)) {
        const valuePreview =
          ins.value.length > 80
            ? ins.value.slice(0, 77) + "..."
            : ins.value;
        lines.push(
          `| \`${ins.key}\` | ${valuePreview} | ${ins.agentId} | ${new Date(ins.createdAt).toLocaleTimeString()} |`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
