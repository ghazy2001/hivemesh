/**
 * HiveMesh Live UI Server
 * Lightweight zero-dependency HTTP server with Server-Sent Events (SSE)
 * for real-time mission control, swarm monitoring, and visual topology.
 */
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { getSwarmStatus, destroySwarm } from "./worktree-manager.js";
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
export function startUiServer(requestedPort = 4242, autoOpen = true) {
    return new Promise((resolve, reject) => {
        // Locate assets/dashboard.html
        const projectRoot = path.resolve(__dirname, "../../");
        let dashboardPath = path.join(projectRoot, "assets", "dashboard.html");
        if (!fs.existsSync(dashboardPath)) {
            // Fallback relative to engine
            dashboardPath = path.join(__dirname, "../assets/dashboard.html");
        }
        const server = http.createServer((req, res) => {
            // CORS headers
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
                    res.end("dashboard.html not found at " + dashboardPath);
                }
                return;
            }
            // 2. Swarm Status API
            if (url === "/api/swarms") {
                try {
                    const swarms = getSwarmStatus(process.cwd());
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, swarms }));
                }
                catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
                return;
            }
            // 3. Server-Sent Events (SSE) Live Feed
            if (url === "/events" || url === "/api/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                });
                const id = ++clientIdCounter;
                clients.push({ id, res });
                // Initial sync
                const swarms = getSwarmStatus(process.cwd());
                res.write(`event: connected\ndata: ${JSON.stringify({ message: "Connected to HiveMesh Live UI", swarms })}\n\n`);
                req.on("close", () => {
                    clients = clients.filter((c) => c.id !== id);
                });
                return;
            }
            // 4. Clean Swarm API
            if (url.startsWith("/api/clean/")) {
                const swarmId = url.replace("/api/clean/", "");
                try {
                    const result = destroySwarm(swarmId);
                    broadcastEvent("swarm_cleaned", { swarmId, result });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, result }));
                }
                catch (e) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(e) }));
                }
                return;
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        });
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                // Try next port
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
                const cmd = process.platform === "win32" ? `start ${url}` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
                exec(cmd, () => { });
            }
            resolve({ port: actualPort, server });
        });
    });
}
//# sourceMappingURL=ui-server.js.map