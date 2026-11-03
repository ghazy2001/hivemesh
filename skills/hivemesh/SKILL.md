---
name: hivemesh
description: >-
  Orchestrate multi-agent swarms for parallel development. Creates isolated Git
  worktrees, shares knowledge through a blackboard, detects AST-level semantic
  conflicts, facilitates P2P contract negotiation between agents, runs adversarial
  red-team testing, and provides a live mission control dashboard. Use when the
  user wants to run multiple agents in parallel on the same project, create a
  development swarm, or coordinate parallel feature work.
---

# HiveMesh — Multi-Agent Swarm Engine

HiveMesh lets you orchestrate a coordinated team of parallel agents that work
on the same codebase without stepping on each other.

## Quick Start

To create a swarm, you need:
1. A git repository as the project root
2. A list of roles (what each agent will do)
3. A task description to decompose

### Step 1: Analyze the Task

Break the user's request into independent subtasks. Good decomposition means:
- Each subtask can be worked on independently
- Dependencies between subtasks are expressed as contracts
- Each subtask maps to a clear role (backend, frontend, database, security, tests)

### Step 2: Create the Swarm

Use the `hivemesh_create_swarm` tool:
- `projectPath`: absolute path to the git repo
- `roles`: array of role names (e.g., `["backend", "frontend", "security"]`)
- `baseBranch`: branch to fork from (default: "main")

This creates isolated Git worktrees — one per role — so agents can work in
parallel without file conflicts.

### Step 3: Seed the Blackboard

Before launching agents, post key project context to the blackboard:

```
hivemesh_blackboard_post:
  topic: "architecture"
  key: "tech_stack"
  value: "Next.js frontend, NestJS backend, TypeORM with PostgreSQL"
  agentId: "orchestrator"
```

Post insights about: tech stack, coding conventions, file structure, auth
patterns, testing frameworks, and any project-specific gotchas.

### Step 4: Launch Agents

Use `invoke_subagent` to launch agents for each role. Give each agent:
- Its role name and task description
- The worktree path from the swarm (so it works in isolation)
- Instructions to read the blackboard first

Example launch pattern:
- 2–3 `hive-builder` agents for feature implementation
- 1 `hive-adversary` agent for security/edge-case testing
- Optionally 1 `hive-critic` agent for integration review

### Step 5: Monitor and Coordinate

While agents work:
- Use `hivemesh_dashboard` to generate a live status view
- Use `hivemesh_check_ast_changes` to detect conflicts early
- Use `hivemesh_blackboard_query` to see what agents have discovered
- Facilitate contract negotiations when agents need to agree on interfaces

### Step 6: Merge and Deliver

When agents complete:
1. Run final `hivemesh_check_ast_changes` — resolve any conflicts
2. Merge branches in dependency order (database → backend → frontend)
3. Run full test suite
4. Clean up with `hivemesh_destroy_swarm`
5. Present results to the user

## Available MCP Tools

| Tool | Purpose |
|:-----|:--------|
| `hivemesh_create_swarm` | Create worktrees for parallel agents |
| `hivemesh_swarm_status` | Check swarm and agent status |
| `hivemesh_destroy_swarm` | Clean up worktrees and branches |
| `hivemesh_blackboard_post` | Share knowledge between agents |
| `hivemesh_blackboard_query` | Read shared knowledge |
| `hivemesh_blackboard_list_topics` | List all knowledge topics |
| `hivemesh_propose_contract` | Propose an API/schema contract |
| `hivemesh_respond_contract` | Accept or reject a contract |
| `hivemesh_check_ast_changes` | Detect semantic code conflicts |
| `hivemesh_dashboard` | Generate live mission control view |

## Tips

- **Fewer agents is often better.** 3 focused agents beat 6 scattered ones.
- **Seed the blackboard generously.** The more context you share upfront, the
  less time agents waste re-reading the codebase.
- **Check AST changes early.** Don't wait until merge time to find conflicts.
- **Use contracts for cross-cutting concerns.** If backend and frontend need to
  agree on an API shape, make them negotiate a contract first.
