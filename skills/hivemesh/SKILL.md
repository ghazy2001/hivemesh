---
name: hivemesh
description: >-
  Adaptive multi-agent swarm engine for parallel development. Dynamically sizes
  swarms based on prompt complexity, creates isolated Git worktrees for domain slices
  (e.g., tokens, layout, data views), shares knowledge via SQLite FTS5 blackboard,
  detects AST-level semantic conflicts, facilitates P2P contract negotiation, and
  runs adversarial red-team testing. Use when running parallel agents on any task.
---

# HiveMesh — Adaptive Multi-Agent Swarm Engine

HiveMesh lets you orchestrate a dynamically sized, domain-specialized team of parallel agents tailored specifically to your prompt.

## Adaptive Sizing & Domain Decomposition

Do NOT assume fixed roles like "backend vs frontend". Instead, inspect the task and decompose by **functional slices**:

| Task Complexity | Recommended Swarm Size | Decomposition Pattern |
|:----------------|:-----------------------|:----------------------|
| **Focused / Small** (1–3 files) | 1–2 agents | `core-implementation` + `validation-tests` |
| **Domain Feature** (e.g. Dark Mode) | 2–3 agents | `theme-tokens`, `shell-layout`, `view-components` |
| **Cross-Cutting Feature** (e.g. Auth) | 3–4 agents | `auth-core`, `ui-flows`, `storage-models`, `security-adversary` |
| **Full Platform Overhaul** | 4–5 agents | Sliced by functional modules or package boundaries |

## Quick Start Steps

### Step 1: Analyze & Decompose
Inspect the prompt. Decide:
1. How many agents are needed (don't over-provision: 2–3 focused agents are faster than 5 scattered ones).
2. What specific domain slice each agent owns (e.g. `['theme-tokens', 'shell-layout', 'a11y-auditor']`).

### Step 2: Create Swarm
Call `hivemesh_create_swarm` with the project path and your dynamic role names:
```json
{
  "projectPath": "D:/my-project",
  "roles": ["theme-tokens", "shell-layout", "data-views", "a11y-auditor"]
}
```

### Step 3: Seed Blackboard
Post architectural conventions and tech stack info into SQLite Blackboard so agents inherit context instantly without burning tokens re-reading files.

### Step 4: Launch Dynamic Builders
Use `invoke_subagent` to launch `hive-builder` for each domain slice and `hive-adversary` for edge-case/security probing.

### Step 5: Monitor & Coordinate
- `hivemesh_canvas_view`: Render live SVG mission control topology.
- `hivemesh_check_ast_changes`: Catch breaking signature changes early.
- `hivemesh_self_play_round`: Test code resilience with adversarial fuzzing.

### Step 6: Merge & Deliver
Verify AST compatibility, merge branches in dependency order, run tests, and present the final deliverable.
