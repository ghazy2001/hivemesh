#!/usr/bin/env node
/**
 * HiveMesh MCP Server — The central engine that exposes all HiveMesh tools
 * to Antigravity agents via the Model Context Protocol.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Blackboard } from "./blackboard.js";
import { createSwarm, getSwarmStatus, destroySwarm, } from "./worktree-manager.js";
import { checkASTChanges } from "./ast-watcher.js";
import { mesh } from "./p2p-mesh.js";
import { generateDashboard } from "./dashboard.js";
const blackboard = new Blackboard();
const server = new Server({ name: "hivemesh", version: "0.1.0" }, { capabilities: { tools: {} } });
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
        description: "Post a knowledge insight to the shared blackboard. Other agents can query this to share discoveries and avoid redundant work.",
        inputSchema: {
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "Topic category (e.g., 'architecture', 'auth', 'database')",
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
        description: "Query knowledge from the shared blackboard by topic and/or key.",
        inputSchema: {
            type: "object",
            properties: {
                topic: { type: "string", description: "Filter by topic" },
                key: { type: "string", description: "Filter by key" },
            },
        },
    },
    {
        name: "hivemesh_blackboard_list_topics",
        description: "List all topics in the shared blackboard.",
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
        description: "Check for AST-level code changes (signatures, types, interfaces) across worktrees. Detects semantic conflicts Git cannot catch.",
        inputSchema: {
            type: "object",
            properties: {
                swarmId: { type: "string", description: "The swarm ID to check" },
            },
            required: ["swarmId"],
        },
    },
    {
        name: "hivemesh_dashboard",
        description: "Generate a live Mission Control dashboard with swarm status, AST changes, contracts, and shared knowledge.",
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
                const result = blackboard.query(args.topic, args.key);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "hivemesh_blackboard_list_topics": {
                const topics = blackboard.listTopics();
                return {
                    content: [
                        { type: "text", text: JSON.stringify({ topics }, null, 2) },
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
                // Cross-reference for conflicts
                const conflicts = [];
                for (let i = 0; i < reports.length; i++) {
                    for (let j = i + 1; j < reports.length; j++) {
                        const aNames = new Set(reports[i].changes.map((c) => `${c.type}:${c.name}`));
                        for (const c of reports[j].changes) {
                            if (aNames.has(`${c.type}:${c.name}`)) {
                                conflicts.push(`⚠️ CONFLICT: ${c.type}:${c.name} modified by both ${reports[i].role} and ${reports[j].role}`);
                            }
                        }
                    }
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ reports, conflicts }, null, 2),
                        },
                    ],
                };
            }
            case "hivemesh_dashboard": {
                const swarms = getSwarmStatus(args.swarmId);
                const insights = blackboard.query();
                const contracts = mesh.getContracts();
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
                            timestamp: Date.now(),
                        };
                    }
                }));
                const markdown = generateDashboard({
                    swarms,
                    insights,
                    contracts,
                    astReports,
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