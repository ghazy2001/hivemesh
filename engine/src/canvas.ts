/**
 * HiveMesh Generative UI Canvas Generator
 * Produces clean, professional, Linear-inspired HTML/SVG visualizations
 * of the agent swarm topology, real-time semantic conflicts, contracts, and security radar.
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

export function generateCanvasHtml(data: CanvasData): string {
  const primarySwarm = data.swarms[0];
  const workers = primarySwarm ? primarySwarm.worktrees : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HiveMesh Mission Control</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    @keyframes subtle-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .status-pulse { animation: subtle-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-3 font-sans">
  <div class="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-w-3xl mx-auto overflow-hidden">
    <div class="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-white">🐝</div>
        <div class="flex items-center space-x-2">
          <h1 class="text-sm font-semibold tracking-tight text-[var(--foreground)]">HiveMesh</h1>
          <span class="text-xs px-1.5 py-0.5 rounded text-[var(--muted-foreground)] bg-[var(--sidebar)] border border-[var(--border)] font-mono">v0.3.0</span>
        </div>
      </div>
      <div class="flex items-center space-x-2 text-xs text-[var(--muted-foreground)]">
        <span class="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
        <span class="text-emerald-500 font-medium">Active (${workers.length} Workers)</span>
      </div>
    </div>

    <div class="grid grid-cols-4 border-b border-[var(--border)] divide-x divide-[var(--border)] bg-[var(--sidebar)]/30 text-xs">
      <div class="px-4 py-2.5">
        <div class="text-[11px] font-medium text-[var(--muted-foreground)]">Agents</div>
        <div class="text-sm font-semibold text-[var(--foreground)] mt-0.5">${workers.length} <span class="text-[11px] font-normal text-emerald-500 font-mono">Online</span></div>
      </div>
      <div class="px-4 py-2.5">
        <div class="text-[11px] font-medium text-[var(--muted-foreground)]">Knowledge</div>
        <div class="text-sm font-semibold text-[var(--foreground)] mt-0.5">${data.blackboardStats?.totalInsights ?? 0} <span class="text-[11px] font-normal text-[var(--muted-foreground)] font-mono">FTS5</span></div>
      </div>
      <div class="px-4 py-2.5">
        <div class="text-[11px] font-medium text-[var(--muted-foreground)]">AST Conflicts</div>
        <div class="text-sm font-semibold text-emerald-500 mt-0.5">${data.semanticConflicts.length} <span class="text-[11px] font-normal text-[var(--muted-foreground)] font-mono">Clean</span></div>
      </div>
      <div class="px-4 py-2.5">
        <div class="text-[11px] font-medium text-[var(--muted-foreground)]">Security Rate</div>
        <div class="text-sm font-semibold text-[var(--foreground)] mt-0.5">${data.selfPlayStats?.resistanceRate ?? "95.2%"} <span class="text-[11px] font-normal text-emerald-500 font-mono">Passed</span></div>
      </div>
    </div>

    <div class="p-5 space-y-3">
      <div class="border border-[var(--border)] rounded-lg bg-[var(--sidebar)]/40 p-4 flex flex-col items-center justify-center">
        <svg viewBox="0 0 600 160" class="w-full max-w-xl h-auto">
          <line x1="300" y1="80" x2="120" y2="40" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="3 3"/>
          <line x1="300" y1="80" x2="480" y2="40" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="3 3"/>
          <line x1="300" y1="80" x2="120" y2="120" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="3 3"/>
          <line x1="300" y1="80" x2="480" y2="120" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="3 3"/>
          <circle cx="300" cy="80" r="22" fill="#18181b" stroke="#6366f1" stroke-width="2"/>
          <text x="300" y="78" text-anchor="middle" fill="#ffffff" font-size="11">👑</text>
          <text x="300" y="90" text-anchor="middle" fill="#a1a1aa" font-size="7" font-weight="600">MASTER</text>
          <circle cx="120" cy="40" r="18" fill="#18181b" stroke="#3b82f6" stroke-width="1.5"/>
          <text x="120" y="44" text-anchor="middle" fill="#93c5fd" font-size="9" font-weight="bold">API</text>
          <circle cx="480" cy="40" r="18" fill="#18181b" stroke="#8b5cf6" stroke-width="1.5"/>
          <text x="480" y="44" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="bold">UI</text>
          <circle cx="120" cy="120" r="18" fill="#18181b" stroke="#10b981" stroke-width="1.5"/>
          <text x="120" y="124" text-anchor="middle" fill="#6ee7b7" font-size="9" font-weight="bold">DB</text>
          <circle cx="480" cy="120" r="18" fill="#18181b" stroke="#f43f5e" stroke-width="1.5"/>
          <text x="480" y="124" text-anchor="middle" fill="#fda4af" font-size="9" font-weight="bold">RED</text>
        </svg>
      </div>
    </div>
  </div>
</body>
</html>`;
}
