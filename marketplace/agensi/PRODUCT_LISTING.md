# Agensi.io Marketplace Product Listing: HiveMesh Swarm Engine

## 1. Product Overview
* **Product Title**: HiveMesh — Multi-Agent Swarm Orchestrator with AST Safety & Shared Blackboard
* **Short Tagline**: Run parallel autonomous coding agents across isolated Git worktrees with zero merge conflicts and deep TypeScript AST verification.
* **Suggested Price**: $19.00 (or $0.00 / Free Tier if launching as community acquisition)
* **Categories**: Multi-Agent Orchestration, Code Architecture & Refactoring, Developer Tooling, Automated Testing
* **Compatible Agents**: Claude Code, Cursor, Antigravity, Windsurf, GitHub Copilot, Cline, Roo Code

---

## 2. Product Description (For Agensi.io Listing Page)

### Why HiveMesh?
When a single coding agent tackles large features, it either loses context, hallucinates file edits, or gets stuck in single-threaded loops. 

**HiveMesh** transforms your coding agent into an elastic multi-agent swarm engine:
1. **Isolated Git Worktrees**: Instead of multiple agents editing the same files, HiveMesh allocates dedicated worktrees per domain slice (e.g., `feature/theme-tokens`, `feature/shell-layout`, `feature/a11y-auditor`).
2. **Deterministic AST Conflict Detection**: Powered by the TypeScript Compiler API, HiveMesh analyzes symbol signatures and catches breaking type or parameter changes across branches *before* any git merge.
3. **SQLite FTS5 Blackboard Memory**: Native SQLite full-text search with BM25 ranking enables all parallel agents to share discoveries, APIs, and findings with sub-millisecond retrieval.
4. **Automated Adversarial Self-Play**: A built-in Red-Team adversary agent attacks implementations with edge cases and race condition checks to verify robustness before human review.
5. **Generative UI Mission Control**: Visual real-time dashboard and dynamic topology canvas to inspect swarm interactions, blackboard entries, and worktree diffs visually.

---

## 3. What’s Included in this Package
* `hivemesh-swarm-engine.skill.md` — Universal Agent Skill specification ready to drop into `.agent/skills/` or `.cursor/skills/`.
* `cursor-rules-pack.md` — Optimized system prompt and MDC rule file for Cursor Composer & Agent mode.
* `claude-code-prompt.md` — Setup workflow and CLI configuration for Claude Code terminal sessions.
* **CLI Engine Integration**: Full connectivity guide for `npx hivemesh` and the HiveMesh MCP Server.

---

## 4. Quick Start for Buyers

### Option A: Cursor
1. Create `.cursor/rules/hivemesh.mdc` in your project root.
2. Paste the contents of `cursor-rules-pack.md`.
3. In Cursor Composer, trigger the swarm with:
   `@hivemesh run "Implement OAuth2 token refresh with biometric passkeys"`

### Option B: Claude Code
1. Open your project terminal.
2. Run `npx hivemesh doctor` to verify environment prerequisites.
3. In Claude Code, run the HiveMesh skill prompt from `claude-code-prompt.md`.

---

## 5. Creator Profile & Support
* **Created by**: Mahmoud Ghazy ([@ghazy2001](https://github.com/ghazy2001))
* **GitHub Repository**: https://github.com/ghazy2001/hivemesh
* **License**: MIT
