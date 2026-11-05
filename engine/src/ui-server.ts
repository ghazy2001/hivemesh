/**
 * HiveMesh Companion UI Server
 * Ultra-fast zero-dependency HTTP server with Server-Sent Events (SSE).
 * Serves 100% real data from Git, Worktrees, AST Watcher, and SQLite FTS5 Blackboard.
 * Powers the real-time Orchestrator command deck and human-in-the-loop steering.
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { exec, execSync } from "child_process";
import { fileURLToPath } from "url";
import { createSwarm, getSwarmStatus, destroySwarm } from "./worktree-manager.js";
import { Blackboard } from "./blackboard.js";
import { checkASTChanges } from "./ast-watcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SSEClient {
  id: number;
  res: http.ServerResponse;
}

let clients: SSEClient[] = [];
let clientIdCounter = 0;
let isSwarmPaused = false;
let currentSwarmPlan: Record<string, string> = {};
let currentSessionTitle = "Autonomous Swarm & Agensi Skill Launch";
let currentSwarmPrompt = "";
let orchestratorPhase: "idle" | "analyzing" | "orchestrating" = "idle";
let agentActivities: Record<string, string> = {};
let pinnedConversationId: string | null = null;

export interface BrainConversation {
  id: string;
  mtime: number;
  title: string;
}

const hiveMeshConvCache = new Map<string, { mtime: number; isHive: boolean }>();
const sessionTitleCache = new Map<string, string>();

function isHiveMeshTranscript(id: string, tPath: string, mtime: number): boolean {
  const cached = hiveMeshConvCache.get(id);
  if (cached && cached.mtime === mtime) {
    return cached.isHive;
  }
  try {
    const content = fs.readFileSync(tPath, "utf-8");
    const isHive = /plugins[\\/]hivemesh|hivemesh_|hive-(orchestrator|builder|adversary|critic)|twenty-crm-hivemesh-swarm|D:[\\/]hivemesh|hivemesh\.js|HiveMesh Engine Builder|HiveMesh Skill and Agent Writer/i.test(content);
    hiveMeshConvCache.set(id, { mtime, isHive });
    return isHive;
  } catch {
    hiveMeshConvCache.set(id, { mtime, isHive: false });
    return false;
  }
}

function getSessionTitle(id: string, brainDir: string): string {
  if (sessionTitleCache.has(id)) {
    return sessionTitleCache.get(id)!;
  }

  // 1. Check if it's a known subagent descriptor
  try {
    const parentDirs = fs.readdirSync(brainDir);
    for (const d of parentDirs) {
      const sp = path.join(brainDir, d, ".system_generated", "subagents", `${id}.json`);
      if (fs.existsSync(sp)) {
        const json = JSON.parse(fs.readFileSync(sp, "utf-8"));
        if (json.subagentDescriptor?.role) {
          const role = String(json.subagentDescriptor.role).trim();
          sessionTitleCache.set(id, role);
          return role;
        }
      }
    }
  } catch {}

  // 2. Check chapter_titles
  const baseDir = path.dirname(brainDir);
  const pbPath = path.join(baseDir, "chapter_titles", `${id}.pb`);
  if (fs.existsSync(pbPath)) {
    try {
      const buf = fs.readFileSync(pbPath);
      const str = buf.toString("utf-8");
      const matches = str.match(/[A-Z][a-zA-Z0-9\s,-]{6,50}/g);
      if (matches && matches.length > 0) {
        const title = matches[0].trim();
        sessionTitleCache.set(id, title);
        return title;
      }
    } catch {}
  }

  // 3. Fallback: check first user prompt in transcript
  const tPath = path.join(brainDir, id, ".system_generated", "logs", "transcript.jsonl");
  if (fs.existsSync(tPath)) {
    try {
      const lines = fs.readFileSync(tPath, "utf-8").trim().split("\n");
      for (const l of lines) {
        const s = JSON.parse(l);
        if (s.type === "USER_INPUT" && s.content) {
          const m = s.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
          const p = (m ? m[1] : s.content).trim().split("\n")[0].slice(0, 35).trim();
          if (p) {
            sessionTitleCache.set(id, p);
            return p;
          }
        }
      }
    } catch {}
  }

  const fallback = `HiveMesh Session #${id.slice(0, 8)}`;
  sessionTitleCache.set(id, fallback);
  return fallback;
}

export interface BrainOperation {
  id: string;
  tool: string;
  summary: string;
  label: string;
  args?: Record<string, any>;
  output?: string;
  time?: string;
  stepIndex: number;
}

export interface SubagentExecutionStep {
  tool: string;
  summary: string;
  label: string;
  time?: string;
}

export interface BrainSubagent {
  id?: string;
  role: string;
  type: string;
  prompt: string;
  mission: string;
  action: string;
  status: string;
  isRunning: boolean;
  files: string[];
  steps: SubagentExecutionStep[];
}

export interface BrainState {
  activeId: string;
  activeTitle: string;
  allConvs: BrainConversation[];
  prompt: string;
  recentOps: BrainOperation[];
  subagents: BrainSubagent[];
  activeTasks: Array<{ taskId: string; updatedAt: number; status: string }>;
}

export function getAntigravityBrainState(selectedId?: string): BrainState | null {
  const brainDir = path.join(process.env.USERPROFILE || "C:\\Users\\mahmo", ".gemini", "antigravity", "brain");
  if (!fs.existsSync(brainDir)) return null;

  try {
    const convs = fs.readdirSync(brainDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "tempmediaStorage")
      .map((d) => {
        const tPath = path.join(brainDir, d.name, ".system_generated", "logs", "transcript.jsonl");
        let mtime = 0;
        if (fs.existsSync(tPath)) {
          try {
            mtime = fs.statSync(tPath).mtimeMs;
          } catch {}
        }
        return { id: d.name, mtime, tPath };
      })
      .filter((c) => c.mtime > 0 && isHiveMeshTranscript(c.id, c.tPath, c.mtime))
      .sort((a, b) => b.mtime - a.mtime);

    if (convs.length === 0) return null;

    const chosenId = selectedId || pinnedConversationId;
    const target = chosenId ? (convs.find((c) => c.id === chosenId) || convs[0]) : convs[0];
    const lines = fs.readFileSync(target.tPath, "utf-8").trim().split("\n");

    let prompt = "";
    let operations: BrainOperation[] = [];
    const subagentsMap = new Map<string, BrainSubagent>();

    const cleanArgVal = (val: any): any => {
      if (typeof val === "string") {
        let s = val.trim();
        if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
        return s;
      }
      return val;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const step = JSON.parse(line);
        if (step.type === "USER_INPUT" && step.content) {
          const m = step.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
          prompt = m ? m[1].trim() : step.content.trim();
          operations = []; // Reset operations list when a new prompt arrives so completed operations from past prompts are cleared
        }
        if (step.tool_calls && Array.isArray(step.tool_calls)) {
          // Look ahead up to 4 lines for execution output
          let output = "";
          for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
            try {
              const next = JSON.parse(lines[j]);
              if (next.content && typeof next.content === "string") {
                output = next.content;
                break;
              }
            } catch {}
          }

          step.tool_calls.forEach((tc: any, tcIdx: number) => {
            const cleanArgs: Record<string, any> = {};
            if (tc.args && typeof tc.args === "object") {
              for (const [k, v] of Object.entries(tc.args)) {
                cleanArgs[k] = cleanArgVal(v);
              }
            }

            const rawSumm = cleanArgs.toolSummary || cleanArgs.Summary || tc.name;
            const cleanSummary = String(rawSumm).replace(/^"|"$/g, "");
            let label = `Executed ${cleanSummary}`;

            if (tc.name === "read_file") {
              const base = cleanArgs.Path ? path.basename(String(cleanArgs.Path).replace(/\\/g, "/")) : "";
              label = base && base !== "read_file" ? `Read ${base}` : "Read file";
            } else if (tc.name === "edit_file") {
              const base = cleanArgs.Path ? path.basename(String(cleanArgs.Path).replace(/\\/g, "/")) : "";
              label = base && base !== "edit_file" ? `Updated ${base}` : "Updated file";
            } else if (tc.name === "write_file") {
              const base = cleanArgs.Path ? path.basename(String(cleanArgs.Path).replace(/\\/g, "/")) : "";
              label = base && base !== "write_file" ? `Created ${base}` : "Created file";
            } else if (tc.name === "manage_task") {
              const act = cleanArgs.Action || "status";
              const tId = cleanArgs.TaskId ? path.basename(String(cleanArgs.TaskId)) : "";
              if (act === "list") label = "Checked background tasks";
              else if (act === "kill") label = `Killed task ${tId}`;
              else label = tId ? `Checked task ${tId}` : "Checked task status";
            } else if (tc.name === "run_command") {
              const summ = cleanArgs.toolSummary;
              const cmd = cleanArgs.CommandLine || "";
              if (summ && summ !== "run_command") label = `Ran ${summ}`;
              else if (cmd) label = `Ran: ${String(cmd).split("\n")[0].slice(0, 50).trim()}`;
              else label = "Ran shell command";
            } else if (tc.name === "invoke_subagent") {
              const role = String(cleanArgs.Role || "Subagent").replace(/^"|"$/g, "");
              const type = String(cleanArgs.TypeName || "subagent").replace(/^"|"$/g, "");
              const rawPrompt = String(cleanArgs.Prompt || "").replace(/^"|"$/g, "");
              const mission = rawPrompt.split("\n")[0].slice(0, 100).trim() || `Execute autonomous directives for ${role}`;
              label = `Launched Subagent: ${role}`;
              subagentsMap.set(role, {
                role,
                type,
                prompt: rawPrompt,
                mission,
                action: "Operating in isolated workspace",
                status: "ACTIVE",
                isRunning: false,
                files: [],
                steps: []
              });
            } else if (tc.name === "send_message") {
              label = "Sent message to subagent";
            } else if (tc.name === "ask_question") {
              label = "Requested user input";
            }

            operations.push({
              id: `op-${step.step_index}-${tcIdx}`,
              tool: tc.name,
              summary: cleanSummary,
              label,
              args: cleanArgs,
              output: output.slice(0, 1500),
              time: step.created_at,
              stepIndex: step.step_index
            });
          });
        }
        if (step.content && typeof step.content === "string" && step.content.includes("Created the following subagent:")) {
          const m = step.content.match(/"conversationId":\s*"([^"]+)"/);
          if (m) {
            const subId = m[1];
            for (const [_, sa] of subagentsMap.entries()) {
              if (!sa.id) {
                sa.id = subId;
                break;
              }
            }
          }
        }
      } catch {}
    }

    // Direct synchronization with .system_generated/subagents directory
    const subagentsDir = path.join(brainDir, target.id, ".system_generated", "subagents");
    if (fs.existsSync(subagentsDir)) {
      try {
        const sFiles = fs.readdirSync(subagentsDir).filter((f) => f.endsWith(".json"));
        for (const sf of sFiles) {
          try {
            const raw = JSON.parse(fs.readFileSync(path.join(subagentsDir, sf), "utf-8"));
            const subId = raw.conversationId || sf.replace(".json", "");
            const role = raw.subagentDescriptor?.role || "Subagent";
            const type = raw.subagentDescriptor?.typeName || "self";
            if (!subagentsMap.has(role)) {
              subagentsMap.set(role, {
                id: subId,
                role,
                type,
                prompt: "",
                mission: `Execute autonomous directives for ${role}`,
                action: "Operating in isolated workspace",
                status: "RUNNING",
                isRunning: true,
                files: [],
                steps: []
              });
            } else {
              const sa = subagentsMap.get(role)!;
              if (!sa.id) sa.id = subId;
            }
          } catch {}
        }
      } catch {}
    }

    // Verify subagents status, outputs, and created files
    for (const [_, sa] of subagentsMap.entries()) {
      if (sa.id) {
        const subTPath = path.join(brainDir, sa.id, ".system_generated", "logs", "transcript.jsonl");
        if (fs.existsSync(subTPath)) {
          try {
            const subLines = fs.readFileSync(subTPath, "utf-8").trim().split("\n");
            const files: string[] = [];
            const subSteps: SubagentExecutionStep[] = [];

            for (const subLine of subLines) {
              try {
                const sStep = JSON.parse(subLine);
                if (sStep.tool_calls && Array.isArray(sStep.tool_calls)) {
                  for (const stc of sStep.tool_calls) {
                    const rawSumm = (stc.args && (stc.args.toolSummary || stc.args.Path || stc.args.CommandLine)) || stc.name;
                    const cleanSumm = String(rawSumm).replace(/^"|"$/g, "");
                    let label = `Executed ${cleanSumm}`;

                    if (stc.name === "write_file" || stc.name === "edit_file") {
                      const p = path.basename(cleanSumm.replace(/\\/g, "/"));
                      label = `Created/Updated ${p}`;
                      if (p && !files.includes(p)) files.push(p);
                    } else if (stc.name === "run_command") {
                      label = `Ran: ${cleanSumm}`;
                    } else if (stc.name === "send_message") {
                      label = `Reported completion back to parent agent`;
                    }

                    subSteps.push({
                      tool: stc.name,
                      summary: cleanSumm,
                      label,
                      time: sStep.created_at
                    });
                  }
                }
              } catch {}
            }

            sa.files = files;
            sa.steps = subSteps;

            if (subLines.length > 0) {
              const stat = fs.statSync(subTPath);
              const ageSec = (Date.now() - stat.mtimeMs) / 1000;
              const isRunning = (ageSec < 75);
              sa.status = isRunning ? "RUNNING" : "DONE";
              sa.isRunning = isRunning;

              if (isRunning) {
                const lastStep = subSteps.length > 0 ? subSteps[subSteps.length - 1] : null;
                sa.action = lastStep ? lastStep.label : "Active in isolated subagent workspace";
              } else {
                sa.action = files.length > 0
                  ? `Completed • Generated ${files.length} verified file(s)`
                  : "Completed task and reported to parent agent ✓";
              }
            }
          } catch {}
        }
      }
    }

    const subagents = Array.from(subagentsMap.values());

    // Only include currently active, non-terminated background tasks (no dead scripts)
    const tasksDir = path.join(brainDir, target.id, ".system_generated", "tasks");
    const activeTasks: Array<{ taskId: string; updatedAt: number; status: string }> = [];
    if (fs.existsSync(tasksDir)) {
      try {
        const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".log"));
        const now = Date.now();
        for (const tf of taskFiles) {
          const tPath = path.join(tasksDir, tf);
          const stat = fs.statSync(tPath);
          // Only tasks modified within the last 30 seconds
          if (now - stat.mtimeMs < 30000) {
            const content = fs.readFileSync(tPath, "utf-8");
            const isFinished = content.includes("Command exited") ||
                               content.includes("finished with result") ||
                               content.includes("was canceled") ||
                               content.includes("Tool execution was canceled");
            if (!isFinished) {
              const lines = content.trim().split("\n");
              const lastLine = lines.pop() || "Running background worker...";
              activeTasks.push({
                taskId: tf.replace(".log", ""),
                updatedAt: stat.mtimeMs,
                status: lastLine.slice(0, 100)
              });
            }
          }
        }
      } catch {}
    }

    return {
      activeId: target.id,
      activeTitle: getSessionTitle(target.id, brainDir),
      allConvs: convs.slice(0, 10).map((c) => ({
        id: c.id,
        mtime: c.mtime,
        title: getSessionTitle(c.id, brainDir)
      })),
      prompt,
      recentOps: operations.slice(-50),
      subagents,
      activeTasks
    };
  } catch (err) {
    return null;
  }
}

export function broadcastEvent(event: string, data: any): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
      if (typeof (client.res as any).flush === "function") {
        (client.res as any).flush();
      }
    } catch {
      // client disconnected
    }
  }
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function getGitBranch(cwd: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "main";
  }
}

function getGitCommitHash(cwd: string): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "HEAD";
  }
}

export function inferDynamicRoles(prompt: string): { roles: string[]; plan: Record<string, string> } {
  const p = prompt.toLowerCase();
  if (p.includes("dark mode") || p.includes("theme") || p.includes("css") || p.includes("style") || p.includes("color")) {
    return {
      roles: ["theme-tokens", "shell-layout", "data-views", "a11y-auditor"],
      plan: {
        "theme-tokens": "Declare and extract CSS design tokens for dark/light contrast",
        "shell-layout": "Refactor app shell, headers, and navigation bars with dynamic theme classes",
        "data-views": "Update data grids, tables, and card views with dark-mode responsive classes",
        "a11y-auditor": "Audit WCAG 2.1 AA color contrast and screen reader accessibility"
      }
    };
  }
  if (p.includes("auth") || p.includes("login") || p.includes("passkey") || p.includes("oauth") || p.includes("session")) {
    return {
      roles: ["auth-guards", "token-services", "ui-modals", "security-adversary"],
      plan: {
        "auth-guards": "Implement workspace tenancy auth guards and passport authentication handlers",
        "token-services": "Build token refresh, challenge generation, and session lifecycle services",
        "ui-modals": "Create Passkey/OAuth login modals and client-side credential prompts",
        "security-adversary": "Execute automated adversarial fuzzing, token replay, and race condition tests"
      }
    };
  }
  if (p.includes("database") || p.includes("migration") || p.includes("schema") || p.includes("orm") || p.includes("postgres")) {
    return {
      roles: ["schema-migrations", "entity-models", "repository-services", "integrity-tests"],
      plan: {
        "schema-migrations": "Write deterministic PostgreSQL migrations with safe rollback scripts",
        "entity-models": "Update ORM entities, relations, and type-safe schema definitions",
        "repository-services": "Implement data access repositories and query builders with indexing",
        "integrity-tests": "Run foreign key consistency, constraint validation, and migration tests"
      }
    };
  }
  if (p.includes("analytics") || p.includes("dashboard") || p.includes("chart") || p.includes("metrics") || p.includes("export")) {
    return {
      roles: ["aggregation-pipeline", "date-filter-engine", "chart-visualizer", "export-streamer"],
      plan: {
        "aggregation-pipeline": "Build time-series SQL aggregation queries and metric summarization endpoints",
        "date-filter-engine": "Implement timezone-aware date range presets and custom interval query builders",
        "chart-visualizer": "Create interactive chart components with dynamic tooltips and responsive metrics",
        "export-streamer": "Implement memory-efficient streaming CSV/Excel exporter with delimiter sanitization"
      }
    };
  }
  if (p.includes("refactor") || p.includes("clean") || p.includes("perf") || p.includes("optimize")) {
    return {
      roles: ["core-refactor", "api-consumers", "regression-tests"],
      plan: {
        "core-refactor": "Refactor core business logic functions and extract reusable primitives",
        "api-consumers": "Update downstream callers and consumers across workspace packages",
        "regression-tests": "Run end-to-end regression suites to verify backward compatibility"
      }
    };
  }
  return {
    roles: ["domain-logic", "ui-surface", "quality-adversary"],
    plan: {
      "domain-logic": `Implement core domain services and state transitions for: "${prompt}"`,
      "ui-surface": `Design and wire user interface views and responsive components for: "${prompt}"`,
      "quality-adversary": `Conduct adversarial stress testing and edge-case fuzzing for: "${prompt}"`
    }
  };
}

export function startUiServer(requestedPort = 4242, autoOpen = true): Promise<{ port: number; server: http.Server }> {
  return new Promise((resolve, reject) => {
    const projectRoot = path.resolve(__dirname, "../../");
    let dashboardPath = path.join(projectRoot, "assets", "dashboard.html");
    if (!fs.existsSync(dashboardPath)) {
      dashboardPath = path.join(__dirname, "../assets/dashboard.html");
    }

    const targetDir = process.cwd();
    const hivemeshDir = path.join(targetDir, ".hivemesh");
    if (!fs.existsSync(hivemeshDir)) {
      try { fs.mkdirSync(hivemeshDir, { recursive: true }); } catch {}
    }
    const sessionFile = path.join(hivemeshDir, "session.json");
    if (fs.existsSync(sessionFile)) {
      try {
        const sData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
        if (sData.title) currentSessionTitle = sData.title;
      } catch {}
    }
    const dbPath = path.join(hivemeshDir, "blackboard.db");
    const blackboard = new Blackboard(dbPath);

    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url || "/";

      // 1. Dashboard HTML
      if (url === "/" || url === "/index.html") {
        if (fs.existsSync(dashboardPath)) {
          const html = fs.readFileSync(dashboardPath, "utf-8");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("dashboard.html not found");
        }
        return;
      }

      // 2. Real System & Swarm Status API
      if (url === "/api/status") {
        try {
          const rawSwarms = getSwarmStatus(targetDir);
          const currentBranch = getGitBranch(targetDir);
          const commitHash = getGitCommitHash(targetDir);
          const bbEntries = blackboard.query("");
          const bbStats = blackboard.getStats();

          const swarms = rawSwarms.map((s) => ({
            ...s,
            worktrees: s.worktrees.map((wt) => {
              let description = "Autonomous Domain Slice";
              let targetPackage = "packages/twenty-crm";
              if (wt.role === "domain-logic") {
                description = "Backend Services, ORM Repositories & Business Logic";
                targetPackage = "packages/twenty-server";
              } else if (wt.role === "ui-surface") {
                description = "Frontend Views, Responsive Layouts & Components";
                targetPackage = "packages/twenty-front";
              } else if (wt.role === "quality-adversary") {
                description = "Adversarial Stress Testing, Fuzzing & Regression QA";
                targetPackage = "packages/twenty-server/**/*.spec.ts";
              }
              return {
                ...wt,
                description,
                targetPackage
              };
            })
          }));

          let totalWorktrees = 0;
          for (const s of swarms) {
            totalWorktrees += s.worktrees.length;
          }

          if (swarms.length > 0 && orchestratorPhase === "idle") {
            orchestratorPhase = "orchestrating";
          }

          let activePlan = currentSwarmPlan;
          if (Object.keys(activePlan).length === 0) {
            const planEntry = bbEntries.find((e: any) => e.topic === "architecture:plan");
            if (planEntry && planEntry.value) {
              try {
                activePlan = JSON.parse(planEntry.value);
              } catch {}
            }
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              project: {
                name: path.basename(targetDir),
                path: targetDir,
                branch: currentBranch,
                commit: commitHash,
              },
              session: {
                title: currentSessionTitle,
              },
              orchestratorPhase,
              prompt: currentSwarmPrompt || currentSessionTitle,
              swarms,
              totalWorktrees,
              isPaused: isSwarmPaused,
              plan: activePlan,
              activities: agentActivities,
              blackboard: {
                entries: bbEntries,
                stats: bbStats,
              },
              system: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
              },
              brain: getAntigravityBrainState(),
            })
          );
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 2b. Select/Pin Antigravity Conversation API
      if (url === "/api/brain/select" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          pinnedConversationId = body.id === "auto" ? null : (body.id || null);
          const updatedBrain = getAntigravityBrainState(pinnedConversationId || undefined);
          broadcastEvent("brain_switched", updatedBrain);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, brain: updatedBrain }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 2b. Session / Conversation Title API
      if (url === "/api/session/title" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          if (body.title && typeof body.title === "string") {
            currentSessionTitle = body.title.trim();
            try {
              fs.writeFileSync(
                path.join(hivemeshDir, "session.json"),
                JSON.stringify({ title: currentSessionTitle }, null, 2)
              );
            } catch {}
            blackboard.post("session:title", "conversation_topic", currentSessionTitle, "orchestrator");
            broadcastEvent("session_updated", { title: currentSessionTitle });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, title: currentSessionTitle }));
            return;
          }
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or invalid title" }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 2c. Agent Live Activity Update API
      if (url === "/api/agent/activity" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          if (body.role && body.action) {
            agentActivities[body.role] = body.action;
            broadcastEvent("agent_activity", { role: body.role, action: body.action });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, role: body.role, action: body.action }));
            return;
          }
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing role or action" }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 3. Orchestrate Swarm from Prompt
      if (url === "/api/swarm/orchestrate" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          const prompt = body.prompt;
          if (!prompt || typeof prompt !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing or invalid prompt" }));
            return;
          }

          currentSessionTitle = prompt;
          try {
            fs.writeFileSync(
              path.join(hivemeshDir, "session.json"),
              JSON.stringify({ title: currentSessionTitle }, null, 2)
            );
          } catch {}
          broadcastEvent("session_updated", { title: currentSessionTitle });

          const { roles, plan } = inferDynamicRoles(prompt);
          currentSwarmPlan = plan;
          const baseBranch = body.baseBranch || getGitBranch(targetDir);

          currentSwarmPrompt = prompt;
          orchestratorPhase = "analyzing";

          broadcastEvent("orchestrator_thinking", {
            prompt,
            roles,
            plan,
            message: `Analyzing critical path for: "${prompt}". Spawning ${roles.length} parallel agents.`
          });

          // Wait 350ms so Node.js flushes the SSE event to the browser before blocking git worktree creation begins!
          await new Promise((resolve) => setTimeout(resolve, 350));

          const swarm = createSwarm(targetDir, roles, baseBranch);
          blackboard.post("architecture:plan", "initial_decomposition", JSON.stringify(plan), "orchestrator");

          agentActivities = {};
          for (const role of roles) {
            agentActivities[role] = plan[role] ? `Active: ${plan[role]}` : "Executing domain responsibilities in worktree...";
          }

          orchestratorPhase = "orchestrating";

          broadcastEvent("swarm_created", { swarm, plan, roles, prompt, activities: agentActivities });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, swarm, plan, roles, prompt }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 4. Human-in-the-Loop Steering
      if (url === "/api/swarm/steer" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          const { swarmId, role, feedback } = body;
          if (!role || !feedback) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing role or feedback" }));
            return;
          }

          if (currentSwarmPlan[role]) {
            currentSwarmPlan[role] = feedback;
          }

          const steerEntry = blackboard.post(
            `human:steer:${role}`,
            "revised_directive",
            feedback,
            "human-commander"
          );

          broadcastEvent("agent_steered", {
            swarmId,
            role,
            feedback,
            entry: steerEntry,
            message: `Human commander steered [${role}]: "${feedback}". Orchestrator updated agent contract.`
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, message: `Steering broadcasted to ${role}`, entry: steerEntry }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 5. Pause Swarm API
      if (url === "/api/swarm/pause" && req.method === "POST") {
        isSwarmPaused = true;
        broadcastEvent("swarm_paused", {
          isPaused: true,
          message: "Swarm paused by human commander. Worktrees frozen for review."
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, isPaused: true }));
        return;
      }

      // 6. Resume Swarm API
      if (url === "/api/swarm/resume" && req.method === "POST") {
        isSwarmPaused = false;
        broadcastEvent("swarm_resumed", {
          isPaused: false,
          message: "Swarm resumed with updated directives."
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, isPaused: false }));
        return;
      }

      // 7. Destroy Swarm API
      if (url === "/api/swarm/clean" && req.method === "POST") {
        try {
          const body = await parseBody(req);
          const swarmId = body.swarmId;
          if (!swarmId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing swarmId" }));
            return;
          }

          const result = destroySwarm(swarmId);
          currentSwarmPlan = {};
          currentSwarmPrompt = "";
          orchestratorPhase = "idle";
          agentActivities = {};
          broadcastEvent("swarm_cleaned", { swarmId, result });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 8. Server-Sent Events (SSE) Live Feed
      if (url === "/events" || url === "/api/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }

        const id = ++clientIdCounter;
        clients.push({ id, res });

        const swarms = getSwarmStatus(targetDir);
        res.write(
          `event: connected\ndata: ${JSON.stringify({
            message: "Connected to HiveMesh Live Core",
            project: path.basename(targetDir),
            swarms,
            isPaused: isSwarmPaused,
            plan: currentSwarmPlan
          })}\n\n`
        );

        req.on("close", () => {
          clients = clients.filter((c) => c.id !== id);
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.log(`Port ${requestedPort} in use, trying ${requestedPort + 1}...`);
        startUiServer(requestedPort + 1, autoOpen).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    server.listen(requestedPort, () => {
      const actualPort = (server.address() as any).port;
      const url = `http://localhost:${actualPort}`;
      console.log(`\n  \x1b[36m🚀 HiveMesh Mission Control Live UI\x1b[0m`);
      console.log(`  Local URL: \x1b[32m${url}\x1b[0m\n`);

      if (autoOpen) {
        const cmd =
          process.platform === "win32"
            ? `start ${url}`
            : process.platform === "darwin"
            ? `open ${url}`
            : `xdg-open ${url}`;
        exec(cmd, () => {});
      }

      resolve({ port: actualPort, server });
    });
  });
}
