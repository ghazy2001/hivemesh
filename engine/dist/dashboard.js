/**
 * HiveMesh Dashboard — Generates a live Markdown mission control dashboard
 * showing swarm status, AST semantic conflicts, contracts, and shared knowledge.
 */
export function generateDashboard(data) {
    const lines = [];
    lines.push("# 🐝 HiveMesh Mission Control");
    lines.push("");
    lines.push(`> System Status: **Operational** | Last updated: \`${new Date().toISOString()}\``);
    lines.push("");
    // Swarm Status
    if (data.swarms.length === 0) {
        lines.push("## 📡 No Active Swarms");
        lines.push("");
        lines.push("Use `hivemesh_create_swarm` to create a new swarm with isolated worktrees.");
        return lines.join("\n");
    }
    for (const swarm of data.swarms) {
        lines.push(`## 🔷 Active Swarm: \`${swarm.id}\``);
        lines.push(`- **Project Root:** \`${swarm.projectPath}\``);
        lines.push(`- **Launched At:** ${new Date(swarm.createdAt).toLocaleString()}`);
        lines.push(`- **Total Agents:** \`${swarm.worktrees.length}\``);
        lines.push("");
        // Worker table
        lines.push("| State | Agent Role | Git Branch | Isolated Worktree Path |");
        lines.push("|:-----:|:-----------|:-----------|:-----------------------|");
        for (const wt of swarm.worktrees) {
            const statusIcon = wt.status === "active"
                ? "🟢 Active"
                : wt.status === "completed"
                    ? "✅ Done"
                    : "🔴 Error";
            lines.push(`| ${statusIcon} | **${wt.role}** | \`${wt.branch}\` | \`${wt.path}\` |`);
        }
        lines.push("");
    }
    // Critical Semantic AST Conflicts Alert
    if (data.semanticConflicts && data.semanticConflicts.length > 0) {
        lines.push("## 🚨 Critical Semantic AST Conflicts Detected");
        lines.push("");
        lines.push("> [!CAUTION]");
        lines.push("> The following breaking code changes will break sibling agents upon merge:");
        lines.push("");
        for (const sc of data.semanticConflicts) {
            lines.push(`- ⚠️ **${sc.symbolName}**: ${sc.description}`);
        }
        lines.push("");
    }
    // AST Changes Breakdown
    const allChanges = data.astReports.flatMap((r) => r.changes.map((c) => ({ ...c, role: r.role })));
    if (allChanges.length > 0) {
        lines.push("## 🔬 Deep AST Symbol Signatures");
        lines.push("");
        lines.push("| Impact | Kind | Symbol Name | Change | Modified File | Changed By |");
        lines.push("|:------:|:----:|:------------|:------:|:--------------|:-----------|");
        for (const c of allChanges.slice(0, 15)) {
            const icon = c.isBreaking ? "🔴 Breaking" : "🟢 Safe";
            const changeIcon = c.changeType === "added"
                ? "🟩 Added"
                : c.changeType === "modified"
                    ? "🟨 Modified"
                    : "🟥 Removed";
            lines.push(`| ${icon} | \`${c.kind}\` | \`${c.name}\` | ${changeIcon} | \`${c.file}\` | **${c.role}** |`);
        }
        if (allChanges.length > 15) {
            lines.push(`| ... | ... | ... | ... | ... | ... |`);
            lines.push("");
            lines.push(`> Showing top 15 of ${allChanges.length} AST changes.`);
        }
        lines.push("");
    }
    // P2P Contracts
    if (data.contracts.length > 0) {
        lines.push("## 🤝 P2P Interface Contracts");
        lines.push("");
        lines.push("| Status | Agreement Type | Negotiation Channel | Specification Preview |");
        lines.push("|:------:|:--------------:|:--------------------|:----------------------|");
        for (const c of data.contracts) {
            const statusIcon = c.status === "proposed"
                ? "🟡 Proposed"
                : c.status === "accepted"
                    ? "🟢 Accepted"
                    : "🔴 Rejected";
            const specPreview = c.spec.length > 60 ? c.spec.slice(0, 57) + "..." : c.spec;
            lines.push(`| ${statusIcon} | \`${c.type}\` | **${c.fromAgent}** ➡️ **${c.toAgent}** | \`${specPreview}\` |`);
        }
        lines.push("");
    }
    // Blackboard Insights (SQLite FTS5)
    if (data.insights.length > 0) {
        const topics = [...new Set(data.insights.map((i) => i.topic))];
        lines.push("## 📋 Shared Blackboard Memory (FTS5)");
        lines.push("");
        for (const topic of topics) {
            lines.push(`### 📌 Topic: \`${topic}\``);
            lines.push("");
            const topicInsights = data.insights.filter((i) => i.topic === topic);
            lines.push("| Key | Architectural Insight / Knowledge | Discovered By | Logged At |");
            lines.push("|:----|:----------------------------------|:--------------|:----------|");
            for (const ins of topicInsights.slice(0, 8)) {
                const valuePreview = ins.value.length > 80
                    ? ins.value.slice(0, 77) + "..."
                    : ins.value;
                lines.push(`| \`${ins.key}\` | ${valuePreview} | **${ins.agentId}** | ${new Date(ins.createdAt).toLocaleTimeString()} |`);
            }
            lines.push("");
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=dashboard.js.map