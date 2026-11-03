#!/usr/bin/env node
/**
 * HiveMesh MCP Server — v0.3.0
 * The central coordination engine exposing tools for:
 * - Parallel Git worktree management
 * - SQLite FTS5 Blackboard memory
 * - TypeScript AST semantic conflict detection
 * - Automated Adversarial Self-Play Red-Team Loops
 * - P2P agent contract negotiations
 * - Generative UI Interactive Canvas & Mission Control
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Blackboard } from "./blackboard.js";
import { createSwarm, getSwarmStatus, destroySwarm, } from "./worktree-manager.js";
import { checkASTChanges, detectSemanticConflicts } from "./ast-watcher.js";
import { mesh } from "./p2p-mesh.js";
import { generateDashboard } from "./dashboard.js";
import { selfPlay } from "./self-play.js";
import { generateCanvasHtml } from "./canvas.js";
const blackboard = new Blackboard();
const server = new Server({ name: "hivemesh", version: "0.3.0" }, { capabilities: { tools: {} } });
// ── Tool Definitions ────────────────────────────────────────────────────────
const TOOLS = [
    {
        name: "hivemesh_create_swarm",
        description: "Create a new agent swarm with isolated Git worktrees for parallel development. Each role gets its own branch and working directory.",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: {
                    type: "string",
                    description: "Absolute path to the project root (must be a git repository)",
                },
                roles: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of agent roles (e.g., ['backend', 'frontend', 'database', 'security'])",
                },
                baseBranch: {
                    type: "string",
                    description: "Base branch to create worktrees from (default: 'main')",
                },
            },
            required: ["projectPath", "roles"],
        },
    },
    {
        name: "hivemesh_swarm_status",
        description: "Get the current status of all swarms or a specific swarm, including worktree paths and agent roles.",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: {
                    type: "string",
                    description: "Optional swarm ID to filter",
                },
            },
        },
    },
    {
        name: "hivemesh_destroy_swarm",
        description: "Clean up and destroy a swarm — removes all Git worktrees and branches.",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: { type: "string", description: "The swarm ID to destroy" },
            },
            required: ["swarmId"],
        },
    },
    {
        name: "hivemesh_blackboard_post",
        description: "Post a knowledge insight to the shared SQLite blackboard. Stored in relational table and indexed in FTS5 for instant discovery reuse.",
        inputSchema: {
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "Topic category (e.g., 'architecture', 'auth', 'database', 'conventions')",
                },
                key: {
                    type: "string",
                    description: "Specific key (e.g., 'orm_library', 'auth_strategy')",
                },
                value: { type: "string", description: "The insight content" },
                agentId: {
                    type: "string",
                    description: "ID of the posting agent (e.g., 'builder-backend')",
                },
                ttl: {
                    type: "number",
                    description: "Time-to-live in seconds (0 = no expiry)",
                },
            },
            required: ["topic", "key", "value", "agentId"],
        },
    },
    {
        name: "hivemesh_blackboard_query",
        description: "Query knowledge from the shared blackboard by topic, key, or natural-language semantic full-text search (powered by SQLite FTS5 with BM25 ranking).",
        inputSchema: {
            type: "object",
            properties: {
                topic: { type: "string", description: "Optional topic filter" },
                key: { type: "string", description: "Optional exact key filter" },
                search: {
                    type: "string",
                    description: "Natural language keyword or phrase to search via FTS5 (e.g., 'how does session authentication work')",
                },
            },
        },
    },
    {
        name: "hivemesh_blackboard_list_topics",
        description: "List all topics in the shared blackboard with entry counts and system statistics.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "hivemesh_propose_contract",
        description: "Propose an API/schema/interface contract between two agents for agreement before coding.",
        inputSchema: {
            type: "object",
            properties: {
                fromAgent: { type: "string", description: "Proposing agent ID" },
                toAgent: { type: "string", description: "Target agent ID" },
                type: {
                    type: "string",
                    description: "Contract type: 'api', 'schema', 'event', 'shared-type'",
                },
                spec: {
                    type: "string",
                    description: "Contract specification (JSON, API spec, type def)",
                },
            },
            required: ["fromAgent", "toAgent", "type", "spec"],
        },
    },
    {
        name: "hivemesh_respond_contract",
        description: "Accept or reject a proposed contract.",
        inputSchema: {
            type: "object",
            properties: {
                contractId: { type: "string", description: "Contract ID" },
                status: {
                    type: "string",
                    enum: ["accepted", "rejected"],
                    description: "Decision",
                },
                response: { type: "string", description: "Optional response message" },
            },
            required: ["contractId", "status"],
        },
    },
    {
        name: "hivemesh_check_ast_changes",
        description: "Deep TypeScript AST analysis across worktrees: detects exported function/interface/type signature changes and checks if sibling agents reference them (catching semantic conflicts Git merge cannot detect).",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: { type: "string", description: "The swarm ID to check" },
            },
            required: ["swarmId"],
        },
    },
    {
        name: "hivemesh_self_play_round",
        description: "Execute an automated adversarial Red-Team round: runs attack tests against a builder agent's worktree to probe for race conditions, vulnerabilities, or edge-case failures, and returns remediation guidance.",
        inputSchema: {
            type: "object",
            properties: {
                worktreePath: {
                    type: "string",
                    description: "Absolute path to the target builder's worktree",
                },
                targetRole: {
                    type: "string",
                    description: "Role of the builder being tested (e.g., 'backend')",
                },
                adversaryRole: {
                    type: "string",
                    description: "Role of the testing adversary (e.g., 'security')",
                },
                testCommand: {
                    type: "string",
                    description: "Shell command to run the attack test (e.g., 'npm test -- auth.attack.spec.ts')",
                },
                testFilePath: {
                    type: "string",
                    description: "Optional relative path of the attack test file",
                },
            },
            required: ["worktreePath", "targetRole", "adversaryRole", "testCommand"],
        },
    },
    {
        name: "hivemesh_canvas_view",
        description: "Generate an interactive HTML/SVG Generative UI canvas visualizing the live swarm topology, active worker nodes, AST conflicts, and security metrics.",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: {
                    type: "string",
                    description: "Optional swarm ID to visualize",
                },
            },
        },
    },
    {
        name: "hivemesh_dashboard",
        description: "Generate a live Mission Control dashboard with swarm status, AST changes, semantic conflicts, contracts, and shared knowledge.",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: {
                    type: "string",
                    description: "Optional swarm ID to focus on",
                },
            },
        },
    },
];
// ── Tool Handlers ───────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
        switch (name) {
            case "hivemesh_create_swarm": {
                const result = createSwarm(args.projectPath, args.roles, args.baseBranch || "main");
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_swarm_status": {
                const result = getSwarmStatus(args.swarmId);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_destroy_swarm": {
                const result = destroySwarm(args.swarmId);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_blackboard_post": {
                const result = blackboard.post(args.topic, args.key, args.value, args.agentId, args.ttl || 0);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_blackboard_query": {
                const result = blackboard.query(args.topic, args.key, args.search);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_blackboard_list_topics": {
                const topics = blackboard.listTopics();
                const stats = blackboard.getStats();
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ topics, stats }, null, 2),
                        },
                    ],
                };
            }
            case "hivemesh_propose_contract": {
                const result = mesh.propose(args.fromAgent, args.toAgent, args.type, args.spec);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_respond_contract": {
                const result = mesh.respond(args.contractId, args.status, args.response);
                if (!result) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Contract ${args.contractId} not found`,
                            },
                        ],
                        isError: true,
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_check_ast_changes": {
                const swarms = getSwarmStatus(args.swarmId);
                if (swarms.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Swarm ${args.swarmId} not found`,
                            },
                        ],
                        isError: true,
                    };
                }
                const reports = swarms[0].worktrees
                    .filter((wt) => wt.status === "active")
                    .map((wt) => checkASTChanges(swarms[0].projectPath, wt.path, wt.role));
                const semanticConflicts = detectSemanticConflicts(reports);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                swarmId: args.swarmId,
                                totalWorktreesAnalyzed: reports.length,
                                semanticConflicts,
                                reports,
                            }, null, 2),
                        },
                    ],
                };
            }
            case "hivemesh_self_play_round": {
                const result = selfPlay.runRound(args.worktreePath, args.targetRole, args.adversaryRole, args.testCommand, args.testFilePath);
                // Auto-post findings to Blackboard for visibility
                if (result.status === "VULNERABLE") {
                    blackboard.post("vulnerabilities", `${result.targetRole}_exploit`, `Adversary '${result.adversaryRole}' breached '${result.targetRole}' in ${result.testFile}: ${result.remediationAdvice}`, args.adversaryRole);
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_canvas_view": {
                const swarms = getSwarmStatus(args.swarmId);
                const contracts = mesh.getContracts();
                const blackboardStats = blackboard.getStats();
                const selfPlayStats = selfPlay.getStats();
                const astReports = swarms.flatMap((s) => s.worktrees
                    .filter((wt) => wt.status === "active")
                    .map((wt) => {
                    try {
                        return checkASTChanges(s.projectPath, wt.path, wt.role);
                    }
                    catch {
                        return {
                            worktreePath: wt.path,
                            role: wt.role,
                            changes: [],
                            referencedSymbols: [],
                            timestamp: Date.now(),
                        };
                    }
                }));
                const semanticConflicts = detectSemanticConflicts(astReports);
                const html = generateCanvasHtml({
                    swarms,
                    semanticConflicts,
                    contracts,
                    selfPlayStats,
                    blackboardStats,
                });
                return {
                    content: [{ type: "text", text: html }],
                };
            }
            case "hivemesh_dashboard": {
                const swarms = getSwarmStatus(args.swarmId);
                const insights = blackboard.query();
                const contracts = mesh.getContracts();
                const stats = blackboard.getStats();
                const astReports = swarms.flatMap((s) => s.worktrees
                    .filter((wt) => wt.status === "active")
                    .map((wt) => {
                    try {
                        return checkASTChanges(s.projectPath, wt.path, wt.role);
                    }
                    catch {
                        return {
                            worktreePath: wt.path,
                            role: wt.role,
                            changes: [],
                            referencedSymbols: [],
                            timestamp: Date.now(),
                        };
                    }
                }));
                const semanticConflicts = detectSemanticConflicts(astReports);
                const markdown = generateDashboard({
                    swarms,
                    insights,
                    contracts,
                    astReports,
                    semanticConflicts,
                    stats,
                });
                return {
                    content: [{ type: "text", text: markdown }],
                };
            }
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
// ── Start ───────────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`HiveMesh fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=server.js.map