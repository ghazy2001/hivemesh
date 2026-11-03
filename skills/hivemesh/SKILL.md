---
name: hivemesh
description: >-
  Elastic multi-agent swarm engine for parallel development. Calculates the optimal
  critical path and elastically sizes swarms (from 1 to 10+ agents) for minimum execution
  time. Creates isolated Git worktrees for domain slices, shares knowledge via SQLite
  FTS5 blackboard, detects AST-level semantic conflicts, and runs adversarial testing.
---

# HiveMesh — Elastic Multi-Agent Swarm Engine

HiveMesh calculates the **fastest critical path** to task completion and elastically sizes your team with zero artificial limits.

## Elastic Sizing Spectrum

| Task Scope | Optimal Size ($N$) | Rationale |
|:-----------|:------------------:|:----------|
| **Atomic Fix / Bug** | **1 Agent** | Sequential dependencies; zero coordination overhead. |
| **Domain Feature** (e.g. Dark Mode) | **3–4 Agents** | Parallel component and token slices. |
| **Multi-Module / Monorepo Migration** | **5–10+ Agents** | Full multi-package parallelism across 10+ worktrees. |

## Execution Principles

1. **Calculate the Critical Path**: Don't spawn agents for the sake of spawning. Calculate the shortest path in wall-clock time.
2. **Elastic Scaling**: Scale up to 10+ agents when subtasks are parallelizable across packages or directories.
3. **Domain Isolation**: Every agent gets an independent Git worktree and branch.
4. **Shared Blackboard**: Zero redundant file reads — insights shared via SQLite FTS5.
5. **AST Guard**: Real-time TypeScript AST analysis to catch cross-branch breaking changes before merge.
