/**
 * HiveMesh AST Watcher — Detects function/type/interface signature changes
 * across worktrees to catch semantic conflicts that Git cannot detect.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface SignatureChange {
  file: string;
  type: "function" | "interface" | "type" | "class" | "export";
  name: string;
  oldSignature?: string;
  newSignature?: string;
  changeType: "added" | "modified" | "removed";
}

export interface ASTReport {
  worktreePath: string;
  role: string;
  changes: SignatureChange[];
  timestamp: number;
}

// Regex patterns for detecting key code signatures
const PATTERNS: Record<string, RegExp> = {
  function:
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)(?:\s*:\s*[^\n{]+)?/g,
  arrowFunction:
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^\n=>]+)?\s*=>/g,
  interface:
    /(?:export\s+)?interface\s+(\w+)\s*(?:<[^>]*>)?\s*(?:extends\s+[^\n{]+)?\s*\{[^}]*\}/gs,
  type: /(?:export\s+)?type\s+(\w+)\s*(?:<[^>]*>)?\s*=\s*[^\n;]+/g,
  classDecl:
    /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)\s*(?:<[^>]*>)?\s*(?:extends\s+\w+\s*(?:<[^>]*>)?)?\s*(?:implements\s+[^\n{]+)?\s*\{/g,
};

function extractSignatures(content: string): Map<string, string> {
  const signatures = new Map<string, string>();

  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (name) {
        const fullMatch = match[0].trim();
        signatures.set(`${type}:${name}`, fullMatch);
      }
    }
  }

  return signatures;
}

function getChangedFiles(worktreePath: string): string[] {
  try {
    // Try to find the merge base with common branch names
    let baseSha = "";
    for (const base of ["main", "master", "develop"]) {
      try {
        baseSha = execSync(`git merge-base HEAD ${base}`, {
          cwd: worktreePath,
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
        break;
      } catch {
        continue;
      }
    }

    if (!baseSha) {
      // Fallback: compare with first parent
      try {
        baseSha = execSync("git rev-parse HEAD~1", {
          cwd: worktreePath,
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
      } catch {
        return [];
      }
    }

    const output = execSync(`git diff --name-only ${baseSha} HEAD`, {
      cwd: worktreePath,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (!output) return [];

    return output
      .split("\n")
      .filter((f) => /\.(ts|tsx|js|jsx|py|rb|go|rs|java)$/.test(f));
  } catch {
    return [];
  }
}

export function checkASTChanges(
  projectPath: string,
  worktreePath: string,
  role: string
): ASTReport {
  const changes: SignatureChange[] = [];
  const files = getChangedFiles(worktreePath);

  for (const file of files) {
    try {
      let baseSha = "";
      for (const base of ["main", "master", "develop"]) {
        try {
          baseSha = execSync(`git merge-base HEAD ${base}`, {
            cwd: worktreePath,
            encoding: "utf-8",
            stdio: "pipe",
          }).trim();
          break;
        } catch {
          continue;
        }
      }

      if (!baseSha) continue;

      // Get old content
      let oldContent = "";
      try {
        oldContent = execSync(`git show ${baseSha}:${file}`, {
          cwd: worktreePath,
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch {
        // New file
      }

      // Get new content
      const newFilePath = path.join(worktreePath, file);
      if (!fs.existsSync(newFilePath)) {
        // Deleted file — all signatures removed
        const oldSigs = extractSignatures(oldContent);
        for (const [key, sig] of oldSigs) {
          const [type, name] = key.split(":");
          changes.push({
            file,
            type: type as SignatureChange["type"],
            name,
            oldSignature: sig,
            changeType: "removed",
          });
        }
        continue;
      }

      const newContent = fs.readFileSync(newFilePath, "utf-8");
      const oldSigs = extractSignatures(oldContent);
      const newSigs = extractSignatures(newContent);

      // Find modifications and removals
      for (const [key, oldSig] of oldSigs) {
        const newSig = newSigs.get(key);
        const [type, name] = key.split(":");
        if (!newSig) {
          changes.push({
            file,
            type: type as SignatureChange["type"],
            name,
            oldSignature: oldSig,
            changeType: "removed",
          });
        } else if (newSig !== oldSig) {
          changes.push({
            file,
            type: type as SignatureChange["type"],
            name,
            oldSignature: oldSig,
            newSignature: newSig,
            changeType: "modified",
          });
        }
      }

      // Find additions
      for (const [key, newSig] of newSigs) {
        if (!oldSigs.has(key)) {
          const [type, name] = key.split(":");
          changes.push({
            file,
            type: type as SignatureChange["type"],
            name,
            newSignature: newSig,
            changeType: "added",
          });
        }
      }
    } catch {
      // Skip files that can't be processed
    }
  }

  return { worktreePath, role, changes, timestamp: Date.now() };
}
