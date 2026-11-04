---
description: HiveMesh Parallel Swarm Orchestration Rules for Cursor
globs: *
alwaysApply: false
---

# HiveMesh Swarm Orchestration for Cursor

When this rule is referenced (@hivemesh) or when instructed to orchestrate a complex feature in parallel:

## 1. Worktree Isolation Protocol
- Run `npx hivemesh run "<task>" --roles <r1,r2,...>` to spin up isolated Git worktrees.
- Each agent operates in its own worktree to guarantee zero merge collisions.

## 2. Shared Memory Discipline
- Search shared discoveries in the SQLite FTS5 blackboard.
- Post API schemas and architecture decisions immediately for other agents.

## 3. TypeScript AST Safety Check
- Before proposing any merge, run AST signature checks:
  Ensure no exported interfaces or types were mutated without updating consumer files.

## 4. Adversarial Red-Team Verification
- Always review code for:
  1. Unhandled async rejections or race conditions.
  2. Missing authentication / session checks.
  3. Strict input validation and sanitization.
