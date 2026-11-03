/**
 * HiveMesh Generative UI Canvas Generator
 * Produces interactive HTML/SVG visualizations of the agent swarm topology,
 * real-time semantic conflicts, contracts, and self-play security radar.
 */
export function generateCanvasHtml(data) {
    const primarySwarm = data.swarms[0];
    const workers = primarySwarm ? primarySwarm.worktrees : [];
    // Generate SVG nodes dynamically
    const svgWidth = 700;
    const svgHeight = 320;
    const centerX = 350;
    const centerY = 160;
    const nodeElements = [];
    const lineElements = [];
    // Center Orchestrator Node
    nodeElements.push(`
    <g class="node orchestrator" transform="translate(${centerX}, ${centerY})">
      <circle r="36" fill="#1e1b4b" stroke="#6366f1" stroke-width="3" filter="url(#glow)"/>
      <text y="5" text-anchor="middle" fill="#ffffff" font-weight="700" font-size="13">👑 Master</text>
    </g>
  `);
    // Surrounding Worker Nodes
    const totalWorkers = workers.length || 3;
    const radius = 170;
    workers.forEach((w, idx) => {
        const angle = (idx / totalWorkers) * 2 * Math.PI - Math.PI / 2;
        const nx = centerX + radius * Math.cos(angle);
        const ny = centerY + radius * Math.sin(angle);
        const isAdversary = w.role.includes("security") || w.role.includes("adversary");
        const strokeColor = isAdversary ? "#ef4444" : w.status === "completed" ? "#10b981" : "#3b82f6";
        const fillColor = isAdversary ? "#450a0a" : "#0f172a";
        // Connecting line with pulse effect
        lineElements.push(`
      <line x1="${centerX}" y1="${centerY}" x2="${nx}" y2="${ny}" stroke="${strokeColor}" stroke-dasharray="4 4" stroke-width="2" opacity="0.75"/>
    `);
        // Worker circle
        const icon = isAdversary ? "💀" : "🔨";
        nodeElements.push(`
      <g class="node worker" transform="translate(${nx}, ${ny})">
        <circle r="30" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>
        <text y="-2" text-anchor="middle" fill="#f8fafc" font-size="11" font-weight="600">${icon} ${w.role}</text>
        <text y="14" text-anchor="middle" fill="${strokeColor}" font-size="9">${w.status}</text>
      </g>
    `);
    });
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HiveMesh Mission Control Canvas</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --accent: #6366f1;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    body {
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid #4f46e5;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .metric-value {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      margin-top: 4px;
    }
    .metric-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .topology-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .conflicts-card {
      background: #2b0f14;
      border: 1px solid #dc2626;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin:0 0 4px 0;">🐝 HiveMesh Mission Control</h2>
      <span style="font-size:12px; color:var(--text-muted);">Real-time Autonomous Swarm Topology & AST Conflict Radar</span>
    </div>
    <span class="badge">Swarm Active</span>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Active Agents</div>
      <div class="metric-value">${workers.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Knowledge Items (FTS5)</div>
      <div class="metric-value">${data.blackboardStats?.totalInsights ?? 0}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">P2P Contracts</div>
      <div class="metric-value">${data.contracts.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">AST Conflicts</div>
      <div class="metric-value" style="color: ${data.semanticConflicts.length > 0 ? "var(--danger)" : "var(--success)"};">
        ${data.semanticConflicts.length}
      </div>
    </div>
  </div>

  ${data.semanticConflicts.length > 0
        ? `
  <div class="conflicts-card">
    <h4 style="margin:0 0 8px 0; color:#fca5a5;">🚨 High-Priority Semantic AST Conflicts</h4>
    <ul style="margin:0; padding-left:20px; font-size:13px; color:#fecaca;">
      ${data.semanticConflicts.map((c) => `<li><strong>${c.symbolName}</strong>: ${c.description}</li>`).join("")}
    </ul>
  </div>`
        : ""}

  <div class="topology-container">
    <svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="max-width: 700px;">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      ${lineElements.join("\n")}
      ${nodeElements.join("\n")}
    </svg>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=canvas.js.map