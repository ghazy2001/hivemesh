---
name: hivemesh
description: Universal Multi-Agent Swarm Orchestrator for parallel coding agents with Git worktrees, SQLite FTS5 blackboard memory, and TypeScript AST semantic conflict detection.
author: Mahmoud Ghazy (@ghazy2001)
version: 0.3.0
tags: [multi-agent, swarms, mcp, git-worktrees, ast-analysis, self-play]
---

# HiveMesh: Universal Multi-Agent Swarm Orchestrator

Activate this skill when orchestrating complex features, large refactors, or multi-component architectures requiring parallel agents without merge conflicts.

## Swarm Lifecycle Protocol

1. **Calculate Critical Path & Elastic Sizing**:
   - Decompose prompt into N independent domain slices (e.g., `theme-tokens`, `shell-layout`, `data-views`, `a11y-auditor`).
   - Create isolated Git worktrees for each domain slice using HiveMesh MCP or CLI.

2. **Query the SQLite FTS5 Blackboard First**:
   - Before writing any code, search the shared blackboard (`hivemesh_blackboard_query`) to discover existing contracts, conventions, and dependencies posted by peer agents.

3. **Negotiate Contracts Before Implementation**:
   - If your domain depends on another slice's API, propose a typed contract with `hivemesh_propose_contract`.

4. **Verify Semantic AST Consistency**:
   - Run `hivemesh_check_ast_changes` across worktrees. Verify that no exported types, functions, or parameters were broken by parallel edits.

5. **Execute Adversarial Red-Team Loop**:
   - Invoke `hivemesh_self_play_round` to simulate security, fuzzing, and edge-case attacks before pre-merge approval.

6. **Merge & Mission Control**:
   - Render the dynamic topology canvas with `hivemesh_canvas_view` or review the visual mission control at `hivemesh-dashboard.html`.
