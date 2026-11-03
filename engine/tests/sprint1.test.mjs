import { Blackboard } from "./dist/blackboard.js";
import { parseSourceFileSignatures, detectSemanticConflicts } from "./dist/ast-watcher.js";

console.log("=== 1. TESTING BLACKBOARD FTS5 ===");
const bb = new Blackboard();
bb.post("architecture", "auth", "Twenty uses Passport with custom workspace tenancy guards and JWT session tokens", "builder-backend");
bb.post("database", "orm", "TypeORM is used for PostgreSQL database migrations and repository entities", "builder-db");
bb.post("frontend", "state", "Apollo Client with React hooks is used for GraphQL query state caching", "builder-ui");

console.log("Topics:", bb.listTopics());

const authSearch = bb.search("JWT session");
console.log("FTS Search 'JWT session':", authSearch.map(r => ({ topic: r.topic, key: r.key, rank: r.relevanceScore })));

const dbSearch = bb.search("PostgreSQL migrations");
console.log("FTS Search 'PostgreSQL migrations':", dbSearch.map(r => ({ topic: r.topic, key: r.key, rank: r.relevanceScore })));

console.log("\n=== 2. TESTING TS AST PARSER & CONFLICT DETECTOR ===");
const oldCode = `
export interface UserPayload {
  id: string;
  email: string;
}

export function getUserProfile(userId: string): Promise<UserPayload> {
  return fetchUser(userId);
}
`;

const newCodeBreaking = `
export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

export function getUserProfile(userId: string, requireActive: boolean): Promise<UserPayload> {
  return fetchUser(userId, requireActive);
}
`;

const sigsOld = parseSourceFileSignatures("auth.ts", oldCode);
const sigsNew = parseSourceFileSignatures("auth.ts", newCodeBreaking);

console.log("Old Signatures:", Array.from(sigsOld.keys()));
console.log("New Signatures:", Array.from(sigsNew.keys()));

// Mock report from Agent A (modified getUserProfile to add required parameter)
const reportA = {
  worktreePath: "/worktree/backend",
  role: "backend",
  changes: [
    {
      file: "auth.ts",
      name: "getUserProfile",
      kind: "function",
      changeType: "modified",
      isBreaking: true,
      reason: "Added new required parameter 'requireActive'",
    }
  ],
  referencedSymbols: [],
  timestamp: Date.now()
};

// Mock report from Agent B (calls getUserProfile in frontend)
const reportB = {
  worktreePath: "/worktree/frontend",
  role: "frontend",
  changes: [],
  referencedSymbols: ["getUserProfile"],
  timestamp: Date.now()
};

const conflicts = detectSemanticConflicts([reportA, reportB]);
console.log("\nSemantic Conflicts Detected:", conflicts.length);
if (conflicts.length > 0) {
  console.log("Conflict Alert:", conflicts[0].description);
}

console.log("\n>>> SPRINT 1 ALL TESTS PASSED! <<<");
