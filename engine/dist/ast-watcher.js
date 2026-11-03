/**
 * HiveMesh Semantic AST Watcher
 * Powered by TypeScript Compiler API for deep AST graph analysis.
 * Catches breaking signature changes, removed types, and cross-worktree reference breaks.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import ts from "typescript";
/**
 * Extracts all exported and top-level code declarations using TypeScript AST.
 */
export function parseSourceFileSignatures(filePath, sourceCode) {
    const signatures = new Map();
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS);
    function isExported(node) {
        return ((ts.getCombinedModifierFlags(node) &
            ts.ModifierFlags.Export) !==
            0);
    }
    function visit(node) {
        // 1. Function Declarations
        if (ts.isFunctionDeclaration(node) && node.name) {
            const name = node.name.text;
            const params = node.parameters.map((p) => ({
                name: p.name.getText(sourceFile),
                type: p.type?.getText(sourceFile),
                optional: Boolean(p.questionToken || p.initializer),
            }));
            const returnType = node.type?.getText(sourceFile);
            signatures.set(`function:${name}`, {
                name,
                kind: "function",
                rawText: node.getText(sourceFile).split("{")[0].trim(),
                parameters: params,
                returnType,
                exported: isExported(node),
            });
        }
        // 2. Variable Statement (Arrow functions / const exports)
        else if (ts.isVariableStatement(node)) {
            const exported = isExported(node);
            for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name)) {
                    const name = decl.name.text;
                    if (decl.initializer &&
                        (ts.isArrowFunction(decl.initializer) ||
                            ts.isFunctionExpression(decl.initializer))) {
                        const fn = decl.initializer;
                        const params = fn.parameters.map((p) => ({
                            name: p.name.getText(sourceFile),
                            type: p.type?.getText(sourceFile),
                            optional: Boolean(p.questionToken || p.initializer),
                        }));
                        const returnType = fn.type?.getText(sourceFile);
                        signatures.set(`function:${name}`, {
                            name,
                            kind: "function",
                            rawText: `${exported ? "export " : ""}const ${name} = (${params
                                .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type || "any"}`)
                                .join(", ")}) => ${returnType || "void"}`,
                            parameters: params,
                            returnType,
                            exported,
                        });
                    }
                }
            }
        }
        // 3. Interface Declarations
        else if (ts.isInterfaceDeclaration(node)) {
            const name = node.name.text;
            signatures.set(`interface:${name}`, {
                name,
                kind: "interface",
                rawText: node.getText(sourceFile).trim(),
                exported: isExported(node),
            });
        }
        // 4. Type Alias Declarations
        else if (ts.isTypeAliasDeclaration(node)) {
            const name = node.name.text;
            signatures.set(`type:${name}`, {
                name,
                kind: "type",
                rawText: node.getText(sourceFile).trim(),
                exported: isExported(node),
            });
        }
        // 5. Class Declarations
        else if (ts.isClassDeclaration(node) && node.name) {
            const name = node.name.text;
            signatures.set(`class:${name}`, {
                name,
                kind: "class",
                rawText: `class ${name}`,
                exported: isExported(node),
            });
        }
        // 6. Enum Declarations
        else if (ts.isEnumDeclaration(node)) {
            const name = node.name.text;
            signatures.set(`enum:${name}`, {
                name,
                kind: "enum",
                rawText: node.getText(sourceFile).trim(),
                exported: isExported(node),
            });
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return signatures;
}
/**
 * Extracts symbols imported or referenced in a source file.
 */
export function extractImportedAndCalledSymbols(filePath, sourceCode) {
    const symbols = new Set();
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
    function visit(node) {
        if (ts.isImportDeclaration(node) && node.importClause) {
            // Named imports: import { a, b as c } from '...'
            if (node.importClause.namedBindings &&
                ts.isNamedImports(node.importClause.namedBindings)) {
                for (const spec of node.importClause.namedBindings.elements) {
                    symbols.add(spec.propertyName?.text || spec.name.text);
                }
            }
            // Default import: import a from '...'
            if (node.importClause.name) {
                symbols.add(node.importClause.name.text);
            }
        }
        else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
            symbols.add(node.expression.text);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return Array.from(symbols);
}
function getWorktreeChangedFiles(worktreePath) {
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
            }
            catch {
                continue;
            }
        }
        if (!baseSha) {
            try {
                baseSha = execSync("git rev-parse HEAD~1", {
                    cwd: worktreePath,
                    encoding: "utf-8",
                    stdio: "pipe",
                }).trim();
            }
            catch {
                return [];
            }
        }
        const output = execSync(`git diff --name-only ${baseSha} HEAD`, {
            cwd: worktreePath,
            encoding: "utf-8",
            stdio: "pipe",
        }).trim();
        if (!output)
            return [];
        return output
            .split("\n")
            .map((s) => s.trim())
            .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
    }
    catch {
        return [];
    }
}
/**
 * Compares two signatures to determine if the change introduces a breaking API contract.
 */
function isBreakingChange(oldSig, newSig) {
    if (oldSig.kind !== newSig.kind) {
        return {
            breaking: true,
            reason: `Kind changed from ${oldSig.kind} to ${newSig.kind}`,
        };
    }
    if (oldSig.kind === "function" && newSig.kind === "function") {
        // Check if new required parameters were added
        const oldParams = oldSig.parameters || [];
        const newParams = newSig.parameters || [];
        for (let i = 0; i < newParams.length; i++) {
            const np = newParams[i];
            const op = oldParams[i];
            if (!op && !np.optional) {
                return {
                    breaking: true,
                    reason: `Added new required parameter '${np.name}'`,
                };
            }
            if (op && op.type !== np.type) {
                return {
                    breaking: true,
                    reason: `Parameter '${np.name}' type changed from '${op.type}' to '${np.type}'`,
                };
            }
        }
        if (oldSig.returnType && newSig.returnType && oldSig.returnType !== newSig.returnType) {
            return {
                breaking: true,
                reason: `Return type changed from '${oldSig.returnType}' to '${newSig.returnType}'`,
            };
        }
    }
    if (oldSig.rawText !== newSig.rawText) {
        return { breaking: true, reason: "Definition modified" };
    }
    return { breaking: false };
}
export function checkASTChanges(projectPath, worktreePath, role) {
    const changes = [];
    const referencedSymbols = new Set();
    const files = getWorktreeChangedFiles(worktreePath);
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
                }
                catch {
                    continue;
                }
            }
            if (!baseSha)
                continue;
            let oldContent = "";
            try {
                oldContent = execSync(`git show ${baseSha}:${file}`, {
                    cwd: worktreePath,
                    encoding: "utf-8",
                    stdio: "pipe",
                });
            }
            catch {
                // New file
            }
            const newFilePath = path.join(worktreePath, file);
            const fileExists = fs.existsSync(newFilePath);
            const newContent = fileExists ? fs.readFileSync(newFilePath, "utf-8") : "";
            if (fileExists && newContent) {
                const refs = extractImportedAndCalledSymbols(newFilePath, newContent);
                refs.forEach((r) => referencedSymbols.add(r));
            }
            const oldSigs = oldContent
                ? parseSourceFileSignatures(file, oldContent)
                : new Map();
            const newSigs = newContent
                ? parseSourceFileSignatures(file, newContent)
                : new Map();
            // Removed or modified
            for (const [key, oldSig] of oldSigs) {
                const newSig = newSigs.get(key);
                if (!newSig) {
                    changes.push({
                        file,
                        name: oldSig.name,
                        kind: oldSig.kind,
                        changeType: "removed",
                        oldSignature: oldSig,
                        isBreaking: true,
                        reason: `Exported ${oldSig.kind} was removed`,
                    });
                }
                else if (oldSig.rawText !== newSig.rawText) {
                    const check = isBreakingChange(oldSig, newSig);
                    changes.push({
                        file,
                        name: newSig.name,
                        kind: newSig.kind,
                        changeType: "modified",
                        oldSignature: oldSig,
                        newSignature: newSig,
                        isBreaking: check.breaking,
                        reason: check.reason,
                    });
                }
            }
            // Added
            for (const [key, newSig] of newSigs) {
                if (!oldSigs.has(key)) {
                    changes.push({
                        file,
                        name: newSig.name,
                        kind: newSig.kind,
                        changeType: "added",
                        newSignature: newSig,
                        isBreaking: false,
                    });
                }
            }
        }
        catch {
            // Ignore unprocessable files
        }
    }
    return {
        worktreePath,
        role,
        changes,
        referencedSymbols: Array.from(referencedSymbols),
        timestamp: Date.now(),
    };
}
/**
 * Cross-analyzes all worktree reports to identify real semantic collision risks.
 */
export function detectSemanticConflicts(reports) {
    const conflicts = [];
    for (let i = 0; i < reports.length; i++) {
        const reportA = reports[i];
        for (const change of reportA.changes) {
            if (!change.isBreaking)
                continue;
            // Check if any other agent references or calls this changed symbol
            for (let j = 0; j < reports.length; j++) {
                if (i === j)
                    continue;
                const reportB = reports[j];
                if (reportB.referencedSymbols.includes(change.name)) {
                    conflicts.push({
                        severity: "critical",
                        symbolName: change.name,
                        changedByRole: reportA.role,
                        changedFile: change.file,
                        affectedRole: reportB.role,
                        affectedFile: `Files referencing ${change.name}`,
                        description: `Agent '${reportA.role}' introduced a breaking change to ${change.kind} '${change.name}' in '${change.file}' (${change.reason}), but Agent '${reportB.role}' is referencing it!`,
                    });
                }
            }
        }
    }
    return conflicts;
}
//# sourceMappingURL=ast-watcher.js.map