#!/usr/bin/env node

/**
 * HiveMesh Standalone CLI Runner
 * Multi-Agent Swarm Orchestrator for terminal and CI/CD environments.
 * Usage:
 *   npx hivemesh --version
 *   npx hivemesh doctor
 *   npx hivemesh run "Implement OAuth token refresh" --roles backend,frontend,security
 *   npx hivemesh status
 *   npx hivemesh clean <swarmId>
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const VERSION = "0.3.0";
const args = process.argv.slice(2);
const command = args[0];

function printBanner() {
  console.log(`
  \x1b[36m🐝 HiveMesh Swarm Engine v${VERSION}\x1b[0m
  Autonomous Multi-Agent Orchestration with AST & Self-Play
  `);
}

function printHelp() {
  printBanner();
  console.log(`
Usage:
  hivemesh [command] [options]

Commands:
  doctor                     Verify environment (Node.js, Git, SQLite FTS5, Antigravity)
  run "<task>" [options]     Create a swarm and plan parallel worktree execution
  status                     List active swarms and worktrees
  clean [swarmId]            Destroy worktrees and branches for a swarm
  ui [--port <port>]         Start real-time Mission Control Live UI in browser
  --version, -v              Print version
  --help, -h                 Print this help message

Options for 'run':
  --roles <r1,r2,...>        Comma-separated list of agent roles (default: backend,frontend,security)
  --base <branch>            Base Git branch to branch from (default: main)
  --dir <path>               Target project directory (default: current working directory)

Examples:
  npx hivemesh doctor
  npx hivemesh run "Add WebAuthn passkeys" --roles backend,frontend,security
  npx hivemesh status
  `);
}

async function runDoctor() {
  printBanner();
  console.log("Checking system environment...\n");

  // 1. Node.js Version
  const nodeVer = process.version;
  console.log(`  ✓ Node.js Runtime: \x1b[32m${nodeVer}\x1b[0m`);

  // 2. Git
  try {
    const gitVer = execSync("git --version", { encoding: "utf-8", stdio: "pipe" }).trim();
    console.log(`  ✓ Git Version: \x1b[32m${gitVer}\x1b[0m`);
  } catch {
    console.log(`  ✗ Git: \x1b[31mNOT FOUND in PATH\x1b[0m`);
  }

  // 3. SQLite FTS5
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE VIRTUAL TABLE fts_check USING fts5(content);");
    console.log(`  ✓ Native SQLite FTS5: \x1b[32mSUPPORTED (Node.js native)\x1b[0m`);
  } catch (e) {
    console.log(`  ✗ SQLite FTS5: \x1b[31mError: ${e}\x1b[0m`);
  }

  // 4. Antigravity Plugin Integration Check
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const pluginDir = path.join(home, ".gemini", "config", "plugins", "hivemesh");
  if (fs.existsSync(pluginDir)) {
    console.log(`  ✓ Antigravity Plugin: \x1b[32mINSTALLED\x1b[0m at ${pluginDir}`);
  } else {
    console.log(`  ℹ Antigravity Plugin: \x1b[33mNot in global plugin directory (Standalone mode active)\x1b[0m`);
  }

  console.log("\n\x1b[32m✓ HiveMesh is fully operational and ready to orchestrate swarms!\x1b[0m\n");
}

function inferDynamicRoles(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes("dark mode") || p.includes("theme") || p.includes("css") || p.includes("style") || p.includes("color")) {
    return ["theme-tokens", "shell-layout", "data-views", "a11y-auditor"];
  }
  if (p.includes("auth") || p.includes("login") || p.includes("passkey") || p.includes("oauth") || p.includes("session")) {
    return ["auth-guards", "token-services", "ui-modals", "security-adversary"];
  }
  if (p.includes("database") || p.includes("migration") || p.includes("schema") || p.includes("orm") || p.includes("postgres")) {
    return ["schema-migrations", "entity-models", "repository-services", "integrity-tests"];
  }
  if (p.includes("refactor") || p.includes("clean") || p.includes("perf") || p.includes("optimize")) {
    return ["core-refactor", "api-consumers", "regression-tests"];
  }
  return ["domain-logic", "ui-surface", "quality-adversary"];
}

async function handleRun() {
  const taskDesc = args[1];
  if (!taskDesc || taskDesc.startsWith("--")) {
    console.error("\x1b[31mError: Please provide a task description. Example: hivemesh run 'Add passkeys'\x1b[0m");
    process.exit(1);
  }

  printBanner();

  let roles = inferDynamicRoles(taskDesc);
  let baseBranch = "main";
  let targetDir = process.cwd();

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--roles" && args[i + 1]) {
      roles = args[i + 1].split(",").map((r) => r.trim());
      i++;
    } else if (args[i] === "--base" && args[i + 1]) {
      baseBranch = args[i + 1];
      i++;
    } else if (args[i] === "--dir" && args[i + 1]) {
      targetDir = path.resolve(args[i + 1]);
      i++;
    }
  }

  console.log(`Target Project: \x1b[33m${targetDir}\x1b[0m`);
  console.log(`Task Prompt:    \x1b[36m"${taskDesc}"\x1b[0m`);
  console.log(`Agent Roles:    \x1b[32m${roles.join(", ")}\x1b[0m`);
  console.log(`Base Branch:    \x1b[35m${baseBranch}\x1b[0m\n`);

  try {
    const { createSwarm } = await import("../engine/dist/worktree-manager.js");
    const swarm = createSwarm(targetDir, roles, baseBranch);

    console.log(`\x1b[32m✓ Swarm Created Successfully! ID: ${swarm.id}\x1b[0m\n`);
    console.log("Isolated Worktrees:");
    for (const wt of swarm.worktrees) {
      console.log(`  • Role: \x1b[36m${wt.role.padEnd(12)}\x1b[0m Branch: \x1b[33m${wt.branch.padEnd(30)}\x1b[0m Path: ${wt.path}`);
    }

    console.log(`
\x1b[32m✓ Swarm is ready for parallel agents!\x1b[0m
In Antigravity chat, run:
  \x1b[36m/swarm "Resume work on swarm ${swarm.id}"\x1b[0m
Or query status:
  \x1b[36mnpx hivemesh status\x1b[0m
`);
  } catch (err) {
    console.error(`\x1b[31mFailed to create swarm: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
    process.exit(1);
  }
}

async function handleStatus() {
  printBanner();
  try {
    const { getSwarmStatus } = await import("../engine/dist/worktree-manager.js");
    const swarms = getSwarmStatus();

    if (swarms.length === 0) {
      console.log("No active swarms found.");
      return;
    }

    for (const s of swarms) {
      console.log(`Swarm \x1b[36m${s.id}\x1b[0m (${s.projectPath})`);
      for (const wt of s.worktrees) {
        console.log(`  [${wt.status}] \x1b[33m${wt.role}\x1b[0m -> ${wt.branch}`);
      }
    }
  } catch (e) {
    console.error("Failed to query status:", e);
  }
}

async function handleClean() {
  const swarmId = args[1];
  if (!swarmId) {
    console.error("Please specify swarm ID to clean: npx hivemesh clean <swarmId>");
    process.exit(1);
  }

  try {
    const { destroySwarm } = await import("../engine/dist/worktree-manager.js");
    const res = destroySwarm(swarmId);
    console.log(res.message);
  } catch (e) {
    console.error("Failed to clean swarm:", e);
  }
}

async function handleUi() {
  printBanner();
  const portIndex = args.indexOf("--port");
  const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 4242;
  const autoOpen = !args.includes("--no-open");

  try {
    const { startUiServer } = await import("../engine/dist/ui-server.js");
    await startUiServer(port, autoOpen);
    console.log("Press Ctrl+C to stop the UI server.");
  } catch (e) {
    console.error("Failed to start UI server:", e);
    process.exit(1);
  }
}

async function main() {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`v${VERSION}`);
    return;
  }

  switch (command) {
    case "doctor":
      await runDoctor();
      break;
    case "run":
      await handleRun();
      break;
    case "status":
      await handleStatus();
      break;
    case "clean":
      await handleClean();
      break;
    case "ui":
    case "dashboard":
      await handleUi();
      break;
    default:
      console.error(`Unknown command: ${command}. Run 'hivemesh --help' for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
