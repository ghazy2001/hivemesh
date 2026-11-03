# 🐝 HiveMesh — The Universal Multi-Agent Swarm Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: 0.3.0](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/ghazy2001/hivemesh)
[![MCP Protocol](https://img.shields.io/badge/MCP-Standard%202025-purple.svg)](https://modelcontextprotocol.io/)
[![Swarm Sizing: Elastic 1 to 10+](https://img.shields.io/badge/Swarm%20Sizing-Elastic%20(1%20to%2010%2B)-indigo.svg)](https://github.com/ghazy2001/hivemesh)
[![Platform: Claude Code | Cursor | Antigravity | CLI](https://img.shields.io/badge/platforms-Claude%20Code%20%7C%20Cursor%20%7C%20Antigravity%20%7C%20CLI-success.svg)](https://github.com/ghazy2001/hivemesh)

**HiveMesh** is an elastic, platform-agnostic multi-agent orchestration engine. It transforms any AI coding agent — **Claude Code**, **Cursor**, **Antigravity**, **Windsurf**, or your terminal — into a dynamically sized swarm of parallel agents working in isolated Git worktrees.

Instead of fixed limits or rigid roles, HiveMesh's orchestrator **calculates the optimal critical path** to finish your task in the absolute fastest time. Whether the task requires **1 laser-focused agent** to patch a bug in 30 seconds, **3 agents** to build a feature, or **10+ parallel agents** to migrate an entire enterprise monorepo, HiveMesh scales elastically without artificial ceilings.

---

## ⚡ Elastic Critical-Path Optimization

The Orchestrator evaluates the task's dependency graph, blast radius, and parallelizability:

```
[Prompt Analysis] ➡️ [Dependency Graph] ➡️ [Critical Path Calculation] ➡️ [Elastic Swarm Sizing (N = 1, 3, 5, 10+)]
```

- **Atomic Bug Fix (N = 1)**: Single agent execution when sequential dependencies mean parallel coordination would only add overhead.
- **Targeted Domain Feature (N = 3–4)**: Parallel worktree slices (e.g. `theme-tokens`, `shell-layout`, `data-views`, `a11y-auditor`).
- **Large Multi-Module Overhaul (N = 6–10+)**: Massive enterprise migrations across 10 packages or microservices running simultaneously in 10 isolated worktrees.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User["👤 Developer Prompt\n(e.g. 'Migrate monorepo packages' or 'Fix race condition')"] --> Orch["🧠 HiveMesh Orchestrator\n• Analyzes Dependency Graph\n• Calculates Fastest Critical Path\n• Elastically Sizes Swarm: N = 1, 3, 10+ Agents\n• Slices Project into Domain Worktrees"]
    
    Orch --> |"Provisions Elastic Worktrees"| WTM["Git Worktree Manager"]
    
    WTM --> A1["🔨 Builder 1: Slice A"]
    WTM --> A2["🔨 Builder 2: Slice B"]
    WTM --> A3["🔨 Builder 3: Slice C"]
    WTM --> AN["🔨 Builder N: Slice N (Up to 10+ Parallel Agents)"]
    WTM --> ADV["💀 Adversary: Quality & Security Red Team"]
    
    A1 <--> |"P2P Contracts"| A2
    A1 --> |"Post Discoveries"| BB["📋 SQLite FTS5 Blackboard"]
    A2 & A3 & AN --> |"Instant FTS5 Search"| BB
    
    A1 --> |"AST Diff"| AST["🔬 AST Conflict Watcher"]
    AST --> |"Real-time Conflict Warnings"| A2 & AN
    
    ADV --> |"Adversarial Self-Play Loops"| A1 & A2 & AN
    
    A1 & A2 & AN & ADV --> CRIT["🧐 Integration Critic"]
    CRIT --> |"Merge & Verify"| PR["✅ Final Verified PR"]
```

---

## 🌐 Universal Compatibility

Because HiveMesh is built on the open **Model Context Protocol (MCP)**, it works seamlessly across the entire AI engineering ecosystem:

| Platform | Integration Method | Supported |
|:---------|:-------------------|:---------:|
| **Claude Code** | Native MCP (`claude mcp add hivemesh ...`) | ✅ Full |
| **Cursor IDE** | Settings → Features → MCP Servers | ✅ Full |
| **Google Antigravity** | Plugin Bundle (`~/.gemini/config/plugins/hivemesh`) | ✅ Full |
| **Windsurf / Codeium** | Cascade MCP Config (`mcp_config.json`) | ✅ Full |
| **Terminal / CI/CD** | Standalone CLI (`npx hivemesh run`) | ✅ Full |

---

## 🚀 Quick Setup by Platform

### 1. In Claude Code (Terminal)
Add HiveMesh to Claude Code in one command:
```bash
claude mcp add hivemesh node /path/to/hivemesh/engine/dist/server.js
```
Or in your project's `.claude/config.json`:
```json
{
  "mcpServers": {
    "hivemesh": {
      "command": "node",
      "args": ["/absolute/path/to/hivemesh/engine/dist/server.js"]
    }
  }
}
```

### 2. In Cursor IDE
1. Open **Cursor Settings** → **Features** → **MCP**.
2. Click **+ Add New MCP Server**.
3. Set Name: `hivemesh`, Type: `stdio`, Command: `node /path/to/hivemesh/engine/dist/server.js`.

### 3. In Google Antigravity
Copy or link to `~/.gemini/config/plugins/hivemesh/` and restart Antigravity.

### 4. Standalone CLI (Any Terminal)
```bash
# Verify environment
npx hivemesh doctor

# Run parallel swarm with dynamic automatic sizing
npx hivemesh run "Migrate all 8 packages to ESM"

# Or explicitly define custom domain slices
npx hivemesh run "Dark mode migration" --roles theme-tokens,shell-layout,data-views,a11y-auditor

# Check status
npx hivemesh status

# Clean up
npx hivemesh clean <swarmId>
```

---

## 🛠️ MCP Tools (12 Tools)

| Tool | Description |
|:-----|:------------|
| `hivemesh_create_swarm` | Creates isolated Git worktrees with dynamic task-specific roles. |
| `hivemesh_swarm_status` | Returns the real-time status of all agents and active worktrees. |
| `hivemesh_destroy_swarm` | Cleans up worktrees and branches when work is done. |
| `hivemesh_blackboard_post` | Publishes architectural discoveries into SQLite with FTS5 indexing. |
| `hivemesh_blackboard_query` | Natural-language full-text search across knowledge using SQLite FTS5 & BM25 ranking. |
| `hivemesh_blackboard_list_topics` | Lists all knowledge categories with counts and agent statistics. |
| `hivemesh_propose_contract` | Proposes an API/schema contract between two agents before coding. |
| `hivemesh_respond_contract` | Accepts or rejects a proposed interface contract. |
| `hivemesh_check_ast_changes` | Deep TypeScript AST analysis detecting breaking changes and cross-worktree reference conflicts. |
| `hivemesh_self_play_round` | Runs automated Red-Team adversarial attack tests against builder branches with remediation guidance. |
| `hivemesh_canvas_view` | Generates an interactive SVG/HTML Generative UI canvas for the swarm topology. |
| `hivemesh_dashboard` | Generates a live markdown mission control dashboard. |

---

## 👥 Dynamic Agent Roles

- **`hive-orchestrator`**: Master planner. Reads prompt, estimates scope, sizes swarm, slices domain, creates worktrees, coordinates merges.
- **`hive-builder`**: Domain implementation specialist operating strictly in an assigned worktree slice.
- **`hive-adversary`**: Red-team quality/security tester that probes edge cases, race conditions, or domain vulnerabilities.
- **`hive-critic`**: Integration reviewer that verifies AST changes, contracts, builds, and test runs before merge.

---

## 🧪 Testing

Run the automated integration test suite:

```bash
npm test
```

---

## 📄 License
MIT © [Mahmoud Ghazy](https://github.com/ghazy2001)
