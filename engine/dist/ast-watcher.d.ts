/**
 * HiveMesh Semantic AST Watcher
 * Powered by TypeScript Compiler API for deep AST graph analysis.
 * Catches breaking signature changes, removed types, and cross-worktree reference breaks.
 */
export interface ParameterInfo {
    name: string;
    type?: string;
    optional: boolean;
}
export interface DetailedSignature {
    name: string;
    kind: "function" | "interface" | "type" | "class" | "enum" | "variable";
    rawText: string;
    parameters?: ParameterInfo[];
    returnType?: string;
    exported: boolean;
    docComment?: string;
}
export interface SignatureDiff {
    file: string;
    name: string;
    kind: DetailedSignature["kind"];
    changeType: "added" | "modified" | "removed";
    oldSignature?: DetailedSignature;
    newSignature?: DetailedSignature;
    isBreaking: boolean;
    reason?: string;
}
export interface ASTReport {
    worktreePath: string;
    role: string;
    changes: SignatureDiff[];
    referencedSymbols: string[];
    timestamp: number;
}
export interface SemanticConflict {
    severity: "critical" | "warning";
    symbolName: string;
    changedByRole: string;
    changedFile: string;
    affectedRole: string;
    affectedFile: string;
    description: string;
}
/**
 * Extracts all exported and top-level code declarations using TypeScript AST.
 */
export declare function parseSourceFileSignatures(filePath: string, sourceCode: string): Map<string, DetailedSignature>;
/**
 * Extracts symbols imported or referenced in a source file.
 */
export declare function extractImportedAndCalledSymbols(filePath: string, sourceCode: string): string[];
export declare function checkASTChanges(projectPath: string, worktreePath: string, role: string): ASTReport;
/**
 * Cross-analyzes all worktree reports to identify real semantic collision risks.
 */
export declare function detectSemanticConflicts(reports: ASTReport[]): SemanticConflict[];
//# sourceMappingURL=ast-watcher.d.ts.map