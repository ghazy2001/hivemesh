---
description: HiveMesh Parallel Multi-Agent Swarm Orchestrator for Cursor
globs: *
alwaysApply: false
---

# HiveMesh Cursor Swarm Orchestration Rules

When this rule is referenced (@hivemesh) or when instructed to orchestrate a complex feature in parallel:

## 1. Worktree Isolation Protocol
- Do not edit multiple components directly in the working branch if they can be parallelized.
- Run `npx hivemesh run "<task>" --roles <r1,r2,...>` to spin up isolated Git worktrees.
- Each branch is dedicated to one domain slice (e.g. `feat/auth-core`, `feat/auth-ui`).

## 2. Shared Memory Discipline
- Keep discovered architecture patterns in the shared HiveMesh blackboard.
- Use `npx hivemesh status` to inspect active swarms and their branches.

## 3. TypeScript AST Safety Check
- Before proposing any merge, check TypeScript Compiler API diffs:
  Verify no exported interfaces or types were mutated without updating consumer files.

## 4. Adversarial Red-Team Verification
- Always review code for:
  1. Unhandled async rejections or race conditions.
  2. Missing authentication / session checks.
  3. Strict input validation and sanitization.
