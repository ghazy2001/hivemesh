/**
 * HiveMesh Live UI Server
 * Lightweight zero-dependency HTTP server with Server-Sent Events (SSE)
 * providing 100% real data from Git, Worktrees, AST Watcher, and SQLite Blackboard.
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
let clients = [];
let clientIdCounter = 0;
export function broadcastEvent(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        try {
            client.res.write(payload);
        }
        catch {
            // client disconnected
        }
    }
}
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            }
            catch (e) {
                resolve({});
            }
        });
        req.on("error", reject);
    });
}
function getGitBranch(cwd) {
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
    }
    catch {
        return "main";
    }
}
function getGitCommitHash(cwd) {
    try {
        return execSync("git rev-parse --short HEAD", { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
    }
    catch {
        return "HEAD";
    }
}
export function startUiServer(requestedPort = 4242, autoOpen = true) {
    return new Promise((resolve, reject) => {
        const projectRoot = path.resolve(__dirname, "../../");
        let dashboardPath = path.join(projectRoot, "assets", "dashboard.html");
        if (!fs.existsSync(dashboardPath)) {
            dashboardPath = path.join(__dirname, "../assets/dashboard.html");
        }
        const targetDir = process.cwd();
        const hivemeshDir = path.join(targetDir, ".hivemesh");
        if (!fs.existsSync(hivemeshDir)) {
            try {
                fs.mkdirSync(hivemeshDir, { recursive: true });
            }
            catch { }
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
                }
                else {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("dashboard.html not found");
                }
                return;
            }
            // 2. Real System & Swarm Status API
            if (url === "/api/status") {
                try {
                    const swarms = getSwarmStatus(targetDir);
                    const currentBranch = getGitBranch(targetDir);
                    const commitHash = getGitCommitHash(targetDir);
                    const bbEntries = blackboard.query("");
                    const bbStats = blackboard.getStats();
                    // Calculate total isolated worktrees
                    let totalWorktrees = 0;
                    for (const s of swarms) {
                        totalWorktrees += s.worktrees.length;
                    }
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        project: {
                            name: path.basename(targetDir),
                            path: targetDir,
                            branch: currentBranch,
                            commit: commitHash,
                        },
                        swarms,
                        totalWorktrees,
                        blackboard: {
                            entries: bbEntries,
                            stats: bbStats,
                        },
                        system: {
                            nodeVersion: process.version,
                            platform: process.platform,
                            uptime: process.uptime(),
                        },
                    }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 3. Create Real Swarm API
            if (url === "/api/swarm/create" && req.method === "POST") {
                try {
                    const body = await parseBody(req);
                    const roles = body.roles && Array.isArray(body.roles) && body.roles.length > 0
                        ? body.roles
                        : ["domain-logic", "ui-surface", "security-adversary"];
                    const baseBranch = body.baseBranch || getGitBranch(targetDir);
                    const swarm = createSwarm(targetDir, roles, baseBranch);
                    broadcastEvent("swarm_created", { swarm });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, swarm }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 4. Destroy Real Swarm API
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
                    broadcastEvent("swarm_cleaned", { swarmId, result });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, result }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 5. Post to Real Blackboard API
            if (url === "/api/blackboard/post" && req.method === "POST") {
                try {
                    const body = await parseBody(req);
                    const { topic, key, value, agentId = "human-operator" } = body;
                    if (!topic || !key || !value) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Missing topic, key, or value" }));
                        return;
                    }
                    const entry = blackboard.post(topic, key, value, agentId);
                    broadcastEvent("blackboard_posted", { entry });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, entry }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 6. Run Real AST Audit API
            if (url === "/api/ast/check" && req.method === "POST") {
                try {
                    const swarms = getSwarmStatus(targetDir);
                    const reports = [];
                    for (const s of swarms) {
                        for (const wt of s.worktrees) {
                            if (fs.existsSync(wt.path)) {
                                try {
                                    const rep = checkASTChanges(targetDir, wt.path, wt.role);
                                    reports.push(rep);
                                }
                                catch {
                                    // non-ts project or no changes
                                }
                            }
                        }
                    }
                    broadcastEvent("ast_checked", { reports });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, reports }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 7. Server-Sent Events (SSE) Live Feed
            if (url === "/events" || url === "/api/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                });
                const id = ++clientIdCounter;
                clients.push({ id, res });
                const swarms = getSwarmStatus(targetDir);
                res.write(`event: connected\ndata: ${JSON.stringify({
                    message: "Connected to HiveMesh Live Engine",
                    project: path.basename(targetDir),
                    swarms,
                })}\n\n`);
                req.on("close", () => {
                    clients = clients.filter((c) => c.id !== id);
                });
                return;
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        });
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                console.log(`Port ${requestedPort} in use, trying ${requestedPort + 1}...`);
                startUiServer(requestedPort + 1, autoOpen).then(resolve).catch(reject);
            }
            else {
                reject(err);
            }
        });
        server.listen(requestedPort, () => {
            const actualPort = server.address().port;
            const url = `http://localhost:${actualPort}`;
            console.log(`\n  \x1b[36m🚀 HiveMesh Mission Control Live UI\x1b[0m`);
            console.log(`  Local URL: \x1b[32m${url}\x1b[0m\n`);
            if (autoOpen) {
                const cmd = process.platform === "win32"
                    ? `start ${url}`
                    : process.platform === "darwin"
                        ? `open ${url}`
                        : `xdg-open ${url}`;
                exec(cmd, () => { });
            }
            resolve({ port: actualPort, server });
        });
    });
}
//# sourceMappingURL=ui-server.js.map