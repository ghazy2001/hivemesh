# HiveMesh Setup & Prompt for Claude Code

## Prerequisites
Verify Node.js (>=22) and Git are installed:
```bash
npx hivemesh doctor
```

## Adding HiveMesh to Claude Code (MCP Configuration)
Add the HiveMesh MCP Server to your Claude Code or Claude Desktop configuration (`~/.claude/claude_desktop_config.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "hivemesh": {
      "command": "npx",
      "args": ["-y", "hivemesh@latest", "run"]
    }
  }
}
```

## Swarm Orchestration Prompt Template
Use the following prompt in Claude Code when initiating a multi-agent task:

```text
You are acting as the HiveMesh Swarm Orchestrator. 
Analyze the task below, compute the critical path, and size an elastic swarm of parallel agents:

Task: "[YOUR TASK HERE]"

Execution Steps:
1. Decompose the task into independent domain slices.
2. Call `hivemesh_create_swarm` to provision isolated Git worktrees.
3. Post the architectural blueprint to `hivemesh_blackboard_post`.
4. Run each slice in its worktree, verifying AST signatures with `hivemesh_check_ast_changes`.
5. Run adversarial checks via `hivemesh_self_play_round` before final merge.
```
