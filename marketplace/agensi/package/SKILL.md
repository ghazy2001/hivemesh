---
name: hivemesh-parallel-swarm
description: >-
  Universal multi-agent swarm orchestrator for Claude Code, Cursor, and terminal.
  Decomposes tasks into critical paths, allocates isolated Git worktrees, detects
  TypeScript AST signature conflicts across branches, and shares discoveries via SQLite FTS5 blackboard.
version: 0.3.0
author: Mahmoud Ghazy (@ghazy2001)
repository: https://github.com/ghazy2001/hivemesh
tags: [multi-agent, swarm, git-worktrees, ast-conflict-detection, blackboard-memory, self-play]
---

# HiveMesh: Autonomous Multi-Agent Swarm Orchestrator

Use this skill whenever orchestrating multi-file features, architecture refactors, or concurrent tasks across isolated Git worktrees with zero merge conflicts.

## Swarm Lifecycle Protocol

1. **Calculate Critical Path & Elastic Sizing**:
   - Decompose prompt into N independent domain slices (e.g., `theme-tokens`, `shell-layout`, `data-views`, `a11y-auditor`).
   - Run `hivemesh run "<task>" --roles <r1,r2,...>` to spin up isolated Git worktrees per slice.

2. **Query the SQLite FTS5 Blackboard First**:
   - Before writing any code, search the shared blackboard (`hivemesh_blackboard_query`) to discover existing contracts, conventions, and dependencies posted by peer agents.

3. **Negotiate Contracts Before Implementation**:
   - If your domain depends on another slice's API, propose a typed contract with `hivemesh_propose_contract`.

4. **Verify Semantic AST Consistency**:
   - Run `hivemesh_check_ast_changes` across worktrees. Verify that no exported types, functions, or parameters were broken by parallel edits.

5. **Execute Adversarial Red-Team Loop**:
   - Invoke `hivemesh_self_play_round` to simulate security, fuzzing, and edge-case attacks before pre-merge approval.
